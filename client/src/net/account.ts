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
    let connectedAs: string | null = null;
    mod.onIdTokenChanged(auth, async (user) => {
      if (!user) {
        // Everyone plays with at least a guest account.
        mod.signInAnonymously(auth!).catch(() => fallBack());
        return;
      }
      const token = await user.getIdToken();
      useAccount.setState({
        status: 'ready',
        uid: user.uid,
        name: user.displayName,
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

/** Upgrade the guest account to Google (keeps the same uid when possible). */
export async function signInWithGoogle(): Promise<void> {
  if (!auth || !authMod) return;
  const provider = new authMod.GoogleAuthProvider();
  useAccount.setState({ busy: true });
  try {
    const current = auth.currentUser;
    if (current?.isAnonymous) {
      try {
        await authMod.linkWithPopup(current, provider);
        await current.reload();
        // Name / photo arrive with the link; force a token refresh so the
        // server sees the new provider.
        await current.getIdToken(true);
        useAccount.setState({ name: current.displayName, photo: current.photoURL, anonymous: false });
        return;
      } catch (e) {
        // This Google account already exists: switch to it.
        if ((e as { code?: string }).code !== 'auth/credential-already-in-use') throw e;
      }
    }
    await authMod.signInWithPopup(auth, provider);
  } finally {
    useAccount.setState({ busy: false });
  }
}

export async function signOutAccount(): Promise<void> {
  if (!auth || !authMod) return;
  await authMod.signOut(auth);
}
