import { create } from 'zustand';
import { connectSocket, refreshSocketToken, setAccountUid } from './socket.js';
import { useGameStore } from '../store/gameStore.js';

/**
 * Accounts through Firebase Authentication (optional). Configure with
 * VITE_FIREBASE_API_KEY / _AUTH_DOMAIN / _PROJECT_ID / _APP_ID. Everyone gets
 * a guest (anonymous) account automatically; "Sign in with Google" upgrades
 * it in place, so stats and seats carry over and follow you to any device.
 * Without the config the game uses per-tab guest ids as before.
 */
const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string | undefined,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined,
  appId: import.meta.env.VITE_FIREBASE_APP_ID as string | undefined
};

export const firebaseEnabled = !!(config.apiKey && config.projectId);

export interface AccountState {
  status: 'off' | 'loading' | 'ready' | 'error';
  uid: string | null;
  name: string | null;
  photo: string | null;
  anonymous: boolean;
  busy: boolean;
}

export const useAccount = create<AccountState>(() => ({
  status: firebaseEnabled ? 'loading' : 'off',
  uid: null,
  name: null,
  photo: null,
  anonymous: true,
  busy: false
}));

type AuthModule = typeof import('firebase/auth');
let authMod: AuthModule | null = null;
let auth: import('firebase/auth').Auth | null = null;

export async function initAccount(): Promise<void> {
  if (!firebaseEnabled) {
    connectSocket();
    return;
  }
  try {
    const [{ initializeApp }, mod] = await Promise.all([import('firebase/app'), import('firebase/auth')]);
    authMod = mod;
    auth = mod.getAuth(initializeApp(config));
    await mod.setPersistence(auth, mod.browserLocalPersistence);

    // Finish a Google sign-in that redirected away and came back. Popups
    // are blocked outright by some browsers / in-app webviews and get
    // silently killed by Cross-Origin-Opener-Policy in others, so sign-in
    // goes through a full-page redirect instead -- it always works.
    try {
      await mod.getRedirectResult(auth);
    } catch (e) {
      const err = e as { code?: string };
      if (err.code === 'auth/credential-already-in-use') {
        // This Google account is already linked to a different uid: sign
        // into that existing account instead of the (still anonymous) one.
        const cred = mod.GoogleAuthProvider.credentialFromError(e as import('firebase/auth').AuthError);
        if (cred) await mod.signInWithCredential(auth, cred);
      } else {
        console.warn('Google sign-in redirect failed', e);
      }
    }

    let connectedAs: string | null = null;
    mod.onIdTokenChanged(auth, async (user) => {
      if (!user) {
        // Everyone plays with at least a guest account.
        mod.signInAnonymously(auth!).catch(() => fallBack());
        return;
      }
      const token = await user.getIdToken();
      // Google accounts usually have a displayName; fall back to the part of
      // the email before "@" (e.g. "legendwijaya") when it's missing.
      const name = user.displayName || (user.email ? user.email.split('@')[0] : null);
      useAccount.setState({
        status: 'ready',
        uid: user.uid,
        name,
        photo: user.photoURL,
        anonymous: user.isAnonymous
      });
      if (connectedAs === user.uid) {
        refreshSocketToken(token);
        return;
      }
      connectedAs = user.uid;
      setAccountUid(user.uid);
      useGameStore.getState().setMyPlayerId(user.uid);
      connectSocket(token);
    });
  } catch (e) {
    console.warn('Firebase sign-in unavailable, playing as a local guest', e);
    fallBack();
  }
}

// Firebase unreachable: keep the game playable with a local guest id.
function fallBack(): void {
  useAccount.setState({ status: 'error' });
  setAccountUid(null);
  connectSocket();
}

/**
 * Upgrade the guest account to Google (keeps the same uid when possible).
 * This navigates away to Google and back (see initAccount for the other
 * half of the flow) rather than opening a popup, which browsers and
 * in-app webviews increasingly block or silently kill.
 */
export async function signInWithGoogle(): Promise<void> {
  if (!auth || !authMod) return;
  const provider = new authMod.GoogleAuthProvider();
  useAccount.setState({ busy: true });
  try {
    const current = auth.currentUser;
    if (current?.isAnonymous) {
      await authMod.linkWithRedirect(current, provider);
    } else {
      await authMod.signInWithRedirect(auth, provider);
    }
    // The page navigates away now; nothing after this line runs.
  } catch (e) {
    useAccount.setState({ busy: false });
    throw e;
  }
}

export async function signOutAccount(): Promise<void> {
  if (!auth || !authMod) return;
  await authMod.signOut(auth);
}
