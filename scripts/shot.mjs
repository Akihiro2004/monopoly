// Drives headless Chrome through a real 2-player game and saves screenshots
// so the 3D layout can be reviewed without a manual click-through.
// Usage: npm run shot
import { spawn } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import { setTimeout as sleep } from 'timers/promises';
import WebSocket from 'ws';

const CHROME = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = Number(process.env.SHOT_PORT || 5056);
const APP = `http://127.0.0.1:${PORT}`;
const DEBUG_PORT = Number(process.env.CDP_PORT || 9333);
const OUT_DIR = 'shots';

let chrome = null;
let server = null;

class CDP {
  constructor(ws) {
    this.ws = ws;
    this.seq = 0;
    this.pending = new Map();
    this.listeners = new Map();
    ws.on('message', (raw) => {
      const msg = JSON.parse(raw.toString());
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (msg.error) reject(new Error(JSON.stringify(msg.error)));
        else resolve(msg.result);
      } else if (msg.method && this.listeners.has(msg.method)) {
        for (const fn of [...this.listeners.get(msg.method)]) fn(msg.params);
      }
    });
  }

  send(method, params = {}) {
    const id = ++this.seq;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  once(method, timeoutMs = 20000) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`timeout waiting for ${method}`)), timeoutMs);
      const fn = (params) => {
        clearTimeout(timer);
        this.listeners.set(method, this.listeners.get(method).filter((f) => f !== fn));
        resolve(params);
      };
      this.listeners.set(method, [...(this.listeners.get(method) || []), fn]);
    });
  }

  async eval(expression) {
    const res = await this.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (res.exceptionDetails) {
      throw new Error(`page error: ${res.exceptionDetails.exception?.description || res.exceptionDetails.text}`);
    }
    return res.result.value;
  }

  async screenshot(file) {
    const res = await this.send('Page.captureScreenshot', { format: 'png' });
    await fs.writeFile(file, Buffer.from(res.data, 'base64'));
    return file;
  }

  async crop(file, x, y, width, height, scale = 2.5) {
    const res = await this.send('Page.captureScreenshot', {
      format: 'png',
      clip: { x, y, width, height, scale },
      captureBeyondViewport: true
    });
    await fs.writeFile(file, Buffer.from(res.data, 'base64'));
    return file;
  }

  close() {
    this.ws.close();
  }
}

async function openTab() {
  const res = await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/new?about:blank`, { method: 'PUT' });
  const target = await res.json();
  const ws = new WebSocket(target.webSocketDebuggerUrl, { perMessageDeflate: false, maxPayload: 256 * 1024 * 1024 });
  await new Promise((resolve, reject) => {
    ws.on('open', resolve);
    ws.on('error', reject);
  });
  const cdp = new CDP(ws);
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  return cdp;
}

async function waitForDebugPort() {
  for (let i = 0; i < 120; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/version`);
      if (res.ok) return await res.json();
    } catch {
      // not up yet
    }
    await sleep(250);
  }
  throw new Error('Chrome DevTools endpoint never came up');
}


const setInput = (selector, value) =>
  `(() => { const el = document.querySelector(${JSON.stringify(selector)}); if (!el) return 'missing';
    const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, ${JSON.stringify(value)});
    el.dispatchEvent(new Event('input', { bubbles: true }));
    return el.value; })()`;

const clickIf = (selector) =>
  `(() => { const el = document.querySelector(${JSON.stringify(selector)}); if (!el) return 'missing';
    if (el.disabled) return 'disabled'; el.click(); return 'clicked'; })()`;

const textOf = (selector) =>
  `(() => { const el = document.querySelector(${JSON.stringify(selector)}); return el ? el.textContent.trim() : null; })()`;

async function waitForText(cdp, selector, timeoutMs = 15000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const value = await cdp.eval(textOf(selector));
    if (value) return value;
    await sleep(200);
  }
  throw new Error(`no text found at ${selector}`);
}

async function navigate(cdp, url) {
  const loaded = cdp.once('Page.loadEventFired');
  await cdp.send('Page.navigate', { url });
  await loaded;
}

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true });

  server = spawn(process.execPath, ['server/dist/index.js'], { env: { ...process.env, PORT: String(PORT) }, stdio: 'ignore' });
  for (let i = 0; i < 40; i++) {
    try {
      const res = await fetch(APP);
      if (res.ok) break;
    } catch {}
    await sleep(200);
  }

  const profileDir = path.resolve('shots', `prof-${Date.now()}`);
  await fs.mkdir(profileDir, { recursive: true });
  const chromeLog = await fs.open('shots/chrome.log', 'w');
  chrome = spawn(
    CHROME,
    [
      '--headless=new',
      `--remote-debugging-port=${DEBUG_PORT}`,
      '--remote-allow-origins=*',
      '--window-size=1600,1000',
      '--hide-scrollbars',
      '--no-first-run',
      '--no-default-browser-check',
      '--no-sandbox',
      '--disable-dev-shm-usage',
      '--enable-unsafe-swiftshader',
      `--user-data-dir=${profileDir}`,
      'about:blank'
    ],
    { stdio: ['ignore', chromeLog.fd, chromeLog.fd] }
  );
  chrome.on('error', (err) => console.error(`chrome spawn error: ${err.message}`));
  chrome.on('exit', (code, signal) => console.error(`chrome exited early code=${code} signal=${signal}`));
  await waitForDebugPort();
  console.log('Chrome up, driving the game');

  const alice = await openTab();
  const bob = await openTab();

  await navigate(alice, APP);
  await sleep(600);
  await alice.screenshot(`${OUT_DIR}/1-home.png`);

  await alice.eval(setInput('input[name="player-name"]', 'Alice'));
  await sleep(150);
  await alice.eval(clickIf('.btn-create'));
  const roomCode = await waitForText(alice, '.code-display h2');
  console.log(`Room ${roomCode} created`);
  await sleep(400);
  await alice.screenshot(`${OUT_DIR}/2-lobby-host.png`);

  await navigate(bob, APP);
  await sleep(600);
  await bob.eval(setInput('input[name="player-name"]', 'Bob'));
  await bob.eval(clickIf('.mode-tickets button:nth-child(2)'));
  await sleep(150);
  await bob.eval(setInput('input[name="room-code"]', roomCode));
  await sleep(150);
  await bob.eval(clickIf('.btn-join'));
  await waitForText(bob, '.code-display h2');
  console.log('Bob joined');
  // Bob clicks Ready
  for (let i = 0; i < 30; i++) {
    const res = await bob.eval(clickIf('.btn-ready'));
    if (res === 'clicked') break;
    await sleep(200);
  }

  // Alice clicks Start Game once enabled
  for (let i = 0; i < 40; i++) {
    const res = await alice.eval(clickIf('.btn-start'));
    if (res === 'clicked') break;
    await sleep(250);
  }

  // Wait until canvas and HUD are mounted
  for (let i = 0; i < 50; i++) {
    const ready = await alice.eval(`(() => !!document.querySelector('canvas') && !!document.querySelector('.hud-top-bar'))()`);
    if (ready) break;
    await sleep(200);
  }

  // Bring Alice to front so Chrome composites and renders WebGL
  await alice.send('Page.bringToFront');
  await alice.eval(`(() => {
    const c = document.querySelector('canvas');
    if (c) c.dispatchEvent(new MouseEvent('mousemove', { clientX: 100, clientY: 100 }));
  })()`);

  // Allow 3D shaders, textures, and Troika fonts to finish rendering
  await sleep(3500);
  await alice.screenshot(`${OUT_DIR}/3-board-host.png`);

  const isAliceTurn = await alice.eval(`(() => document.querySelector('.btn-roll') !== null)()`);
  const roller = isAliceTurn ? alice : bob;
  const rollerName = isAliceTurn ? 'Alice' : 'Bob';
  console.log(`${rollerName} has the first turn`);

  const rollResult = await roller.eval(clickIf('.btn-roll'));
  if (rollResult === 'clicked') {
    console.log(`${rollerName} rolled the dice`);
    await sleep(5500); // Wait for dice tumble + sequential tile walking + modal appearance
    await roller.screenshot(`${OUT_DIR}/4-board-after-roll.png`);

    // Click Buy Property in the title deed modal
    const buyResult = await roller.eval(clickIf('.btn-buy'));
    if (buyResult === 'clicked') {
      console.log(`${rollerName} accepted buy offer`);
      await sleep(2000); // Wait for modal to close and 3D house preview to render
      await roller.screenshot(`${OUT_DIR}/5-board-after-buy.png`);
    }
  } else {
    console.log(`Could not click roll (${rollResult}), shooting static board`);
  }

  // Magnified crop of bottom tile row
  await alice.crop(`${OUT_DIR}/6-bottom-row-crop.png`, 700, 600, 760, 220, 2.5);
  console.log(`Screenshots written to ${OUT_DIR}`);
  alice.close();
  bob.close();
}

main()
  .catch((err) => console.error(`FAILED: ${err.message}`))
  .finally(async () => {
    if (chrome) chrome.kill();
    if (server) server.kill();
    await sleep(300);
    process.exit(0);
  });
