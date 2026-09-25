import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import cors from 'cors';
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
app.use(express.json());

// Serve static build from client/dist (for local play / single-origin tunnel)
const clientDistPath = path.resolve(__dirname, '../../client/dist');
app.use(express.static(clientDistPath));

app.get('/api/health', (req, res) => {
  res.json({ ok: true, timestamp: Date.now() });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(clientDistPath, 'index.html'), (err) => {
    if (err) {
      res.status(200).send('Monopoly 3D server is running. Build the client to view the UI.');
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
  console.log(`🎲 Monopoly 3D Server running on http://localhost:${PORT}`);
});
