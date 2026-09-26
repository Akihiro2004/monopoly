import React, { useEffect, useState } from 'react';
import { DoorOpen, Flag, Menu, Play, ShieldCheck, Timer, X } from 'lucide-react';
import { useGameStore } from '../../store/gameStore.js';
import { clearSession, socket } from '../../net/socket.js';
import { audioManager } from '../../sound/audioManager.js';
import { Modal } from '../common/Modal.js';

type Step = 'menu' | 'surrender' | 'leave';

// In-game menu: surrender (keep watching) or leave the table.
export const GameMenuButton: React.FC = () => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button className="icon-btn btn-game-menu" onClick={() => setOpen(true)} aria-label="Game menu" title="Game menu">
        <Menu size={19} strokeWidth={2.6} />
      </button>
      {open && <GameMenu onClose={() => setOpen(false)} />}
    </>
  );
};

const GameMenu: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const game = useGameStore((s) => s.gameState);
  const room = useGameStore((s) => s.roomState);
  const myPlayerId = useGameStore((s) => s.myPlayerId);
  const resetAll = useGameStore((s) => s.resetAll);
  const [step, setStep] = useState<Step>('menu');

  useEffect(() => {
    audioManager.playModal();
  }, []);

  const me = game?.players.find((p) => p.playerId === myPlayerId);
  const over = game?.phase === 'GAME_OVER';
  const stillIn = !!me && !me.isBankrupt && !over;
  const timer = room?.settings.turnTimeoutSec ?? 0;

  const surrender = () => {
    audioManager.playClick();
    socket.emit('game:surrender');
    onClose();
  };

  const leave = () => {
    audioManager.playClick();
    socket.emit('room:leave');
    clearSession();
    resetAll();
  };

  return (
    <Modal width={420} onClose={onClose} label="Game menu" className="game-menu">
      <div className="modal-pad">
        {step === 'menu' && (
          <>
            <div className="modal-title">
              <span className="modal-title-icon">
                <Menu size={22} />
              </span>
              <div>
                <h2 className="display">Game menu</h2>
                <p>
                  Room <b className="tnum">{room?.roomId}</b> · Turn {game?.turnNumber ?? 1}
                </p>
              </div>
            </div>

            <div className="menu-list">
              <button className="menu-row" onClick={onClose}>
                <span className="menu-ic green">
                  <Play size={18} />
                </span>
                <span>
                  <b>Back to the game</b>
                  <small>Keep playing</small>
                </span>
              </button>
              {stillIn && (
                <button className="menu-row" onClick={() => setStep('surrender')}>
                  <span className="menu-ic gold">
                    <Flag size={18} />
                  </span>
                  <span>
                    <b>Surrender</b>
                    <small>Give up but stay and watch</small>
                  </span>
                </button>
              )}
              <button className="menu-row danger" onClick={() => (stillIn ? setStep('leave') : leave())}>
                <span className="menu-ic red">
                  <DoorOpen size={18} />
                </span>
                <span>
                  <b>{stillIn ? 'Leave game' : 'Leave table'}</b>
                  <small>{stillIn ? 'Forfeit and go back home' : 'Go back to the home screen'}</small>
                </span>
              </button>
            </div>

            <ul className="menu-facts">
              <li>
                <ShieldCheck size={15} /> Your seat is saved. Reload or close the tab and resume from the home screen.
              </li>
              <li>
                <Timer size={15} />
                {timer > 0
                  ? ` Turn timer: ${timer}s per decision, then the game plays for you.`
                  : ' No turn timer. Offline players are auto-played after 20s.'}
              </li>
            </ul>
          </>
        )}

        {step !== 'menu' && (
          <div className="menu-confirm">
            <span className={`confirm-ic ${step === 'leave' ? 'red' : 'gold'}`}>
              {step === 'leave' ? <DoorOpen size={30} /> : <Flag size={30} />}
            </span>
            <h2 className="display">{step === 'leave' ? 'Leave this game?' : 'Surrender?'}</h2>
            <p>
              All your cities and buildings go back to the Bank
              {game?.debt && game.players[game.currentPlayerIndex]?.playerId === myPlayerId
                ? ', and your debt is paid from the sale'
                : ''}
              . {step === 'leave' ? 'You cannot rejoin this game.' : 'You can keep watching until the end.'}
            </p>
            <div className="modal-actions">
              <button className="btn btn-secondary btn-lg" onClick={() => setStep('menu')}>
                <X size={18} /> Cancel
              </button>
              <button className="btn btn-danger btn-lg btn-confirm-quit" onClick={step === 'leave' ? leave : surrender}>
                {step === 'leave' ? <DoorOpen size={18} /> : <Flag size={18} />}
                {step === 'leave' ? 'Forfeit & leave' : 'Surrender'}
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
