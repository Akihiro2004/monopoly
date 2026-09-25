import React, { useState, useEffect } from 'react';
import { socket } from '../net/socket.js';
import { useGameStore } from '../store/gameStore.js';
import { BOARD_TILES } from '@monopoly/shared';
import { Dices, Check, Hammer, Lock, Castle, Volume2, VolumeX } from 'lucide-react';
import { PlayersSidebar } from './PlayersSidebar.js';
import { PipDie } from './PipDie.js';
import { audioManager } from '../sound/audioManager.js';

export const GameHUD: React.FC = () => {
  const gameState = useGameStore((s) => s.gameState);
  const diceRoll = useGameStore((s) => s.diceRoll);
  const myPlayerId = useGameStore((s) => s.myPlayerId);
  const isWalking = useGameStore((s) => s.isWalking);

  const [muted, setMuted] = useState(audioManager.isMuted());

  useEffect(() => {
    return audioManager.subscribe(setMuted);
  }, []);

  if (!gameState) return null;

  const curPlayer = gameState.players[gameState.currentPlayerIndex];
  const isMyTurn = curPlayer.playerId === myPlayerId;
  const myPlayer = gameState.players.find((p) => p.playerId === myPlayerId);

  // Play turn start alert chime when it becomes active player's turn
  useEffect(() => {
    if (isMyTurn && gameState.phase === 'ROLLING') {
      audioManager.playTurnAlert();
    }
  }, [gameState.turnNumber, gameState.currentPlayerIndex]);

  const d1 = diceRoll?.d1 ?? gameState.dice?.[0] ?? 1;
  const d2 = diceRoll?.d2 ?? gameState.dice?.[1] ?? 1;
  const total = d1 + d2;
  const isDoubles = d1 === d2;

  const handleRoll = () => {
    audioManager.playClick();
    socket.emit('game:roll');
  };

  const handleEndTurn = () => {
    audioManager.playClick();
    socket.emit('game:endTurn');
  };

  const handlePayJail = () => {
    audioManager.playClick();
    socket.emit('game:payJail');
  };

  const handleUseJailCard = () => {
    audioManager.playClick();
    socket.emit('game:useJailCard');
  };

  const handleBuild = (tileIndex: number) => {
    audioManager.playClick();
    socket.emit('game:build', { tileIndex });
  };

  return (
    <div className="game-hud">
      {/* Top Banner */}
      <div className="hud-top-bar">
        <div className="turn-indicator">
          <span className="turn-label">TURN {gameState.turnNumber}</span>
          <span className="active-player" style={{ color: curPlayer.color }}>
            {isMyTurn ? "IT'S YOUR TURN!" : `${curPlayer.name}'s turn`}
          </span>
          <span className="phase-pill">{gameState.phase}</span>
          {/* Live Dice Value Indicator with Pips */}
          <div className="hud-dice-badge">
            <PipDie value={d1} />
            <PipDie value={d2} />
            <span className="hud-dice-sum">= {total}</span>
            {isDoubles && <span className="hud-doubles-tag">DOUBLES!</span>}
          </div>
          {/* Audio Mute/Unmute Toggle */}
          <button
            className="btn-audio-toggle"
            title={muted ? 'Unmute Audio & BGM' : 'Mute Audio & BGM'}
            onClick={() => audioManager.toggleMute()}
          >
            {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>
        </div>
        <div className="action-ticker">{gameState.lastActionText}</div>
      </div>

      {/* Players Sidebar */}
      <PlayersSidebar
        players={gameState.players}
        currentPlayerIndex={gameState.currentPlayerIndex}
        myPlayerId={myPlayerId}
      />

      {/* Action Controls Dock */}
      <div className="hud-controls-dock">
        {isWalking && (
          <div className="control-group">
            <div className="moving-badge">Moving...</div>
          </div>
        )}

        {!isWalking && isMyTurn && gameState.phase === 'ROLLING' && (
          <div className="control-group">
            {myPlayer?.inJail && (
              <div className="jail-actions">
                <button className="btn btn-secondary" onClick={handlePayJail} disabled={(myPlayer?.money ?? 0) < 50}>
                  Pay $50
                </button>
                {myPlayer?.jailCards > 0 && (
                  <button className="btn btn-secondary" onClick={handleUseJailCard}>
                    Use Card ({myPlayer.jailCards})
                  </button>
                )}
              </div>
            )}
            <button className="btn btn-primary btn-roll" onClick={handleRoll}>
              <Dices size={24} />
              <span>ROLL DICE</span>
            </button>
          </div>
        )}

        {!isWalking && isMyTurn && gameState.phase === 'TURN_ENDED' && (
          <div className="control-group">
            <button className="btn btn-primary btn-end-turn" onClick={handleEndTurn}>
              <Check size={20} />
              <span>END TURN</span>
            </button>
          </div>
        )}
      </div>

      {/* Properties Drawer */}
      <div className="my-properties-tray">
        <span className="tray-title">My Properties:</span>
        <div className="tray-props">
          {Object.values(gameState.properties)
            .filter((p) => p.ownerId === myPlayerId)
            .map((p) => {
              const tile = BOARD_TILES[p.tileIndex];
              const levelNames = ['', 'House', 'Building', 'Hotel', 'LANDMARK'];
              return (
                <div key={p.tileIndex} className="prop-chip">
                  <span className="chip-name">{tile.name}</span>
                  <span className="chip-lvl">{p.buildLevel > 0 ? levelNames[p.buildLevel] : 'Land'}</span>
                  {p.forceBought && (
                    <span className="chip-tag" title="Landmark locked">
                      <Lock size={10} />
                    </span>
                  )}
                  {isMyTurn && !p.isMortgaged && p.buildLevel < 3 && tile.buildCost > 0 && (
                    <button
                      className="chip-btn-build"
                      title={`Upgrade for $${tile.buildCost}`}
                      onClick={() => handleBuild(p.tileIndex)}
                    >
                      <Hammer size={12} />
                    </button>
                  )}
                  {isMyTurn && !p.isMortgaged && p.buildLevel === 3 && !p.forceBought && (
                    <button
                      className="chip-btn-landmark"
                      title={`Build Landmark for $${tile.buildCost}`}
                      onClick={() => handleBuild(p.tileIndex)}
                    >
                      <Castle size={14} />
                    </button>
                  )}
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
};

