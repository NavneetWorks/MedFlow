import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { SimulationEngine } from '../simulation/SimulationEngine';

let io: SocketIOServer | null = null;
let globalEngine: SimulationEngine | null = null;

export function setGlobalSimulationEngine(engine: SimulationEngine): void {
  globalEngine = engine;

  // Wire Engine Callbacks to Socket IO Emissions
  globalEngine.setOnCycleCallback((summary, fullQueuesState, activeTreatments, completedTreatments) => {
    if (!io || !globalEngine) return;

    // Broadcast Tick & Allocation Summary
    io.emit('sim:tick', {
      simTimeMinutes: summary.simTimeMinutes,
      waitingCount: summary.totalWaitingPatients,
      allocatedCount: summary.successfulAllocations.length,
    });

    // Broadcast Live Department Queues
    io.emit('queue:updated', fullQueuesState);

    // Broadcast Live RAM Active Treatments & Completed Treatments
    io.emit('sim:active_treatments', activeTreatments);
    io.emit('sim:completed_treatments', completedTreatments);

    // Broadcast Live Resource Inventory Counts & Detailed State
    io.emit('resources:status', globalEngine.resourceManager.getAvailableCounts());
    io.emit('resources:detailed', globalEngine.resourceManager.getDetailedInventoryState());

    // Broadcast Individual Allocations
    for (const alloc of summary.successfulAllocations) {
      io.emit('patient:allocated', alloc);
    }
  });
}

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

    // Send initial full state on connection
    if (globalEngine) {
      const currentSimTime = globalEngine.clock.getTime();
      socket.emit('queue:updated', globalEngine.queueManager.getAllDepartmentQueuesFull(currentSimTime));
      socket.emit('resources:status', globalEngine.resourceManager.getAvailableCounts());
      socket.emit('resources:detailed', globalEngine.resourceManager.getDetailedInventoryState());
    }

    // Client subscribes to live simulation stream
    socket.on('sim:subscribe', (simulationId: string) => {
      socket.join(simulationId || 'sim-default');
      console.log(`[Socket.IO] Client ${socket.id} subscribed to simulation: ${simulationId}`);
    });

    // Frontend can explicitly request full state on component mount
    socket.on('request_initial_state', () => {
      if (globalEngine) {
        const currentSimTime = globalEngine.clock.getTime();
        socket.emit('queue:updated', globalEngine.queueManager.getAllDepartmentQueuesFull(currentSimTime));
        socket.emit('resources:status', globalEngine.resourceManager.getAvailableCounts());
        socket.emit('resources:detailed', globalEngine.resourceManager.getDetailedInventoryState());
      }
    });

    // 1. Handle Resource Configuration Update Event from Frontend Setup Page
    socket.on('resources:configure', (configList: any[]) => {
      console.log('[Socket.IO] Received Resource Inventory Config Update:', configList);
      if (!globalEngine) {
        socket.emit('resources:configure_response', { success: false, error: 'Engine not ready' });
        return;
      }

      globalEngine.resourceManager.updateInventoryConfig(configList);

      const updatedCounts = globalEngine.resourceManager.getAvailableCounts();
      const detailedState = globalEngine.resourceManager.getDetailedInventoryState();

      // Broadcast updated resource state to ALL clients
      io?.emit('resources:status', updatedCounts);
      io?.emit('resources:detailed', detailedState);
      socket.emit('resources:configure_response', { success: true, counts: updatedCounts });
    });

    // 2. Handle real-time patient admission event via WebSocket
    socket.on('patient:add', async (patientData: any) => {
      console.log('[Socket.IO] Real-Time Patient Admission Request:', patientData?.name || patientData);
      if (!globalEngine) {
        socket.emit('patient:rejected', { errors: ['Simulation Engine not initialized'] });
        return;
      }

      const result = await globalEngine.addPatient(patientData);

      if (result.success && result.patient) {
        const currentSimTime = globalEngine.clock.getTime();
        socket.emit('patient:accepted', { success: true, patient: result.patient });
        io?.emit('patient:arrived', result.patient);
        io?.emit('queue:updated', globalEngine.queueManager.getAllDepartmentQueuesFull(currentSimTime));
        io?.emit('resources:status', globalEngine.resourceManager.getAvailableCounts());
        io?.emit('resources:detailed', globalEngine.resourceManager.getDetailedInventoryState());
      } else {
        socket.emit('patient:rejected', { success: false, errors: result.errors });
      }
    });

    // 3. Handle bulk patient scheduling from Frontend setup
    socket.on('patients:schedule', async (patientsArray: any[]) => {
      console.log(`[Socket.IO] Received ${patientsArray?.length || 0} staged patients for scheduling.`);
      if (!globalEngine) {
        socket.emit('patients:schedule_response', { success: false, error: 'Engine not initialized' });
        return;
      }
      
      await globalEngine.schedulePatients(patientsArray);
      socket.emit('patients:schedule_response', { success: true });
      
      // Auto-broadcast updated history to everyone AFTER db saves
      try {
        const history = await globalEngine.repository.getAllActivePatientsFromDb();
        io?.emit('patients:history_response', history);
      } catch (err) {
        console.error(err);
      }
    });

    // 3.5 Handle explicit history fetch requests
    socket.on('patients:history_request', async () => {
      if (!globalEngine) return;
      try {
        const history = await globalEngine.repository.getAllActivePatientsFromDb();
        socket.emit('patients:history_response', history);
      } catch (err) {
        console.error('[Socket.IO] Error fetching history:', err);
      }
    });

    // 4. Handle simulation start/pause/speed controls via WebSocket
    socket.on('sim:start', async () => {
      console.log('[Socket.IO] Command: START SIMULATION');
      if (globalEngine) {
        try {
          const activePatients = await globalEngine.repository.getAllActivePatientsFromDb();
          const unqueued = activePatients.filter(p => p.status === 'REGISTERED' || p.status === 'WAITING');
          if (unqueued.length > 0) {
            await globalEngine.schedulePatients(unqueued);
          }
        } catch (err) {
          console.warn('[Socket.IO] Warning loading DB patients on start:', err);
        }
        globalEngine.startSimulation();
      }
      io?.emit('sim:state_changed', { isRunning: true });
    });

    socket.on('sim:pause', () => {
      console.log('[Socket.IO] Command: PAUSE SIMULATION');
      globalEngine?.pauseSimulation();
      io?.emit('sim:state_changed', { isRunning: false });
    });

    socket.on('sim:reset', () => {
      console.log('[Socket.IO] Command: RESET SIMULATION');
      if (globalEngine) {
        globalEngine.resetSimulation();
      }
      io?.emit('sim:state_changed', { isRunning: false });
      io?.emit('sim:tick', { simTimeMinutes: 0, waitingCount: 0, allocatedCount: 0 });
      if (globalEngine) {
        io?.emit('queue:updated', globalEngine.queueManager.getAllDepartmentQueuesFull(0));
        io?.emit('sim:active_treatments', []);
        io?.emit('sim:completed_treatments', []);
        io?.emit('resources:status', globalEngine.resourceManager.getAvailableCounts());
        io?.emit('resources:detailed', globalEngine.resourceManager.getDetailedInventoryState());
      }
    });

    socket.on('sim:speed', (ratio: number) => {
      console.log(`[Socket.IO] Command: SET SPEED RATIO x${ratio}`);
      globalEngine?.setSpeed(ratio);
      io?.emit('sim:speed_changed', { ratio });
    });

    socket.on('disconnect', () => {
      console.log(`[Socket.IO] Client Disconnected: ${socket.id}`);
    });
  });

  console.log('[Socket.IO] Gateway initialized and listening for real-time events.');
  return io;
}

export function getIO(): SocketIOServer {
  if (!io) {
    throw new Error('Socket.IO Gateway has not been initialized yet!');
  }
  return io;
}

/**
 * Broadcasters for Real-Time Simulation State & Metrics
 */
export function emitSimTick(data: { currentTime?: number; simTimeMinutes?: number; waitingCount?: number; allocatedCount?: number }): void {
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
