import type { VercelRequest } from '@vercel/node';
import { getFirebaseAdminServices, admin } from './firebaseAdmin';

export type AuthedUser = {
    uid: string;
    email: string | null;
    name: string | null;
    picture: string | null;
};

export type AuthResult =
    | { ok: true; user: AuthedUser }
    | { ok: false; status: number; error: string };

const getBearerToken = (req: VercelRequest): string | null => {
    const header = req.headers.authorization ?? req.headers.Authorization;
    if (typeof header !== 'string') return null;
    const [scheme, token] = header.split(' ');
    if (scheme?.toLowerCase() !== 'bearer' || !token) return null;
    return token.trim();
};

export const verifyAuth = async (req: VercelRequest): Promise<AuthResult> => {
    const { envError } = getFirebaseAdminServices();
    if (envError) {
        return { ok: false, status: 500, error: envError };
    }

    const token = getBearerToken(req);
    if (!token) {
        return { ok: false, status: 401, error: 'Missing Authorization bearer token' };
    }

    try {
        const decoded = await admin.auth().verifyIdToken(token);
        return {
            ok: true,
            user: {
                uid: decoded.uid,
                email: decoded.email ?? null,
                name: (decoded.name as string | undefined) ?? null,
                picture: (decoded.picture as string | undefined) ?? null,
            },
        };
    } catch {
        return { ok: false, status: 401, error: 'Invalid or expired token' };
    }
};
