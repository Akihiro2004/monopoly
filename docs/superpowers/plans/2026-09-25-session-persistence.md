# Session Persistence & Seamless Reconnect Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow players to refresh their browser tab or temporarily disconnect without losing their active game, immediately restoring their seat, 3D board view, balance, and turn state upon reload.

**Architecture:**
- **Client**: Store active `monopoly_room_id` and `monopoly_player_name` in `sessionStorage` alongside the existing `monopoly_player_id`. On page mount, automatically invoke `room:join` if a room ID is found. Clear on explicit game exit.
- **Server**: In `RoomManager.joinRoom()`, inspect whether `playerId` is already seated in the room before checking if the room is in `playing` status. If already seated, rebind the socket, set `isConnected = true`, and in `registerLobbyHandlers` immediately send both `room:state` and `game:state` to restore the game view.
- **Testing**: Extend the test suite with unit tests in `engine.test.ts` / new `rooms.test.ts` and automated end-to-end reconnect testing in `scripts/smoke.mjs`.

**Tech Stack:** TypeScript, Node.js, Express, Socket.IO, React 19, Zustand, Vitest.

## Global Constraints
- Strict zero-emoji policy: No emojis in source code, logs, or UI text (`npm run check:emoji` must pass).
- Ponytail full mode: Minimal, concise diffs; standard web platform features (`sessionStorage`); no unnecessary libraries.
- Safety: Never simplify away input validation or error boundaries.

---

### Task 1: Server Reconnect Logic in `RoomManager` and `lobby.ts`

**Files:**
- Modify: `server/src/rooms.ts:65-106`
- Modify: `server/src/handlers/lobby.ts:48-58`
- Test: `server/test/rooms.test.ts`

**Interfaces:**
- Consumes: `RoomManager.joinRoom(roomId, socketId, playerId, name)`
- Produces: Seamless re-linking for seated players during `status === 'playing'` and direct emission of `game:state` on rejoin.

- [ ] **Step 1: Write unit tests for room reconnection in `server/test/rooms.test.ts`**
- [ ] **Step 2: Run test to verify failure** (`npm test`)
- [ ] **Step 3: Update `RoomManager.joinRoom` in `server/src/rooms.ts` to permit existing seated players during active game**
- [ ] **Step 4: Update `server/src/handlers/lobby.ts` to emit `game:state` when rejoining an active game**
- [ ] **Step 5: Run tests to verify all pass** (`npm test`)
- [ ] **Step 6: Commit server changes**

---

### Task 2: Client Auto-Rejoin & Session Storage in `gameStore.ts` and `App.tsx`

**Files:**
- Modify: `client/src/store/gameStore.ts:56-85`
- Modify: `client/src/App.tsx:14-25`
- Modify: `client/src/ui/HomeScreen.tsx:15-42`

**Interfaces:**
- Consumes: `sessionStorage.getItem('monopoly_room_id')`
- Produces: Transparent auto-reconnect effect on page mount when room ID is present; stores room ID on room create/join; cleans up on reset.

- [ ] **Step 1: Update `client/src/store/gameStore.ts` to save and clear `monopoly_room_id` in `sessionStorage`**
- [ ] **Step 2: Update `client/src/ui/HomeScreen.tsx` to save player name and room ID in `sessionStorage` on create/join**
- [ ] **Step 3: Add auto-reconnect `useEffect` in `client/src/App.tsx` on initial mount**
- [ ] **Step 4: Run build to ensure TypeScript types and bundle succeed** (`npm run build`)
- [ ] **Step 5: Commit client changes**

---

### Task 3: Verification & Smoke Test

**Files:**
- Modify: `scripts/smoke.mjs:155-175`

- [ ] **Step 1: Add a simulated browser tab refresh step in `scripts/smoke.mjs`** (disconnect socket, open new socket with same `playerId`, rejoin room, verify `game:state` received)
- [ ] **Step 2: Run `npm run smoke` to verify end-to-end rejoin passes**
- [ ] **Step 3: Run `npm run check:emoji` to ensure 0 emojis**
- [ ] **Step 4: Run `npm test` and `npm run build`**
- [ ] **Step 5: Commit verification updates**
