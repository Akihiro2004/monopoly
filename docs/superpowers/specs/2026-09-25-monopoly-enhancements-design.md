# 3D Monopoly Enhancements Design Specification

**Date:** 2026-09-25  
**Topic:** Visual & Gameplay Enhancements for 3D Monopoly  
**Status:** Approved by User  

---

## 1. Objectives

This document specifies the technical design for addressing 8 key visual and gameplay improvements to the 3D Monopoly web application:

1. **Board Tile Text Orientation:** Fix upside-down/inverted tile labels and color bands across all four sides and corner tiles.
2. **Remove Auto-Buy & Add Purchase Modal:** Replace instant auto-buying with an unowned property purchase modal featuring clean typography (no emojis/AI slop) and 3D tactile buttons.
3. **3D Button & Control Styling:** Apply tactile 3D extrusion, beveled edges, glossy accents, and interactive click animations to all game buttons.
4. **House Ownership Preview on Land Edge:** Remove full-tile color tints upon purchase; instead, place a 3D house model at the edge of the tile with roof/trim colored in the owner's player color.
5. **Center Player Tokens on Land:** Eliminate hardcoded static offsets that push tokens off-center when alone on a tile, and dynamically disperse only when multiple tokens share a tile.
6. **Dice Roll -> Step-by-Step Walk Animation:** Keep the token stationary while dice tumble mid-air (~0.9s), then animate the player walking step-by-step from tile to tile before triggering landing modals.
7. **Sound Effects & Background Music:** Implement a Web Audio API audio engine with procedural sound effects (dice tumble, token step, buy chime, button clicks, turn chime) and a relaxing Monopoly game night background music loop, with an in-HUD mute toggle.
8. **Warm Cozy Game Lounge Environment:** Replace the black void around the wooden table with a 3D warm game room featuring wood wainscoting, textured wallpaper, and soft ambient lighting.

---

## 2. Architecture & Component Details

### 2.1 Board Coordinates & Tile Orientation (`client/src/three/boardCoords.ts`, `Board3D.tsx`)
- Standardize tile coordinate rotations:
  - Side 0 (Bottom, tiles 0–9): rotation `[0, 0, 0]`.
  - Side 1 (Left, tiles 10–19): rotation `[0, -Math.PI / 2, 0]`.
  - Side 2 (Top, tiles 20–29): rotation `[0, Math.PI, 0]`.
  - Side 3 (Right, tiles 30–39): rotation `[0, Math.PI / 2, 0]`.
- Corner tiles (0 GO, 10 Jail, 20 Free Parking, 30 Go To Jail):
  - Angled at 45° increments toward the center or oriented so labels are legible from the player perspective without being inverted.
- Local coordinate uniformity:
  - Color band: positioned at local `-coord.size[2] * 0.35` (inner edge facing board center).
  - Price label: positioned at local `coord.size[2] * 0.32` (outer edge).
  - Tile name: centered at `[0, coord.size[1] / 2 + 0.03, 0]` with standard rotation `[-Math.PI / 2, 0, 0]`.

### 2.2 Property Purchase Engine & Modal (`server/src/engine/`, `client/src/ui/BuyPropertyModal.tsx`)
- **Shared Types (`shared/src/types.ts`)**:
  - Add `BuyOffer` interface:
    ```typescript
    export interface BuyOffer {
      tileIndex: number;
      price: number;
      buyerPlayerId: string;
    }
    ```
  - Update `GameState`: add `buyOffer: BuyOffer | null`.
  - Add `'BUY_OFFER'` to `GamePhase`.
  - Add client event `'game:buyResponse': { accept: boolean }`.
- **Server Engine (`server/src/engine/resolve.ts`, `game.ts`)**:
  - Landing on an unowned property:
    - If `buyer.money >= tile.price`: transition phase to `'BUY_OFFER'`, populate `gameState.buyOffer`.
    - If `buyer.money < tile.price`: emit toast notification that player cannot afford the property; proceed directly to `'TURN_ENDED'`.
  - Server handler for `game:buyResponse`:
    - If `accept === true`: deduct `tile.price` from player, set `prop.ownerId = player.playerId`, `prop.buildLevel = 0`, emit purchase toast, clear `buyOffer`, transition to `'TURN_ENDED'`.
    - If `accept === false`: emit toast that player passed, clear `buyOffer`, transition to `'TURN_ENDED'`.
- **Client Modal (`BuyPropertyModal.tsx`)**:
  - Structured like an authentic Monopoly title deed:
    - Header banner in property color with property name in uppercase.
    - Subtitle: "TITLE DEED".
    - Price and rent schedule table (Rent, With 1 House, With Building, With Hotel, Landmark).
    - Player balance check.
    - Two 3D tactile buttons: `BUY PROPERTY ($X)` (emerald green) and `PASS` (charcoal).
    - Fully adheres to emoji-free rule (`check-emojis.mjs`).

### 2.3 3D Tactile Buttons (`client/src/styles/hud.css`, `modals.css`)
- Reusable `.btn-3d` CSS class system:
  - Dimensional bottom border shadow (`box-shadow: 0 6px 0 var(--btn-shadow), 0 10px 18px rgba(0,0,0,0.4)`).
  - Subtle top bevel highlight (`border-top: 1px solid rgba(255,255,255,0.3)`).
  - Active press-down transition (`transform: translateY(4px); box-shadow: 0 2px 0 var(--btn-shadow)`).
  - Audio click sound trigger on mouse down.

### 2.4 3D House Preview on Land Ownership (`Board3D.tsx`, `BuildingMesh.tsx`)
- Remove the full-tile translucent overlay (`ownerFlagRing`) from `Board3D.tsx`.
- Keep the tile base pristine `#f8fafc`.
- Update `BuildingMesh.tsx`:
  - When `level === 0` (owned raw land): render a miniature 3D house marker (size `[0.3, 0.22, 0.3]`) situated at the inner/edge band of the tile with roof colored with the owner's player color (`ownerColor`).
  - When upgraded to levels 1–4: render the upgraded house/building/hotel/landmark at the edge position so it never covers the tile text or token center.

### 2.5 Player Token Centering & Dynamic Dispersal (`Tokens3D.tsx`)
- Compute token offsets dynamically per tile:
  - Find all active players located at `tileIndex`.
  - If only 1 player: offset is `[0, 0, 0]` (exact center).
  - If 2 players: offsets `[-0.26, 0, 0]` and `[0.26, 0, 0]`.
  - If 3+ players: offsets arranged in an equidistant circle of radius 0.3 around center.
- Ensure world offsets align correctly with the tile's rotation so tokens stay centered inside the tile boundaries on all 4 board sides.

### 2.6 Dice Animation -> Sequential Walk (`Tokens3D.tsx`, `Dice3D.tsx`, `gameStore.ts`)
- Store state: add `isWalking: boolean`, `displayPositions: Record<string, number>`.
- Dice roll sequence:
  1. Dice roll starts: dice rotate and bounce for 0.9s.
  2. While dice are in air, player token remains at its starting tile.
  3. When dice land: calculate step count `total = d1 + d2`.
  4. Step sequentially: tile by tile from `oldPos + 1` to `newPos` at ~0.18s per step.
  5. During each step: token hops along an arc `y = baseY + Math.sin(t * Math.PI) * 0.35` and plays a wooden step tap sound.
  6. Upon completing the final step: set `isWalking = false`, play landing sound, and show the landing modal (`BuyPropertyModal` or `ForceBuyModal`).

### 2.7 Sound Effects & Background Music (`client/src/sound/audioManager.ts`)
- Implement a zero-dependency Web Audio API sound synthesizer:
  - `playDiceRoll()`: rapid burst of filtered white noise and low-frequency resonance mimicking wooden dice rattling and hitting table.
  - `playStep()`: short high-pitched wooden block click.
  - `playBuy()`: bright two-tone ascending chord (C5 -> G5) chime with pleasant decay.
  - `playClick()`: subtle tactile UI click.
  - `playTurnStart()`: warm marimba alert note.
  - `playBGM()` / `stopBGM()`: procedural warm lo-fi jazz chord progression (Fmaj7 - Em7 - Dm7 - Cmaj7) with soft Rhodes timbre and gentle tempo.
- HUD Mute Toggle:
  - Speaker icon in top HUD.
  - State persisted in `localStorage`.

### 2.8 Warm Cozy Game Lounge Environment (`WoodTable.tsx`, `Scene.tsx`)
- In `Scene.tsx` & `WoodTable.tsx`:
  - Enclose the scene with interior walls:
    - Back wall and side walls with rich mahogany wood wainscoting on the bottom half.
    - Warm patterned damask/geometric wallpaper on the upper half (`#261712` / `#382319` with amber ambient tones).
    - Warm wall sconces casting soft spotlights on the wallpaper.
  - Wood table:
    - Retain rich procedural wood grain table plane.
    - Soft circular ambient rug under the table.
  - Fog & ambient lighting:
    - Warm table-height point lights and soft room ambient light (`#ffe8cc`).

---

## 3. Testing & Verification Strategy

1. **Unit & Engine Tests:**
   - Run Vitest suite: `npm test` to verify buy offer, payment resolution, turn ending, and victory checks.
2. **Emoji Guard:**
   - Run `npm run check:emoji` to ensure 0 emojis exist anywhere in the code or copy.
3. **End-to-End Smoke Test:**
   - Run `npm run smoke` to ensure multiplayer socket flow remains healthy.
4. **Visual Verification:**
   - Verify all 4 sides of the board have text reading upright.
   - Verify token is centered when alone on a tile.
   - Verify buy modal appears only after step-by-step walk finishes.
   - Verify house appears on tile edge upon purchase.
   - Verify sound effects and BGM play properly and mute toggle works.
   - Verify room wallpaper surrounds the table with warm cozy lounge ambiance.
