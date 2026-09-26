import type { App } from 'firebase-admin/app';

/**
 * Optional Firebase (server side). Enabled when a service account is given:
 *   FIREBASE_SERVICE_ACCOUNT  = the service-account JSON (raw or base64)
 *   or GOOGLE_APPLICATION_CREDENTIALS = path to that JSON file.
 * Without it the game runs exactly as before (local sessions + file saves).
 */
let app: App | null | undefined;

export async function firebaseApp(): Promise<App | null> {
  if (app !== undefined) return app;
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw && !process.env.GOOGLE_APPLICATION_CREDENTIALS) return (app = null);
  const { initializeApp, cert, applicationDefault, getApps } = await import('firebase-admin/app');
  if (getApps().length) return (app = getApps()[0]);
  if (raw) {
    const json = raw.trim().startsWith('{') ? raw : Buffer.from(raw, 'base64').toString('utf8');
    const account = JSON.parse(json);
    app = initializeApp({ credential: cert(account), projectId: account.project_id });
  } else {
    app = initializeApp({ credential: applicationDefault() });
  }
  return app;
}

export interface VerifiedUser {
  uid: string;
  name?: string;
  anonymous: boolean;
}

/** Checks a Firebase ID token from the client; null if invalid / disabled. */
export async function verifyIdToken(idToken: string | undefined): Promise<VerifiedUser | null> {
  if (!idToken) return null;
  const a = await firebaseApp();
  if (!a) return null;
  try {
    const { getAuth } = await import('firebase-admin/auth');
    const decoded = await getAuth(a).verifyIdToken(idToken);
    return {
      uid: decoded.uid,
      name: typeof decoded.name === 'string' ? decoded.name : undefined,
      anonymous: decoded.firebase?.sign_in_provider === 'anonymous'
    };
  } catch {
    return null;
  }
}
