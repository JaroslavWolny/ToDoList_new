#!/usr/bin/env node
// Adds hosts to the Firebase project's Authorized domains list via the
// Identity Toolkit Admin API, using the FIREBASE_* service-account creds
// already present in .env.local.
//
// Usage:
//   node scripts/add-auth-domain.mjs questdo-eta.vercel.app another.example.com

import { readFileSync } from 'node:fs';
import admin from 'firebase-admin';

// Minimal .env.local loader so we don't need the dotenv dep.
const envPath = new URL('../.env.local', import.meta.url);
try {
    const text = readFileSync(envPath, 'utf8');
    for (const raw of text.split(/\r?\n/)) {
        const line = raw.trim();
        if (!line || line.startsWith('#')) continue;
        const eq = line.indexOf('=');
        if (eq === -1) continue;
        const key = line.slice(0, eq).trim();
        let value = line.slice(eq + 1).trim();
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
        }
        if (process.env[key] === undefined) process.env[key] = value;
    }
} catch {
    // .env.local missing — fall back to whatever is already in process.env.
}

const DOMAINS = process.argv.slice(2).filter(Boolean);
if (DOMAINS.length === 0) {
    console.error('Usage: node scripts/add-auth-domain.mjs <host> [<host> ...]');
    process.exit(1);
}

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKeyRaw = process.env.FIREBASE_PRIVATE_KEY;
if (!projectId || !clientEmail || !privateKeyRaw) {
    console.error('Missing FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY in env');
    process.exit(1);
}
// PEMs in .env.local sometimes lose their newlines (e.g. when copied from a
// JSON service-account file). Repair the structure so OpenSSL can parse it.
const fixPemNewlines = (raw) => {
    let pem = raw.replace(/\\n/g, '\n').trim();
    if (pem.includes('\n')) return pem;
    const match = pem.match(/-----BEGIN ([A-Z ]+)-----(.*?)-----END \1-----/);
    if (!match) return pem;
    const label = match[1];
    const body = match[2].replace(/\s+/g, '');
    const lines = body.match(/.{1,64}/g) ?? [body];
    return `-----BEGIN ${label}-----\n${lines.join('\n')}\n-----END ${label}-----\n`;
};
const privateKey = fixPemNewlines(privateKeyRaw);

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
    });
}

// firebase-admin's GoogleAuth handles the PEM repair quirks that bare
// google-auth-library does not — reuse it to fetch an access token.
const tokenResult = await admin.app().options.credential.getAccessToken();
const accessToken = tokenResult.access_token;

const base = `https://identitytoolkit.googleapis.com/admin/v2/projects/${projectId}/config`;
const authHeaders = { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' };

const getRes = await fetch(base, { headers: authHeaders });
if (!getRes.ok) {
    console.error(`GET config failed (${getRes.status}):`, await getRes.text());
    process.exit(1);
}
const current = await getRes.json();
const existing = new Set(current.authorizedDomains ?? []);
const toAdd = DOMAINS.filter((d) => !existing.has(d));
if (toAdd.length === 0) {
    console.log('All domains already authorized:', DOMAINS.join(', '));
    process.exit(0);
}
const next = [...(current.authorizedDomains ?? []), ...toAdd];
console.log('Current authorized domains:', current.authorizedDomains);
console.log('Adding:', toAdd);

const patchRes = await fetch(`${base}?updateMask=authorizedDomains`, {
    method: 'PATCH',
    headers: authHeaders,
    body: JSON.stringify({ authorizedDomains: next }),
});
if (!patchRes.ok) {
    console.error(`PATCH config failed (${patchRes.status}):`, await patchRes.text());
    process.exit(1);
}
const patched = await patchRes.json();
console.log('Updated authorized domains:', patched.authorizedDomains);
