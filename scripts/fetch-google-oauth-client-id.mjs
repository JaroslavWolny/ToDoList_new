#!/usr/bin/env node
// Fetches the Google OAuth Web Client ID configured for this Firebase
// project (the one auto-created when you enabled Google sign-in). We need
// it on the client to drive Google Identity Services directly via
// signInWithCredential — which avoids signInWithRedirect's cross-origin
// storage problem on iOS Safari.
//
// Usage: node scripts/fetch-google-oauth-client-id.mjs

import { readFileSync } from 'node:fs';
import admin from 'firebase-admin';

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
} catch { /* env optional */ }

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKeyRaw = process.env.FIREBASE_PRIVATE_KEY;
if (!projectId || !clientEmail || !privateKeyRaw) {
    console.error('Missing FIREBASE_* env vars');
    process.exit(1);
}
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

const tokenResult = await admin.app().options.credential.getAccessToken();
const accessToken = tokenResult.access_token;
const url = `https://identitytoolkit.googleapis.com/admin/v2/projects/${projectId}/defaultSupportedIdpConfigs/google.com`;
const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
if (!res.ok) {
    console.error(`GET defaultSupportedIdpConfigs/google.com failed (${res.status}):`, await res.text());
    process.exit(1);
}
const body = await res.json();
console.log(JSON.stringify(body, null, 2));
