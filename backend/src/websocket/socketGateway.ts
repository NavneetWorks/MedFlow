import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';

let io: SocketIOServer | null = null;

/**
 * Initializes Socket.IO Server attached to HTTP Server with CORS allowed.
 */
export function initSocketGateway(httpServer: HTTPServer): SocketIOServer {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: '*', // Allows React Vite Dev Server (http://localhost:5173)
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket: Socket) => {
    console.log(`[Socket.IO] Client Connected: ${socket.id}`);

    // Client subscribes to live simulation stream
    socket.on('sim:subscribe', (simulationId: string) => {
      socket.join(simulationId || 'sim-default');
      console.log(`[Socket.IO] Client ${socket.id} subscribed to simulation: ${simulationId}`);
    });

    // Handle manual patient admission event via WebSocket
    socket.on('patient:add', (patientData: any) => {
      console.log('[Socket.IO] Real-Time Patient Admission Request:', patientData);
      // Event handler will process patient entry
    });

    // Handle simulation start/pause controls via WebSocket
    socket.on('sim:start', () => {
      console.log('[Socket.IO] Real-Time Command: START');
    });

    socket.on('sim:pause', () => {
      console.log('[Socket.IO] Real-Time Command: PAUSE');
    });

    socket.on('disconnect', () => {
      console.log(`[Socket.IO] Client Disconnected: ${socket.id}`);
    });
  });

  console.log('[Socket.IO] Gateway initialized and listening for real-time events.');
  return io;
}

/**
 * Get active Socket.IO server instance.
 */
export function getIO(): SocketIOServer {
  if (!io) {
    throw new Error('Socket.IO Gateway has not been initialized yet!');
  }
  return io;
}

/**
 * Broadcasters for Real-Time Simulation State & Metrics
 */
export function emitSimTick(data: { currentTime: number; eventCount: number }): void {
  if (io) io.emit('sim:tick', data);
}

export function emitPatientArrived(patient: any): void {
  if (io) io.emit('patient:arrived', patient);
}

export function emitPatientAllocated(data: { patientId: string; resourceIds: string[] }): void {
  if (io) io.emit('patient:allocated', data);
}

export function emitResourceStatusChanged(data: {
  resourceId: string;
  newStatus: string;
  patientId?: string;
}): void {
  if (io) io.emit('resource:status_changed', data);
}

export function emitMetricsUpdated(metrics: any): void {
  if (io) io.emit('metrics:updated', metrics);
}
