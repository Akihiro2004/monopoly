# 🎲 3D Multiplayer Monopoly (LINE Get Rich Edition)

A real-time multiplayer 3D Monopoly game website built with **React**, **Three.js (@react-three/fiber)**, **Socket.IO**, and an authoritative pure TypeScript game engine. Plays with **up to 6 players** with special **LINE Get Rich style rules**.

---

## ⚡ Game Features (LINE Get Rich Inspired)

1. **Auto-Buy on Landing**:
   - Landing on unowned property buys it automatically if you have sufficient funds.
   - If broke, it stays unowned (no auctions, fast-paced!).

2. **2× Force-Buy from Opponents**:
   - Landing on an opponent's **developed property (house/building/hotel)** gives you a **15-second timed offer** to forcefully purchase it for **2× the total cost** (land + buildings).
   - The sale is **forced** (the owner cannot refuse if the buyer accepts).
   - If declined or timed out, normal rent is paid.

3. **4 Build Levels & Landmark Protection**:
   - `House (Lv 1) → Building (Lv 2) → Hotel (Lv 3) → LANDMARK (Lv 4)`
   - **Landmarks** are permanent golden monuments: they **cannot be bought** from opponents!
   - Properties acquired via **force-buy keep their build level**, can upgrade to Hotel, but are **Landmark-locked** (cannot upgrade to Landmark).

4. **Multiple Victory Conditions**:
   - **Bankruptcy Victory**: Standard last non-bankrupt player standing.
   - **Triple Victory** (toggleable): Own all properties of any 3 complete color sets!
   - **Line Victory** (toggleable): Own all purchasable properties on an entire board side!

5. **3D Interactive Visuals**:
   - Full 3D board rendered via Three.js with OrbitControls (drag to rotate, pinch/scroll to zoom).
   - 6 custom 3D tokens (Race Car, Top Hat, Dog, Battleship, Thimble, Boot) with active player tracking.
   - 3D animated dice rolls.
   - Real-time in-game chat and toast activity feed.

---

## 🚀 How to Run Locally

### 1. Install & Build
```bash
npm install
npm run build
```

### 2. Run Single-Origin Server
```bash
npm start
```
The server will start on `http://localhost:5000` serving both the game API/WebSockets and the built 3D client. Open multiple browser tabs (or incognito windows) to play multiplayer locally!

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

---

## 🌐 How to Play with Friends Online (Using Your PC as Host)

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
