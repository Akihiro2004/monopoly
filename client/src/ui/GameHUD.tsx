import React from 'react';
import { socket } from '../net/socket.js';
import { useGameStore } from '../store/gameStore.js';
import { BOARD_TILES } from '@monopoly/shared';
import { Dices, Check, Hammer } from 'lucide-react';
import { PlayersSidebar } from './PlayersSidebar.js';
import { DICE_PIP_CHARS } from './diceIcons.js';

export const GameHUD: React.FC = () => {
  const gameState = useGameStore((s) => s.gameState);
  const diceRoll = useGameStore((s) => s.diceRoll);
  const myPlayerId = useGameStore((s) => s.myPlayerId);

  if (!gameState) return null;

  const curPlayer = gameState.players[gameState.currentPlayerIndex];
  const isMyTurn = curPlayer.playerId === myPlayerId;
  const myPlayer = gameState.players.find((p) => p.playerId === myPlayerId);

  const d1 = diceRoll?.d1 ?? gameState.dice?.[0] ?? 1;
  const d2 = diceRoll?.d2 ?? gameState.dice?.[1] ?? 1;
  const total = d1 + d2;
  const isDoubles = d1 === d2;

  const handleRoll = () => socket.emit('game:roll');
  const handleEndTurn = () => socket.emit('game:endTurn');
  const handlePayJail = () => socket.emit('game:payJail');
  const handleUseJailCard = () => socket.emit('game:useJailCard');
  const handleBuild = (tileIndex: number) => socket.emit('game:build', { tileIndex });

  return (
    <div className="game-hud">
      {/* Top Banner */}
      <div className="hud-top-bar">
        <div className="turn-indicator">
          <span className="turn-label">TURN {gameState.turnNumber}</span>
          <span className="active-player" style={{ color: curPlayer.color }}>
            {isMyTurn ? "👉 IT'S YOUR TURN!" : `${curPlayer.name}'s turn`}
          </span>
          <span className="phase-pill">{gameState.phase}</span>
          {/* Live Dice Value Indicator with Pips */}
          <div className="hud-dice-badge">
            <span className="hud-die-pip">{DICE_PIP_CHARS[d1]}</span>
            <span className="hud-die-pip">{DICE_PIP_CHARS[d2]}</span>
            <span className="hud-dice-sum">={total}</span>
            {isDoubles && <span className="hud-doubles-tag">DOUBLES!</span>}
          </div>
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
        {isMyTurn && gameState.phase === 'ROLLING' && (
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

        {isMyTurn && gameState.phase === 'TURN_ENDED' && (
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
                  {p.forceBought && <span className="chip-tag" title="Landmark locked">🔒</span>}
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
                      🏰
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

