import { io } from 'socket.io-client';

const SOCKET_URL = 'http://localhost:5000';

// Initialize the single socket instance
// autoConnect is true by default, meaning it will attempt to connect immediately when imported
const socket = io(SOCKET_URL, {
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  autoConnect: true,
});

// Basic Connection Logging (Do not add specific MedFlow logic here yet)
socket.on('connect', () => {
  console.log(`🔌 [Socket.IO] Connected successfully with ID: ${socket.id}`);
});

socket.on('disconnect', (reason) => {
  console.warn(`⚠️ [Socket.IO] Disconnected. Reason: ${reason}`);
});

socket.on('connect_error', (error) => {
  console.error(`❌ [Socket.IO] Connection Error:`, error.message);
});

// Export the singleton socket instance
export default socket;
