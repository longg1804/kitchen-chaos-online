import http from 'http';
import path from 'path';
import fs from 'fs';
import express from 'express';
import cors from 'cors';
import { Server, matchMaker } from 'colyseus';
import { KitchenRoom } from './rooms/KitchenRoom';

const port = Number(process.env.PORT || 2567);
const app = express();

app.use(cors());
app.use(express.json());

// API Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Robust Room Code Lookup Endpoint (100% reliable room matching)
app.get('/api/room-lookup/:code', async (req, res) => {
  try {
    const code = String(req.params.code).trim();
    const rooms = await matchMaker.query({ name: 'kitchen_room' });
    const target = rooms.find(r => r.metadata && String(r.metadata.roomCode).trim() === code);

    if (target) {
      return res.json({ success: true, roomId: target.roomId, roomCode: code });
    } else {
      return res.status(404).json({ success: false, message: `Không tìm thấy phòng số: ${code}` });
    }
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Serve frontend static build if exists
const clientDist = path.join(__dirname, '../../client/dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
  console.log(`[Kitchen Chaos Server] Serving static web client from: ${clientDist}`);
}

const server = http.createServer(app);

// In Colyseus 0.15, passing { server } automatically sets up WebSocket transport
const gameServer = new Server({
  server
});

// Register kitchen room
gameServer.define('kitchen_room', KitchenRoom);

server.listen(port, '0.0.0.0', () => {
  console.log(`[Kitchen Chaos Server] Colyseus Game Server running on port ${port}`);
  console.log(`[Kitchen Chaos Server] WebSocket endpoint: ws://0.0.0.0:${port}`);
});
