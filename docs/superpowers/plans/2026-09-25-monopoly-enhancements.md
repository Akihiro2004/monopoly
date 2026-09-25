# 3D Monopoly Visual & Gameplay Enhancements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement 8 visual and gameplay enhancements for the 3D Monopoly game: fix inverted tile text, remove auto-buy and add a clean title deed purchase modal with 3D buttons, show a 3D house at the edge of purchased land without changing land color, center single player tokens on tiles, animate sequential tile-by-tile player walking after dice roll finishes, add Web Audio SFX and BGM with a mute toggle, and replace the black void with a warm cozy game lounge 3D room.

**Architecture:** 
- The authoritative TypeScript engine (`shared` + `server`) transitions from immediate auto-buy to a `BUY_OFFER` phase upon landing on an unowned property, handled via `game:buyResponse`.
- The Three.js / React client (`client`) resolves board tile rotations (`0`, `-π/2`, `π`, `π/2`), fixes token coordinate centering, sequences dice roll animation before token hops, renders 3D property markers on tile edges, synthesizes zero-dependency Web Audio effects and BGM, and surrounds the wood table with an elegant 3D lounge room.
- Styling introduces a reusable 3D tactile button system and a clean, emoji-free deed card modal adhering to `npm run check:emoji`.

**Tech Stack:** React 18, Three.js, `@react-three/fiber`, `@react-three/drei`, Web Audio API, Zustand, Socket.IO, TypeScript, Vitest.

## Global Constraints
- Zero emojis anywhere in source code or UI copy (strictly validated by `npm run check:emoji`).
- YAGNI & Ponytail full mode: minimal clean diffs, standard library / Web Audio native features, no unnecessary third-party dependencies.
- Multiplayer authoritativeness: game state must remain synchronized across all connected clients.
- Existing tests and smoke tests (`npm test`, `npm run smoke`) must pass cleanly.

---

### Task 1: Update Shared Types & Socket Events

**Files:**
- Modify: `shared/src/types.ts`
- Modify: `shared/src/messages.ts`
- Test: `npm run build` in `shared`

**Interfaces:**
- Consumes: Existing `GameState`, `GamePhase`, `ClientToServerEvents`
- Produces: `BuyOffer` interface, `'BUY_OFFER'` phase in `GamePhase`, `buyOffer` property on `GameState`, `'game:buyResponse'` socket event.

- [ ] **Step 1: Update `shared/src/types.ts`**

Add `BuyOffer` and update `GamePhase` and `GameState`:

```typescript
export type GamePhase =
  | 'ROLLING'
  | 'MOVING'
  | 'RESOLVING'
  | 'BUY_OFFER'
  | 'FORCE_BUY_OFFER'
  | 'TURN_ENDED'
  | 'GAME_OVER';

export interface BuyOffer {
  tileIndex: number;
  price: number;
  buyerPlayerId: string;
}

// In GameState interface, add:
buyOffer: BuyOffer | null;
```

- [ ] **Step 2: Update `shared/src/messages.ts`**

Add client event to `ClientToServerEvents`:
```typescript
'game:buyResponse': (data: { accept: boolean }) => void;
```

- [ ] **Step 3: Build shared package**

Run: `npm --prefix shared run build`  
Expected: PASS with exit code 0.

- [ ] **Step 4: Commit**

```bash
git add shared/src/types.ts shared/src/messages.ts shared/dist
git commit -m "feat(shared): add BuyOffer and game:buyResponse protocol"
```

---

### Task 2: Refactor Server Engine to Replace Auto-Buy with Buy Offer

**Files:**
- Modify: `server/src/engine/actions.ts`
- Modify: `server/src/engine/resolve.ts`
- Modify: `server/src/engine/game.ts`
- Modify: `server/src/handlers/gameplay.ts`
- Test: `server/test/engine.test.ts`

**Interfaces:**
- Consumes: `BuyOffer`, `GameState`, `game:buyResponse`
- Produces: `GameEngine.respondToBuyOffer(accept: boolean)`, server-side handling of landing on unowned property.

- [ ] **Step 1: Write unit tests for Buy Offer flow in `server/test/engine.test.ts`**

Add tests:
- Landing on unowned property sets phase to `BUY_OFFER` and populates `buyOffer` when player has funds.
- If player cannot afford property, it remains unowned and transitions to `TURN_ENDED`.
- `respondToBuyOffer(true)` deducts money, assigns ownership, and transitions to `TURN_ENDED`.
- `respondToBuyOffer(false)` leaves property unowned and transitions to `TURN_ENDED`.

- [ ] **Step 2: Run tests to verify failure**

Run: `npm --prefix server test`  
Expected: FAIL (methods not yet implemented).

- [ ] **Step 3: Update `server/src/engine/actions.ts` and `resolve.ts`**

In `resolve.ts`, when landing on an unowned purchasable property:
```typescript
if (prop && prop.ownerId === null && tile.price > 0) {
  if (player.money >= tile.price) {
    gameState.phase = 'BUY_OFFER';
    gameState.buyOffer = {
      tileIndex,
      price: tile.price,
      buyerPlayerId: player.playerId
    };
    return { needsForceBuyChoice: false, toast: `${player.name} landed on unowned ${tile.name}.` };
  } else {
    gameState.buyOffer = null;
    const msg = `${player.name} cannot afford ${tile.name} ($${tile.price}). It remains unowned.`;
    gameState.lastActionText = msg;
    return { needsForceBuyChoice: false, toast: msg };
  }
}
```

- [ ] **Step 4: Implement `respondToBuyOffer` in `server/src/engine/game.ts`**

```typescript
public respondToBuyOffer(accept: boolean): void {
  if (this.state.phase !== 'BUY_OFFER' || !this.state.buyOffer) {
    throw new Error('No active buy offer');
  }

  const offer = this.state.buyOffer;
  const player = this.getCurrentPlayer();
  const tile = BOARD_TILES[offer.tileIndex];
  const prop = this.state.properties[offer.tileIndex];

  if (accept) {
    if (player.money < offer.price) {
      throw new Error('Insufficient funds to buy property');
    }
    player.money -= offer.price;
    prop.ownerId = player.playerId;
    prop.buildLevel = 0;
    prop.isMortgaged = false;
    prop.forceBought = false;
    this.emitToast(`${player.name} bought ${tile.name} for $${offer.price}.`, 'success');
  } else {
    this.emitToast(`${player.name} decided not to buy ${tile.name}.`, 'info');
  }

  this.state.buyOffer = null;
  this.state.phase = 'TURN_ENDED';
  this.checkAndApplyVictory();
  this.notify();
}
```

- [ ] **Step 5: Register `game:buyResponse` in `server/src/handlers/gameplay.ts`**

```typescript
socket.on('game:buyResponse', ({ accept }) => {
  const info = roomManager.getPlayerBySocket(socket.id);
  if (!info) return;
  const room = roomManager.getRoom(info.roomId);
  if (!room || !room.engine) return;

  const cur = room.engine.getCurrentPlayer();
  if (cur.playerId !== info.playerId) {
    return socket.emit('error', { message: 'Not your turn!' });
  }

  try {
    room.engine.respondToBuyOffer(accept);
  } catch (e: any) {
    socket.emit('error', { message: e.message });
  }
});
```

- [ ] **Step 6: Run tests to verify pass**

Run: `npm --prefix server test`  
Expected: PASS all tests.

- [ ] **Step 7: Commit**

```bash
git add server/src server/test
git commit -m "feat(server): replace auto-buy with buy offer flow and response handler"
```

---

### Task 3: Fix Board Tile Text Inversion & Orientation (Point 1)

**Files:**
- Modify: `client/src/three/boardCoords.ts`
- Modify: `client/src/three/Board3D.tsx`

**Interfaces:**
- Consumes: `calculateTileCoordinates()`, `BOARD_COORDINATES`
- Produces: Correct Y-rotations for all 4 edges and corners, aligned text and color bar placement.

- [ ] **Step 1: Fix edge rotations in `client/src/three/boardCoords.ts`**

Set side rotations so every side faces inward:
- Bottom side (0..9): `rotation: [0, 0, 0]`
- Left side (10..19): `rotation: [0, -Math.PI / 2, 0]`
- Top side (20..29): `rotation: [0, Math.PI, 0]`
- Right side (30..39): `rotation: [0, Math.PI / 2, 0]`
- Corner tiles: set rotation to align text legibly toward camera or angled inward at `0: π/4`, `10: -π/4`, `20: -3π/4`, `30: 3π/4`.

- [ ] **Step 2: Clean up local coordinates in `client/src/three/Board3D.tsx`**

Remove the `bandSign` workaround. Since each tile's coordinate system now matches its side orientation:
- Color band: `position={[0, coord.size[1] / 2 + 0.01, -coord.size[2] * 0.35]}` (inner edge).
- Price text: `position={[0, coord.size[1] / 2 + 0.03, coord.size[2] * 0.32]}` (outer edge).
- Tile label: centered with rotation `[-Math.PI / 2, 0, 0]`.
All text reads upright and in the correct reading order for all 4 sides.

- [ ] **Step 3: Verify client compiles**

Run: `npm --prefix client run build`  
Expected: PASS with exit code 0.

- [ ] **Step 4: Commit**

```bash
git add client/src/three/boardCoords.ts client/src/three/Board3D.tsx
git commit -m "fix(client): correct 3D board tile rotations and text orientation"
```

---

### Task 4: Fix Player Token Centering on Tiles (Point 5)

**Files:**
- Modify: `client/src/three/Tokens3D.tsx`

**Interfaces:**
- Consumes: `players: PlayerState[]`, `currentPlayerIndex: number`
- Produces: Dynamic token offsets where a single player on a tile is positioned at `[0, 0, 0]`.

- [ ] **Step 1: Calculate dynamic offsets per tile in `Tokens3D.tsx`**

Replace static `offsets[idx % offsets.length]` with tile-occupancy grouping:
```typescript
// Group players by position
const playersByTile = new Map<number, PlayerState[]>();
for (const p of players) {
  if (!playersByTile.has(p.position)) playersByTile.set(p.position, []);
  playersByTile.get(p.position)!.push(p);
}

// Compute offset based on count on the same tile:
function getTileOffset(player: PlayerState): [number, number, number] {
  const sharing = playersByTile.get(player.position) || [];
  if (sharing.length <= 1) return [0, 0, 0]; // Centered!

  const indexOnTile = sharing.findIndex((p) => p.playerId === player.playerId);
  if (sharing.length === 2) {
    return indexOnTile === 0 ? [-0.25, 0, 0] : [0.25, 0, 0];
  }
  // 3+ players: circular distribution
  const angle = (indexOnTile / sharing.length) * Math.PI * 2;
  const radius = 0.32;
  return [Math.cos(angle) * radius, 0, Math.sin(angle) * radius];
}
```

- [ ] **Step 2: Verify in build**

Run: `npm --prefix client run build`  
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add client/src/three/Tokens3D.tsx
git commit -m "fix(client): center player token when alone on tile and disperse only when sharing"
```

---

### Task 5: 3D House Preview on Land Edge for Purchased Property (Point 4)

**Files:**
- Modify: `client/src/three/Board3D.tsx`
- Modify: `client/src/three/BuildingMesh.tsx`

**Interfaces:**
- Consumes: `prop.ownerId`, `prop.buildLevel`, `ownerColor`
- Produces: 3D mini cottage/house model on tile edge without changing the board tile color.

- [ ] **Step 1: Remove full-tile colored overlay in `Board3D.tsx`**

Remove the `ownerColor` mesh that covers the whole tile:
```tsx
// DELETE this block:
{/* Owner Flag Ring on top if owned */}
{ownerColor && (
  <mesh position={[0, coord.size[1] / 2 + 0.02, 0]}>
    <boxGeometry args={[coord.size[0] * 0.85, 0.02, coord.size[2] * 0.85]} />
    <meshStandardMaterial color={ownerColor} transparent opacity={0.35} />
  </mesh>
)}
```
Keep tile mesh material pure white `#f8fafc`.

- [ ] **Step 2: Update `BuildingMesh.tsx` to handle Level 0 (Purchased Land) and edge positioning**

```tsx
interface BuildingProps {
  level: BuildLevel;
  position: [number, number, number];
  color?: string; // owner player color
}

// When level === 0 (purchased land):
// Render a miniature 3D wooden house at the tile edge near the color band
<group position={[x, y + 0.12, z - 0.42]}>
  {/* House body */}
  <mesh castShadow position={[0, 0.07, 0]}>
    <boxGeometry args={[0.26, 0.14, 0.22]} />
    <meshStandardMaterial color="#f1f5f9" roughness={0.3} />
  </mesh>
  {/* Pitched Roof in owner's color */}
  <mesh castShadow position={[0, 0.18, 0]} rotation={[0, Math.PI / 4, 0]}>
    <coneGeometry args={[0.2, 0.12, 4]} />
    <meshStandardMaterial color={color} roughness={0.4} />
  </mesh>
</group>
```

- [ ] **Step 3: Wire `ownerColor` and `prop.ownerId` in `Board3D.tsx`**

Render `<BuildingMesh level={prop.buildLevel} position={[0, coord.size[1] / 2, 0]} color={ownerColor} />` whenever `prop.ownerId !== null`.

- [ ] **Step 4: Verify build**

Run: `npm --prefix client run build`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add client/src/three/Board3D.tsx client/src/three/BuildingMesh.tsx
git commit -m "feat(client): render 3D house preview on tile edge upon purchase instead of tile tint"
```

---

### Task 6: Sequential Tile-by-Tile Hop Animation After Dice Roll (Point 6)

**Files:**
- Modify: `client/src/three/Tokens3D.tsx`
- Modify: `client/src/three/Dice3D.tsx`
- Modify: `client/src/store/gameStore.ts`

**Interfaces:**
- Consumes: `diceRoll`, `gameState.players`, `getTileCenter`
- Produces: Coordinated sequence: dice roll animation (0.9s) -> sequential tile-by-tile hops (`oldPos` -> `newPos`) -> trigger arrival state.

- [ ] **Step 1: Add animation tracking to `gameStore.ts`**

Add `isWalking: boolean`, `walkingPlayerId: string | null`, `setWalking: (val: boolean, pid?: string) => void`.

- [ ] **Step 2: Implement hop animation and step progression in `Tokens3D.tsx`**

When a player's position changes:
1. Maintain local `visualPos` starting at `oldPos`.
2. Wait 0.95s for dice roll tumble to finish.
3. Calculate step path: `[ (oldPos + 1)%40, (oldPos + 2)%40, ..., targetPos ]`.
4. Animate through each intermediate tile with ~0.16s duration per hop.
5. In each hop: apply vertical arc bounce `y += Math.sin(progress * Math.PI) * 0.35`.
6. Play audio step sound on each hop.
7. Upon reaching target: trigger landing audio sound and set `isWalking = false`.

- [ ] **Step 3: Verify build and test**

Run: `npm --prefix client run build`  
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add client/src/three/Tokens3D.tsx client/src/store/gameStore.ts
git commit -m "feat(client): animate step-by-step player movement after dice roll finishes"
```

---

### Task 7: Clean Buy Property Modal & 3D Tactile Buttons (Points 2 & 3)

**Files:**
- Create: `client/src/ui/BuyPropertyModal.tsx`
- Modify: `client/src/ui/GameHUD.tsx`
- Modify: `client/src/styles/modals.css`
- Modify: `client/src/styles/hud.css`

**Interfaces:**
- Consumes: `gameState.buyOffer`, `gameState.phase === 'BUY_OFFER'`, `isWalking === false`
- Produces: Title deed modal with clean typography, no emojis, 3D tactile buttons.

- [ ] **Step 1: Create `client/src/ui/BuyPropertyModal.tsx`**

Deed card layout:
- Colored header bar corresponding to property group.
- Title Deed name in uppercase bold typography.
- Price and Rent schedule table (Rent, House Lv 1, Building Lv 2, Hotel Lv 3, Landmark Lv 4).
- Player balance display.
- 3D tactile buttons: `BUY PROPERTY ($X)` and `PASS`.
- Emits `socket.emit('game:buyResponse', { accept: true / false })`.
- Hidden while `isWalking === true` so it only appears upon physical arrival at the tile.

- [ ] **Step 2: Add 3D Tactile Button styles to `modals.css` and `hud.css`**

Implement `.btn-3d-buy`, `.btn-3d-pass`, `.btn-3d-roll`, `.btn-3d-end`:
```css
.btn-3d {
  position: relative;
  font-weight: 800;
  text-transform: uppercase;
  border: none;
  cursor: pointer;
  transition: transform 0.1s ease, box-shadow 0.1s ease;
  user-select: none;
}

.btn-3d-buy {
  background: linear-gradient(180deg, #10b981 0%, #059669 100%);
  box-shadow: 0 6px 0 #064e3b, 0 10px 18px rgba(0, 0, 0, 0.4);
  color: #ffffff;
  border-top: 1px solid rgba(255, 255, 255, 0.3);
}

.btn-3d-buy:active:not(:disabled) {
  transform: translateY(4px);
  box-shadow: 0 2px 0 #064e3b, 0 4px 8px rgba(0, 0, 0, 0.3);
}

.btn-3d-pass {
  background: linear-gradient(180deg, #64748b 0%, #475569 100%);
  box-shadow: 0 6px 0 #334155, 0 10px 18px rgba(0, 0, 0, 0.4);
  color: #f8fafc;
}

.btn-3d-pass:active:not(:disabled) {
  transform: translateY(4px);
  box-shadow: 0 2px 0 #334155, 0 4px 8px rgba(0, 0, 0, 0.3);
}
```

- [ ] **Step 3: Mount `BuyPropertyModal` in `GameHUD.tsx`**

Render `<BuyPropertyModal />` alongside `<ForceBuyModal />`.

- [ ] **Step 4: Verify build**

Run: `npm --prefix client run build`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add client/src/ui/BuyPropertyModal.tsx client/src/ui/GameHUD.tsx client/src/styles/
git commit -m "feat(ui): add clean 3D property deed buy modal and 3D tactile button styling"
```

---

### Task 8: Web Audio API Sound Effects & Background Music (Point 7)

**Files:**
- Create: `client/src/sound/audioManager.ts`
- Modify: `client/src/ui/GameHUD.tsx`
- Modify: `client/src/three/Dice3D.tsx`
- Modify: `client/src/three/Tokens3D.tsx`

**Interfaces:**
- Consumes: Web Audio API `AudioContext`
- Produces: `audioManager.playDiceRoll()`, `audioManager.playStep()`, `audioManager.playBuy()`, `audioManager.playClick()`, `audioManager.toggleMute()`.

- [ ] **Step 1: Create `client/src/sound/audioManager.ts`**

Implement zero-dependency procedural audio:
- `playDiceRoll()`: rattle noise burst with resonant filter.
- `playStep()`: resonant wood block tap.
- `playBuy()`: bright cash register / harmonic chime.
- `playClick()`: tactile mechanical button pop.
- `playTurnAlert()`: pleasant double bell chime.
- `playBGM()` / `stopBGM()`: smooth warm Rhodes lo-fi jazz chord progression.
- Mute toggle state with `localStorage` persistence.

- [ ] **Step 2: Hook audio into game triggers**

- Dice roll start -> `playDiceRoll()`
- Token intermediate hop -> `playStep()`
- Property purchase -> `playBuy()`
- Button clicks -> `playClick()`
- Active turn start -> `playTurnAlert()`

- [ ] **Step 3: Add Audio Mute/Unmute button in HUD**

Add a sleek 3D audio icon button (Volume2 / VolumeX from `lucide-react`) in the top HUD bar.

- [ ] **Step 4: Verify build**

Run: `npm --prefix client run build`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add client/src/sound/audioManager.ts client/src/ui/GameHUD.tsx client/src/three/
git commit -m "feat(audio): add Web Audio API sound effects and background music with HUD toggle"
```

---

### Task 9: Warm Cozy Game Lounge 3D Room Environment (Point 8)

**Files:**
- Create: `client/src/three/Room3D.tsx`
- Modify: `client/src/three/Scene.tsx`
- Modify: `client/src/three/WoodTable.tsx`

**Interfaces:**
- Consumes: Three.js mesh & material primitives
- Produces: Warm 3D parlor room backdrop with wainscoting, textured wallpaper, ambient warm sconce lights, replacing the black void.

- [ ] **Step 1: Create `client/src/three/Room3D.tsx`**

Build the Warm Cozy Game Lounge:
- Back and side wall geometry surrounding the table.
- Lower wall: dark polished mahogany wainscoting panels (`#2b1810`).
- Upper wall: textured warm wallpaper with subtle damask / geometric motif (`#3d251d`).
- Floor: soft dark patterned parlor rug beneath the wood table.
- Ambient wall sconces casting gentle warm pools of light on the wallpaper.

- [ ] **Step 2: Update `Scene.tsx`**

- Mount `<Room3D />`.
- Adjust scene ambient and directional lighting to blend seamlessly with the warm cozy lounge ambiance.

- [ ] **Step 3: Verify build**

Run: `npm --prefix client run build`  
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add client/src/three/Room3D.tsx client/src/three/Scene.tsx client/src/three/WoodTable.tsx
git commit -m "feat(environment): add warm cozy game lounge 3D room replacing black void"
```

---

### Task 10: Full Verification & Emoji Audit

**Files:** All modified files

- [ ] **Step 1: Run Emoji Guard check**

Run: `npm run check:emoji`  
Expected: PASS with 0 emojis found across the codebase.

- [ ] **Step 2: Run Engine Vitest suite**

Run: `npm test`  
Expected: PASS all tests.

- [ ] **Step 3: Run Full Project Build**

Run: `npm run build`  
Expected: PASS all packages (`shared`, `server`, `client`).

- [ ] **Step 4: Run E2E Smoke Test**

Run: `npm run smoke`  
Expected: PASS full multiplayer game flow.
