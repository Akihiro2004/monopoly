# 3D Multiplayer Monopoly (LINE Get Rich Edition)

A real-time multiplayer 3D Monopoly website built with React, Three.js (@react-three/fiber), Socket.IO, and an authoritative pure TypeScript game engine. Plays up to 6 players with LINE Get Rich style rules.

---

## Game Features (LINE Get Rich + real Monopoly touches)

1. **Buying**: landing on an unowned property offers it at list price (Buy / Pass). No auctions.
2. **Building (4 levels)**: `House (Lv 1) → Building (Lv 2) → Hotel (Lv 3) → LANDMARK (Lv 4)`
   - You can only upgrade the property you are standing on.
   - You must **pass GO once** before you can start building on land.
   - A **Landmark** needs the **whole color set** owned and built up to Hotels first.
3. **2× Force-Buy**: landing on an opponent's developed property opens a 15-second offer to buy it for 2× its value (land + buildings). **Landmarks can never be acquired**, and force-bought properties can never become Landmarks.
4. **Trading**: trade cash and/or unbuilt deeds with any player at any time (propose, accept, decline, cancel). A trade can settle your own debt.
5. **Debt & Bankruptcy**: cannot pay rent, tax or a card? Sell buildings back (half price) or mortgage land; the debt auto-pays once covered. Declaring bankruptcy **sells everything back to the bank**: the creditor receives only the owed amount (capped at what the sale raised), and properties return to the bank unowned.
6. **Chance & Community Chest**: the card is revealed once your token has actually arrived; "Advance to…" cards move you there and resolve that tile (buy / rent / force-buy).
7. **Victory**: last player standing, or (toggleable) **Triple Victory** (3 complete color sets) / **Line Victory** (every property on one side).
8. **3D board in a little town**: hand-painted tiles, animated classic tokens (car, top hat, Scottie dog, battleship, thimble, boot), houses → townhouse → hotel → domed Landmark, rolling dice, and a sunny diorama.
9. **Desktop & phone**: floating player cards, a collapsible side panel (Assets / Trade / Log / Chat) and a big ROLL button on PC; a portrait-first layout with a tab bar on phones. **Installable** as an app (Add to Home Screen / Install), locked to portrait when installed.

## How to Run Locally

### 1. Install & Build
```bash
npm install
npm run build
```

### 2. Run Single-Origin Server
```bash
npm start
```
The server will start on `http://localhost:5000` serving both the game API/WebSockets and the built 3D client. Open multiple browser tabs (or incognito windows) to play multiplayer locally.

### 3. Development Mode (Hot Reload)
```bash
# Terminal 1: Run server
cd server && npm run dev

# Terminal 2: Run Vite client
cd client && npm run dev
```

### 4. Run Unit Tests (Game Rules & Engine)
```bash
npm test
```

### 5. End-to-End Smoke Test
```bash
npm run smoke
```
Boots the built server on a spare port, connects two real Socket.IO clients, and checks the full path: create room, join, pick tokens, ready up, start, chat, reject out-of-turn rolls, roll dice, move a token, and end the turn.

### 6. Screenshot Script (3D Visual Review)

```bash
npm run shot
```

Drives headless Chrome through a real 2-player game via CDP and saves screenshots to `shots/` (git-ignored): home, lobby, board, post-roll, guest view, zoomed token view, plus magnified crops of the bottom tile row and GO corner so token placement can be reviewed without a manual click-through. Requires Chrome installed (`CHROME_PATH` overrides the default path, `CDP_PORT` overrides 9333).

### 7. Emoji Guard
```bash
npm run check:emoji
```
Fails the build if any emoji character sneaks into source or copy.

---

## How to Play with Friends Online (Using Your PC as Host)

Since the backend runs on your machine, you can expose it to friends over the internet using a free **Cloudflare Tunnel**:

1. Download `cloudflared` from [Cloudflare Tunnels](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/).
2. Start your game server:
   ```bash
   npm start
   ```
3. In a second terminal window, run:
   ```bash
   cloudflared tunnel --url http://localhost:5000
   ```
4. Cloudflare will give you a public HTTPS URL (e.g. `https://random-words.trycloudflare.com`).
5. **Share that URL with your friends!**
   - No port forwarding required.
   - Works across phones, laptops, and PCs.
   - Full WebSockets supported.
   - Make sure your PC stays awake while you play.

---

## Credits

- Town models: [Kenney City Builder kit](https://github.com/KenneyNL/Starter-Kit-City-Builder), CC0 (see `client/public/models/city/LICENSE.txt`).
- Fonts: Lilita One and Nunito (SIL Open Font License) via Fontsource.
