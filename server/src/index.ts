import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import cors from 'cors';
import compression from 'compression';
import { Server } from 'socket.io';
import {
  ClientToServerEvents,
  ServerToClientEvents
} from '@monopoly/shared';
import { RoomManager } from './rooms.js';
import { registerLobbyHandlers } from './handlers/lobby.js';
import { registerGameHandlers } from './handlers/gameplay.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = parseInt(process.env.PORT || '5000', 10);

const app = express();
app.use(cors());
// gzip everything (JS, CSS, glTF, SVG): big win over a Cloudflare tunnel / 4G.
app.use(compression());
app.use(express.json());

// Serve static build from client/dist (for local play / single-origin tunnel).
// Hashed build assets never change: cache them for a year. Models / icons for
// a week. index.html and the service worker must always be re-checked.
const clientDistPath = path.resolve(__dirname, '../../client/dist');
app.use(
  express.static(clientDistPath, {
    setHeaders(res, filePath) {
      const rel = path.relative(clientDistPath, filePath).split(path.sep).join('/');
      if (rel.startsWith('assets/')) res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      else if (rel.startsWith('models/') || rel.startsWith('icons/')) res.setHeader('Cache-Control', 'public, max-age=604800');
      else res.setHeader('Cache-Control', 'no-cache');
    }
  })
);

app.get('/api/health', (req, res) => {
  res.json({ ok: true, timestamp: Date.now() });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(clientDistPath, 'index.html'), (err) => {
    if (err) {
      res.status(200).send('TMpoly server is running. Build the client to view the UI.');
    }
  });
});

const server = http.createServer(app);

const io = new Server<ClientToServerEvents, ServerToClientEvents>(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  },
  pingTimeout: 60000,
  pingInterval: 25000
});

const roomManager = new RoomManager();

io.on('connection', (socket) => {
  registerLobbyHandlers(io, socket, roomManager);
  registerGameHandlers(io, socket, roomManager);

  socket.on('disconnect', () => {
    const { room } = roomManager.handleDisconnect(socket.id);
    if (room) {
      io.to(room.roomId).emit('room:state', roomManager.toRoomState(room));
    }
  });
});

server.listen(PORT, () => {
  console.log(`TMpoly Server running on http://localhost:${PORT}`);
});
