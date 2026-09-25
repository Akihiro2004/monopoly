import React, { useState, useEffect } from 'react';
import { socket } from '../net/socket.js';
import { useGameStore } from '../store/gameStore.js';
import { BOARD_TILES, TileGroup } from '@monopoly/shared';
import { Dices, Check, Hammer, Lock, Castle, Volume2, VolumeX, Home, Banknote } from 'lucide-react';
import { PlayersSidebar } from './PlayersSidebar.js';
import { PipDie } from './PipDie.js';
import { audioManager } from '../sound/audioManager.js';

const GROUP_COLORS: Record<TileGroup, string> = {
  brown: '#92400e',
  lightblue: '#38bdf8',
  pink: '#ec4899',
  orange: '#f97316',
  red: '#ef4444',
  yellow: '#eab308',
  green: '#22c55e',
  darkblue: '#3b82f6',
  railroad: '#a8a29e',
  utility: '#fbbf24',
  special: '#64748b'
};

export const GameHUD: React.FC = () => {
  const gameState = useGameStore((s) => s.gameState);
  const diceRoll = useGameStore((s) => s.diceRoll);
  const myPlayerId = useGameStore((s) => s.myPlayerId);
  const isWalking = useGameStore((s) => s.isWalking);

  const [muted, setMuted] = useState(audioManager.isMuted());

  useEffect(() => {
    return audioManager.subscribe(setMuted);
  }, []);

  // Play turn start alert chime when it becomes active player's turn
  useEffect(() => {
    if (!gameState) return;
    const curPlayer = gameState.players[gameState.currentPlayerIndex];
    if (curPlayer?.playerId === myPlayerId && gameState.phase === 'ROLLING') {
      audioManager.playTurnAlert();
    }
  }, [gameState?.turnNumber, gameState?.currentPlayerIndex, gameState?.phase, myPlayerId]);

  if (!gameState) return null;

  const curPlayer = gameState.players[gameState.currentPlayerIndex];
  const isMyTurn = curPlayer.playerId === myPlayerId;
  const myPlayer = gameState.players.find((p) => p.playerId === myPlayerId);

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

  const handleSell = (tileIndex: number) => {
    audioManager.playClick();
    socket.emit('game:sell', { tileIndex });
  };

  const canAct = isMyTurn && (gameState.phase === 'ROLLING' || gameState.phase === 'TURN_ENDED');
  const canSell =
    isMyTurn &&
    (gameState.phase === 'ROLLING' || gameState.phase === 'TURN_ENDED' || gameState.phase === 'DEBT');

  return (
    <div className="game-hud">
      {/* Top Banner */}
      <div className={`hud-top-bar ${isMyTurn ? 'my-turn' : ''}`}>
        <div className="turn-indicator">
          <span className="turn-label">TURN {gameState.turnNumber}</span>
          <span
            className={`active-player ${isMyTurn ? 'your-turn' : ''}`}
            style={isMyTurn ? undefined : { color: curPlayer.color }}
          >
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
            className={`btn-audio-toggle ${muted ? 'muted' : ''}`}
            title={muted ? 'Unmute Audio & BGM' : 'Mute Audio & BGM'}
            onClick={() => audioManager.toggleMute()}
          >
            {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
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
        <span className="tray-title">
          <Home size={13} />
          MY PROPERTIES
          <span className="tray-count">
            {Object.values(gameState.properties).filter((p) => p.ownerId === myPlayerId).length}
          </span>
        </span>
        <div className="tray-props">
          {Object.values(gameState.properties).filter((p) => p.ownerId === myPlayerId).length === 0 && (
            <div className="tray-empty">No properties yet — land on tiles to buy them.</div>
          )}
          {Object.values(gameState.properties)
            .filter((p) => p.ownerId === myPlayerId)
            .map((p) => {
              const tile = BOARD_TILES[p.tileIndex];
              const levelNames = ['', 'House', 'Building', 'Hotel', 'LANDMARK'];
              return (
                <div
                  key={p.tileIndex}
                  className={`prop-chip ${p.isMortgaged ? 'mortgaged' : ''}`}
                  style={{ borderLeftColor: GROUP_COLORS[tile.group] }}
                >
                  <span className="chip-name">{tile.name}</span>
                  <span className={`chip-lvl ${p.buildLevel === 0 ? 'land' : ''}`}>
                    {p.buildLevel > 0 ? levelNames[p.buildLevel] : 'Land'}
                  </span>
                  {p.isMortgaged && <span className="chip-tag mortgage-tag">MORTGAGED</span>}
                  {p.forceBought && (
                    <span className="chip-tag" title="Landmark locked">
                      <Lock size={10} />
                    </span>
                  )}
                  {canSell && !p.isMortgaged && p.buildLevel > 0 && tile.buildCost > 0 && (
                    <button
                      className="chip-btn-sell"
                      title={`Sell one level for $${Math.floor(tile.buildCost / 2)}`}
                      onClick={() => handleSell(p.tileIndex)}
                    >
                      <Banknote size={12} />
                    </button>
                  )}
                  {canAct && myPlayer && myPlayer.position === p.tileIndex && !p.isMortgaged && p.buildLevel < 3 && tile.buildCost > 0 && (
                    <button
                      className="chip-btn-build"
                      title={`Upgrade for $${tile.buildCost} (you stand here)`}
                      onClick={() => handleBuild(p.tileIndex)}
                    >
                      <Hammer size={12} />
                    </button>
                  )}
                  {canAct && myPlayer && myPlayer.position === p.tileIndex && !p.isMortgaged && p.buildLevel === 3 && !p.forceBought && (
                    <button
                      className="chip-btn-landmark"
                      title={`Build Landmark for $${tile.buildCost} (you stand here)`}
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

