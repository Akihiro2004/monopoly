# TMpoly

TMpoly is a real-time multiplayer 3D property-trading board game (Monopoly-style, LINE Get Rich rules) built with React, Three.js (@react-three/fiber), Socket.IO, and an authoritative pure TypeScript game engine. Plays up to 6 players with LINE Get Rich style rules.

---

## Game Features (LINE Get Rich + real Monopoly touches)

**World edition board**: every board side is a region and every color set a country, marked with its flag.
Southeast Asia (Malaysia: Kuala Lumpur, Penang · Indonesia: Jakarta, Bali, Yogyakarta), East Asia (China: Beijing, Shanghai, Hong Kong · Japan: Osaka, Kyoto, Tokyo), Europe (United Kingdom: Manchester, Edinburgh, London · France: Nice, Lyon, Paris) and the Americas (Brazil: Salvador, Sao Paulo, Rio de Janeiro · United States: Los Angeles, New York). The four railroads are airports (Changi, Haneda, Heathrow, JFK). Line Victory = owning a whole region.

1. **Buying**: landing on an unowned property offers it at list price (Buy / Pass). Pass, or cannot afford it, and the Bank auctions it.
2. **Building (4 levels)**: `House (Lv 1) → Building (Lv 2) → Hotel (Lv 3) → LANDMARK (Lv 4)`
   - You can only upgrade the property you are standing on.
   - You must **pass GO once** before you can start building on land.
   - A **Landmark** needs the **whole color set** owned and built up to Hotels first.
3. **2× Force-Buy**: landing on an opponent's developed property opens a 15-second offer to buy it for 2× its value (land + buildings). **Landmarks can never be acquired**, and force-bought properties can never become Landmarks.
4. **The Bank** (like real Monopoly): pays GO salary, sells deeds, collects taxes and fines, lends on mortgages and buys back buildings. It holds a **limited supply of 32 houses and 12 hotels** (House = 1 house, Building = 2 houses, Hotel/Landmark = 1 hotel; houses return to the Bank when a hotel goes up). Selling a hotel during a housing shortage sells the property down to land. Declined or unaffordable properties go to a **Bank auction** that every player can bid on. The Bank tab shows the supply, any live auction, and a statement of every transaction.
5. **Trading**: trade cash and/or unbuilt deeds with any player at any time (propose, accept, decline, cancel). A trade can settle your own debt.
6. **Debt & Bankruptcy**: cannot pay rent, tax or a card? The **debt planner** opens with every property you own: pick exactly which levels to sell and what to mortgage (or let Auto-plan choose what costs you the least rent), see the rent tables and a live cash-vs-debt meter, peek at the board, or offer a trade, then run the plan. The debt auto-pays once covered. Declaring bankruptcy **sells everything back to the bank**: the creditor receives only the owed amount (capped at what the sale raised), and properties return to the bank unowned.
7. **Passing GO** plays a coin-fountain animation on the GO tile and a +$200 banner.
   **Chance & Community Chest**: the classic 16 + 16 cards (mapped onto the world board: Advance to New York / London / Beijing / GO, nearest Airport with double rent, nearest Utility at 10x a fresh roll, Go back 3, repairs per house / hotel, pay each player, birthday, bank error...). Decks are shuffled; drawn cards go under the deck, and Get Out of Jail Free is kept until used, then returned to its deck. The card is drawn once your token arrives: the top card lifts off the 3D deck, flies to you and flips over. Card moves resolve the tile you land on.
8. **Victory**: last player standing, or (toggleable) **Triple Victory** (3 complete color sets) / **Line Victory** (every property on one side).
9. **3D board in a little town**: hand-painted tiles, animated classic tokens (car, top hat, Scottie dog, battleship, thimble, boot), houses → townhouse → hotel → domed Landmark, rolling dice, and a sunny diorama.
10. **Desktop & phone**: floating player cards, a collapsible side panel (Assets / Trade / Log / Chat) and a big ROLL button on PC; a portrait-first layout with a tab bar on phones. **Installable** as an app (Add to Home Screen / Install), locked to portrait when installed.
11. **Runs smoothly anywhere**: the 3D scene only renders while something moves, graphics adapt to the device (Auto / Smooth / Pretty button, automatic step-down when FPS drops), the 3D engine loads in the background while you are in the lobby, and the server gzips and caches everything.

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

- Property buildings: [KayKit City Builder Bits](https://github.com/KayKit-Game-Assets/KayKit-City-Builder-Bits-1.0) by Kay Lousberg, CC0 (see `client/public/models/kaykit/LICENSE.txt`).
- Flags: [circle-flags](https://github.com/HatScripts/circle-flags), MIT (see `client/public/icons/LICENSE.txt`).
- Town models: [Kenney City Builder kit](https://github.com/KenneyNL/Starter-Kit-City-Builder), CC0 (see `client/public/models/city/LICENSE.txt`).
- Fonts: Lilita One and Nunito (SIL Open Font License) via Fontsource.
