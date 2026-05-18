// One-off setup script:
//   1. Deploy firestore.rules via firebaserules API
//   2. Enable Email/Password sign-in via identitytoolkit Admin v2
//   3. Enable Google sign-in via identitytoolkit Admin v2 (auto-managed OAuth)
//
// Reads creds from .env.local. Run from project root:
//   node scripts/setupFirebase.mjs

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import admin from 'firebase-admin';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const ENV_PATH = path.join(ROOT, '.env.local');
const RULES_PATH = path.join(ROOT, 'firestore.rules');

const parseEnv = (text) => {
    const out = {};
    for (const line of text.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eq = trimmed.indexOf('=');
        if (eq < 0) continue;
        const key = trimmed.slice(0, eq).trim();
        let value = trimmed.slice(eq + 1).trim();
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
        }
        out[key] = value;
    }
    return out;
};

const env = parseEnv(fs.readFileSync(ENV_PATH, 'utf8'));
const projectId = env.FIREBASE_PROJECT_ID;
const clientEmail = env.FIREBASE_CLIENT_EMAIL;

const normalizePrivateKey = (raw) => {
    if (!raw) return raw;
    // First replace literal \n with real newlines
    let key = raw.replace(/\\n/g, '\n');
    // If the PEM is missing newlines around BEGIN/END markers, rebuild it
    const beginMarker = '-----BEGIN PRIVATE KEY-----';
    const endMarker = '-----END PRIVATE KEY-----';
    if (!key.includes('\n') && key.includes(beginMarker) && key.includes(endMarker)) {
        const start = key.indexOf(beginMarker) + beginMarker.length;
        const end = key.indexOf(endMarker);
        const body = key.slice(start, end).replace(/\s+/g, '');
        const wrapped = body.match(/.{1,64}/g)?.join('\n') ?? body;
        key = `${beginMarker}\n${wrapped}\n${endMarker}\n`;
    }
    return key;
};

const privateKey = normalizePrivateKey(env.FIREBASE_PRIVATE_KEY);

if (!projectId || !clientEmail || !privateKey) {
    console.error('Missing FIREBASE_* env vars');
    process.exit(1);
}

const app = admin.initializeApp({
    credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey,
    }),
    projectId,
});

const auth = app.options.credential;
const getAccessToken = async () => {
    const t = await auth.getAccessToken();
    return t.access_token;
};

const apiFetch = async (url, options = {}) => {
    const token = await getAccessToken();
    const headers = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...(options.headers ?? {}),
    };
    const res = await fetch(url, { ...options, headers });
    const text = await res.text();
    let parsed;
    try { parsed = text ? JSON.parse(text) : {}; } catch { parsed = { raw: text }; }
    if (!res.ok) {
        const message = parsed?.error?.message || parsed?.raw || `${res.status}`;
        throw new Error(`${options.method ?? 'GET'} ${url} failed (${res.status}): ${message}`);
    }
    return parsed;
};

// ───────── 1. Deploy Firestore rules ─────────
const deployRules = async () => {
    console.log('▸ Deploying Firestore rules...');
    const rulesText = fs.readFileSync(RULES_PATH, 'utf8');

    // Create new ruleset
    const ruleset = await apiFetch(
        `https://firebaserules.googleapis.com/v1/projects/${projectId}/rulesets`,
        {
            method: 'POST',
            body: JSON.stringify({
                source: {
                    files: [{ name: 'firestore.rules', content: rulesText }],
                },
            }),
        }
    );
    console.log('  ruleset:', ruleset.name);

    // Update the cloud.firestore release to point at this ruleset
    const releaseName = `projects/${projectId}/releases/cloud.firestore`;
    try {
        await apiFetch(
            `https://firebaserules.googleapis.com/v1/${releaseName}`,
            {
                method: 'PATCH',
                body: JSON.stringify({
                    release: {
                        name: releaseName,
                        rulesetName: ruleset.name,
                    },
                }),
            }
        );
        console.log('  ✓ Updated existing release');
    } catch (err) {
        if (String(err.message).includes('404')) {
            await apiFetch(
                `https://firebaserules.googleapis.com/v1/projects/${projectId}/releases`,
                {
                    method: 'POST',
                    body: JSON.stringify({
                        name: releaseName,
                        rulesetName: ruleset.name,
                    }),
                }
            );
            console.log('  ✓ Created new release');
        } else {
            throw err;
        }
    }
};

// ───────── 1.5 Initialize Firebase Auth / Identity Platform ─────────
const initializeIdentityPlatform = async () => {
    console.log('▸ Initializing Firebase Auth via Identity Platform initialize endpoint...');
    // Correct endpoint per docs:
    // https://cloud.google.com/identity-platform/docs/reference/rest/v2/projects.identityPlatform/initializeAuth
    const url = `https://identitytoolkit.googleapis.com/v2/projects/${projectId}/identityPlatform:initializeAuth`;
    try {
        await apiFetch(url, { method: 'POST', body: '{}' });
        console.log('  ✓ Identity Platform initialized');
    } catch (err) {
        const msg = String(err.message);
        if (msg.includes('ALREADY_EXISTS') || msg.includes('already') || msg.includes('409')) {
            console.log('  ✓ Already initialized');
        } else {
            throw err;
        }
    }
};

// ───────── 2. Enable Email/Password ─────────
const enableEmailPassword = async () => {
    console.log('▸ Enabling Email/Password sign-in...');
    const url = `https://identitytoolkit.googleapis.com/admin/v2/projects/${projectId}/config?updateMask=signIn.email.enabled,signIn.email.passwordRequired`;
    await apiFetch(url, {
        method: 'PATCH',
        body: JSON.stringify({
            signIn: {
                email: {
                    enabled: true,
                    passwordRequired: true,
                },
            },
        }),
    });
    console.log('  ✓ Email/Password enabled');
};

// ───────── 3. Enable Google sign-in ─────────
const enableGoogle = async () => {
    console.log('▸ Enabling Google sign-in...');
    const idpId = 'google.com';
    const baseUrl = `https://identitytoolkit.googleapis.com/admin/v2/projects/${projectId}/defaultSupportedIdpConfigs`;
    const body = {
        name: `projects/${projectId}/defaultSupportedIdpConfigs/${idpId}`,
        enabled: true,
    };

    // Try to create first (idempotent flow: 409 means already exists, then we PATCH)
    try {
        await apiFetch(`${baseUrl}?idpId=${idpId}`, {
            method: 'POST',
            body: JSON.stringify(body),
        });
        console.log('  ✓ Created Google IdP config');
    } catch (err) {
        const msg = String(err.message);
        if (msg.includes('409') || msg.includes('ALREADY_EXISTS') || msg.includes('CONFIGURATION_EXIST')) {
            await apiFetch(`${baseUrl}/${idpId}?updateMask=enabled`, {
                method: 'PATCH',
                body: JSON.stringify({ enabled: true }),
            });
            console.log('  ✓ Enabled existing Google IdP config');
        } else {
            throw err;
        }
    }
};

// ───────── Run all ─────────
(async () => {
    let failed = false;
    for (const [name, fn] of [
        ['rules', deployRules],
        ['identity-platform', initializeIdentityPlatform],
        ['email', enableEmailPassword],
        ['google', enableGoogle],
    ]) {
        try {
            await fn();
        } catch (err) {
            console.error(`✗ ${name} failed:`, err.message);
            failed = true;
        }
    }
    process.exit(failed ? 1 : 0);
})();
