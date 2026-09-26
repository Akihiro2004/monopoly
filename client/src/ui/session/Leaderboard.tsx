import React, { useEffect, useState } from 'react';
import { LeaderboardEntry } from '@monopoly/shared';
import { ChevronLeft, Crown, Medal, ShieldCheck, Trophy } from 'lucide-react';
import { socket } from '../../net/socket.js';
import { useGameStore } from '../../store/gameStore.js';
import { audioManager } from '../../sound/audioManager.js';
import { Sky } from '../common/Sky.js';
import { money } from '../theme.js';

const rate = (e: LeaderboardEntry) => (e.gamesPlayed ? Math.round((e.wins / e.gamesPlayed) * 100) : 0);
const initials = (name: string) =>
  name
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || '?';

/** Opens the leaderboard page (home screen and lobby). */
export const LeaderboardButton: React.FC<{ className?: string }> = ({ className = '' }) => (
  <button
    type="button"
    className={`btn btn-gold btn-leaderboard ${className}`}
    onClick={() => {
      audioManager.playClick();
      useGameStore.getState().setLeaderboardOpen(true);
    }}
  >
    <Trophy size={18} strokeWidth={2.6} /> Leaderboard
  </button>
);

/** Full page: podium for the top 3, then everyone's wins, win rate and best score. */
export const LeaderboardPage: React.FC = () => {
  const open = useGameStore((s) => s.leaderboardOpen);
  const close = () => useGameStore.getState().setLeaderboardOpen(false);
  const myPlayerId = useGameStore((s) => s.myPlayerId);
  const [list, setList] = useState<LeaderboardEntry[] | null>(null);

  useEffect(() => {
    if (!open) return;
    setList(null);
    socket.emit('leaderboard:get', (entries) => setList(entries));
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  if (!open) return null;
  const top = (list ?? []).slice(0, 3);
  // Podium order: 2nd, 1st, 3rd.
  const podium = [top[1], top[0], top[2]].map((e, i) => ({ e, place: [2, 1, 3][i] }));

  return (
    <div className="menu-screen lb-page" role="dialog" aria-label="Leaderboard">
      <Sky />
      <header className="lobby-appbar">
        <button className="btn btn-ghost btn-sm btn-leave" onClick={close}>
          <ChevronLeft size={18} />
          <span>Back</span>
        </button>
        <h1 className="lb-page-title">
          <Trophy size={24} /> Leaderboard
        </h1>
        <span className="lobby-appbar-spacer" />
      </header>

      <div className="lb-page-body">
        {list === null ? (
          <div className="lb-card paper lb-empty-card">
            <span className="spinner" />
            <p>Loading the champions…</p>
          </div>
        ) : list.length === 0 ? (
          <div className="lb-card paper lb-empty-card">
            <Trophy size={40} />
            <h2 className="display">No champions yet</h2>
            <p>Finish a game and the winner shows up here.</p>
          </div>
        ) : (
          <>
            <div className="podium">
              {podium.map(({ e, place }) =>
                e ? (
                  <div key={e.playerId} className={`podium-spot p${place} ${e.playerId === myPlayerId ? 'me' : ''}`}>
                    <span className="podium-avatar">
                      {place === 1 && <Crown size={26} className="podium-crown" />}
                      {initials(e.name)}
                    </span>
                    <b className="truncate">{e.name}</b>
                    <small className="tnum">
                      {e.wins} win{e.wins === 1 ? '' : 's'} · {rate(e)}%
                    </small>
                    <span className="podium-block">
                      <span className="podium-num">{place}</span>
                    </span>
                  </div>
                ) : (
                  <div key={place} className={`podium-spot p${place} empty`}>
                    <span className="podium-block" />
                  </div>
                )
              )}
            </div>

            <div className="lb-card paper">
              <div className="lb-table" role="table" aria-label="All players">
                <div className="lb-tr lb-th" role="row">
                  <span role="columnheader">#</span>
                  <span role="columnheader">Player</span>
                  <span role="columnheader">Wins</span>
                  <span role="columnheader">Win rate</span>
                  <span role="columnheader">Best score</span>
                </div>
                {list.map((e, i) => (
                  <div key={e.playerId} role="row" className={`lb-tr r${i} ${e.playerId === myPlayerId ? 'me' : ''}`}>
                    <span className="lb-rank" role="cell">
                      {i === 0 ? <Crown size={15} /> : i < 3 ? <Medal size={15} /> : i + 1}
                    </span>
                    <span className="lb-player" role="cell">
                      <span className="truncate">{e.name}</span>
                      {e.account && <ShieldCheck size={14} className="lb-verified" aria-label="Signed-in player" />}
                      {e.playerId === myPlayerId && <span className="badge">You</span>}
                    </span>
                    <span className="lb-num tnum" role="cell">
                      <b>{e.wins}</b>
                      <small>/{e.gamesPlayed}</small>
                    </span>
                    <span className="lb-num tnum" role="cell">
                      <span className="lb-rate">
                        <span style={{ width: `${rate(e)}%` }} />
                      </span>
                      {rate(e)}%
                    </span>
                    <span className="lb-num tnum" role="cell">
                      {money(e.bestScore)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <p className="lb-foot">Ranked by wins. Best score = highest net worth at the end of a game.</p>
          </>
        )}
      </div>
    </div>
  );
};
