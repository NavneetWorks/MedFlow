import { io } from 'socket.io-client';
import { app, server } from '../server';
import {
  emitSimTick,
  emitPatientArrived,
  emitResourceStatusChanged,
  emitMetricsUpdated,
} from './socketGateway';

async function runSocketTest() {
  console.log('----------------------------------------------------');
  console.log('[MEDFLOW] Starting Socket.IO Real-Time Gateway Test...');
  console.log('----------------------------------------------------');

  // Wait 1 second for server startup
  await new Promise((resolve) => setTimeout(resolve, 1000));

  const socket = io('http://localhost:5000');

  socket.on('connect', () => {
    console.log(`✅ [STEP 1/4] Socket Client Connected! ID: ${socket.id}`);

    // Subscribe to simulation room
    socket.emit('sim:subscribe', 'sim-1');
    console.log('✅ [STEP 2/4] Emitted sim:subscribe event to server.');

    // Test emitting broadcast events from server to client
    setTimeout(() => {
      console.log('📡 [STEP 3/4] Triggering Server Broadcasts...');
      emitSimTick({ currentTime: 5, eventCount: 1 });
      emitPatientArrived({ id: 'P-101', name: 'Rahul Sharma', status: 'WAITING' });
      emitResourceStatusChanged({ resourceId: 'DOC-001', newStatus: 'BUSY', patientId: 'P-101' });
      emitMetricsUpdated({ avgWaitingTime: 12.5, queueLength: 3 });
    }, 500);
  });

  let eventsReceived = 0;

  socket.on('sim:tick', (data) => {
    console.log('   📩 Received sim:tick broadcast:', data);
    eventsReceived++;
  });

  socket.on('patient:arrived', (patient) => {
    console.log('   📩 Received patient:arrived broadcast:', patient.name);
    eventsReceived++;
  });

  socket.on('resource:status_changed', (res) => {
    console.log(`   📩 Received resource:status_changed broadcast: ${res.resourceId} -> ${res.newStatus}`);
    eventsReceived++;
  });

  socket.on('metrics:updated', (metrics) => {
    console.log('   📩 Received metrics:updated broadcast:', metrics);
    eventsReceived++;

    setTimeout(() => {
      console.log('----------------------------------------------------');
      console.log(`🎉 [STEP 4/4] SOCKET TEST PASSED! Received ${eventsReceived} real-time broadcasts!`);
      console.log('----------------------------------------------------');
      socket.disconnect();
      server.close();
      process.exit(0);
    }, 500);
  });

  socket.on('connect_error', (err) => {
    console.error('❌ Socket Connection Error:', err.message);
    server.close();
    process.exit(1);
  });
}

runSocketTest();
