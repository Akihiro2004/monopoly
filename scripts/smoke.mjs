// End-to-end smoke test: boots the built server, drives two real Socket.IO
// clients through lobby + one full turn, and reports PASS/FAIL.
// Usage: npm run smoke
import { spawn } from 'child_process';
import { setTimeout as sleep } from 'timers/promises';
import { io } from 'socket.io-client';

const PORT = Number(process.env.SMOKE_PORT || 5055);
const URL = `http://localhost:${PORT}`;
const results = [];
let serverProcess = null;

const check = (label, ok, detail = '') => {
  results.push({ label, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? `  (${detail})` : ''}`);
};

function startServer() {
  return new Promise((resolve, reject) => {
    serverProcess = spawn(process.execPath, ['server/dist/index.js'], {
      env: { ...process.env, PORT: String(PORT) },
      stdio: ['ignore', 'pipe', 'pipe']
    });
    let out = '';
    serverProcess.stdout.on('data', (d) => {
      out += d.toString();
      if (out.includes('Server running')) resolve();
    });
    serverProcess.stderr.on('data', (d) => process.stderr.write(`[server] ${d}`));
    serverProcess.on('exit', (code) => reject(new Error(`Server exited early (${code})`)));
    setTimeout(() => reject(new Error('Server did not start in time')), 15000);
  });
}

function connect(playerId) {
  return new Promise((resolve, reject) => {
    const socket = io(URL, { query: { playerId }, transports: ['websocket'] });
    socket.on('connect', () => resolve(socket));
    socket.on('connect_error', reject);
    setTimeout(() => reject(new Error(`Socket ${playerId} did not connect`)), 10000);
  });
}

// Resolve on the first event payload that satisfies predicate
function waitFor(socket, event, predicate = () => true, timeoutMs = 8000) {
  return new Promise((resolve, reject) => {
    const handler = (payload) => {
      if (!predicate(payload)) return;
      clearTimeout(timer);
      socket.off(event, handler);
      resolve(payload);
    };
    const timer = setTimeout(() => {
      socket.off(event, handler);
      reject(new Error(`Timed out waiting for ${event}`));
    }, timeoutMs);
    socket.on(event, handler);
  });
}

function emitAck(socket, event, payload) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${event} ack timed out`)), 8000);
    socket.emit(event, payload, (res) => {
      clearTimeout(timer);
      resolve(res);
    });
  });
}


async function main() {
  await startServer();
  console.log(`Server up on ${URL}`);

  const alice = await connect('smoke-alice');
  const bob = await connect('smoke-bob');

  // Lobby
  const created = await emitAck(alice, 'room:create', { name: 'Alice' });
  check('room:create returns room id', created?.ok === true && !!created.roomId, created?.roomId || created?.error);

  const joined = await emitAck(bob, 'room:join', { roomId: created.roomId, name: 'Bob' });
  check('room:join succeeds', joined?.ok === true, joined?.error || '');

  const roomState = await waitFor(alice, 'room:state', (s) => s.seats.length === 2).catch(() => null);
  check('room:state shows 2 seats', !!roomState, roomState ? `${roomState.seats.length} seats` : 'no state');

  alice.emit('room:selectToken', { tokenType: 'car', color: 'red' });
  bob.emit('room:selectToken', { tokenType: 'hat', color: 'blue' });
  const tokensReady = await waitFor(
    alice,
    'room:state',
    (s) => s.seats.some((x) => x.tokenType === 'car') && s.seats.some((x) => x.tokenType === 'hat')
  ).catch(() => null);
  check('token selection is stored', !!tokensReady);

  bob.emit('room:ready', { ready: true });
  const readyState = await waitFor(alice, 'room:state', (s) => s.seats.every((x) => x.isReady || x.isHost)).catch(() => null);
  check('ready flag propagates', !!readyState);

  const gameStatePromise = waitFor(alice, 'game:state', (s) => s.phase !== 'LOBBY').catch(() => null);
  alice.emit('room:start');
  const gameState = await gameStatePromise;
  check('game starts with 2 players', !!gameState && gameState.players.length === 2);

  if (!gameState) throw new Error('Game did not start');

  // Chat
  const chatPromise = waitFor(bob, 'chat:message', (m) => m.text === 'smoke test').catch(() => null);
  alice.emit('chat:send', { text: 'smoke test' });
  const chat = await chatPromise;
  check('chat message is broadcast', !!chat, chat ? '1 message' : '');

  // One full turn
  const firstPlayer = gameState.players[gameState.currentPlayerIndex];
  const roller = firstPlayer.playerId === 'smoke-alice' ? alice : bob;
  const other = roller === alice ? bob : alice;

  let wrongTurnRejected = false;
  other.once('error', () => { wrongTurnRejected = true; });
  other.emit('game:roll');
  await sleep(400);
  check('roll from the wrong player is rejected', wrongTurnRejected);

  const dicePromise = waitFor(roller, 'game:dice');
  const movedPromise = waitFor(roller, 'game:state', (s) => s.dice[0] > 0 && s.dice[1] > 0);
  roller.emit('game:roll');
  const dice = await dicePromise.catch(() => null);
  check(
    'dice roll returns two faces',
    !!dice && dice.d1 >= 1 && dice.d1 <= 6 && dice.d2 >= 1 && dice.d2 <= 6,
    dice ? `${dice.d1} + ${dice.d2} = ${dice.d1 + dice.d2}` : 'no roll'
  );

  const moved = await movedPromise;
  const rollerState = moved.players.find((p) => p.playerId === firstPlayer.playerId);
  check('active player token left GO', !!rollerState && rollerState.position !== 0, rollerState ? `position ${rollerState.position}` : 'no state');
  check('game:state carries both players', moved.players.length === 2);

  if (moved.phase === 'BUY_OFFER') {
    const buyResolved = waitFor(roller, 'game:state', (s) => s.phase === 'TURN_ENDED');
    roller.emit('game:buyResponse', { accept: true });
    await buyResolved;
    check('buy offer prompt accepted', true);
  }

  const before = { turn: moved.turnNumber, index: moved.currentPlayerIndex };
  const endPromise = waitFor(
    bob,
    'game:state',
    (s) =>
      s.turnNumber > before.turn ||
      s.currentPlayerIndex !== before.index ||
      (s.phase === 'ROLLING' && !s.buyOffer)
  ).catch(() => null);
  roller.emit('game:endTurn');
  const ended = await endPromise;
  check('turn advances after end turn', !!ended, ended ? `turn ${ended.turnNumber} (phase ${ended.phase})` : 'turn did not advance');

  const balancesOk = (ended?.players || []).every((p) => p.money > -5000 && p.money <= 2000);
  check('player balances stay in a sane range', balancesOk);

  alice.close();
  bob.close();
}

main()
  .catch((err) => {
    check('smoke run completed', false, err.message);
  })
  .finally(async () => {
    if (serverProcess) serverProcess.kill();
    await sleep(200);
    const failed = results.filter((r) => !r.ok);
    console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
    process.exit(failed.length === 0 ? 0 : 1);
  });
