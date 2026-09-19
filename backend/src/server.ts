import express from 'express';
import http from 'http';
import cors from 'cors';
import dotenv from 'dotenv';
import apiRouter from './api/routes';
import { initSocketGateway } from './websocket/socketGateway';
import { initDatabase } from './db/database';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Express Middleware
app.use(cors({ origin: '*' }));
app.use(express.json());

// Attach API Router
app.use('/api', apiRouter);

// Create HTTP Server
const server = http.createServer(app);

// Initialize Socket.IO Real-Time Gateway
initSocketGateway(server);

// Start Server
server.listen(PORT, async () => {
  console.log('----------------------------------------------------');
  console.log(`🚀 MEDFLOW Server is running on http://localhost:${PORT}`);
  console.log(`📡 WebSocket Gateway active on ws://localhost:${PORT}`);
  console.log(`🩺 REST API Health check: http://localhost:${PORT}/api/health`);
  console.log('----------------------------------------------------');

  // Verify PostgreSQL Database Connection
  await initDatabase();
});

export { app, server };
