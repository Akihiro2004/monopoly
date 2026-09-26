import React from 'react';
import { LogOut, UserRound } from 'lucide-react';
import { firebaseEnabled, signInWithGoogle, signOutAccount, useAccount } from '../../net/account.js';
import { useGameStore } from '../../store/gameStore.js';

// Google "G" mark (plain SVG shapes, no emoji / external image).
const GoogleMark: React.FC = () => (
  <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true">
    <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.3-.4-3.5z" />
    <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
    <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
    <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 38.2 44 33 44 24c0-1.2-.1-2.3-.4-3.5z" />
  </svg>
);

/** Who you are: guest or Google account (only when Firebase is set up). */
export const AccountChip: React.FC = () => {
  const acct = useAccount();
  const addToast = useGameStore((s) => s.addToast);
  if (!firebaseEnabled || acct.status === 'off') return null;
  if (acct.status === 'loading') return <div className="account-chip loading">Signing in…</div>;
  if (acct.status === 'error') return <div className="account-chip">Playing offline as a guest</div>;

  const google = () =>
    signInWithGoogle().catch((e: { code?: string; message?: string }) => {
      if (e?.code !== 'auth/popup-closed-by-user') addToast(e?.message || 'Sign-in failed', 'danger');
    });

  return (
    <div className="account-chip">
      {acct.photo ? (
        <img className="account-photo" src={acct.photo} alt="" referrerPolicy="no-referrer" />
      ) : (
        <span className="account-photo guest">
          <UserRound size={16} />
        </span>
      )}
      <span className="account-text">
        <b className="truncate">{acct.anonymous ? 'Guest' : acct.name || 'Signed in'}</b>
        <small>{acct.anonymous ? 'Sign in to keep your stats' : 'Stats saved to your account'}</small>
      </span>
      {acct.anonymous ? (
        <button className="btn btn-sm btn-google" onClick={google} disabled={acct.busy}>
          <GoogleMark /> {acct.busy ? 'Opening…' : 'Sign in'}
        </button>
      ) : (
        <button className="icon-btn" onClick={() => signOutAccount()} aria-label="Sign out" title="Sign out">
          <LogOut size={16} />
        </button>
      )}
    </div>
  );
};
