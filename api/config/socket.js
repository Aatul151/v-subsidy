/**
 * Shared Socket.IO instance for use across the app (services, controllers).
 * Set by server.js on startup; use getSocketIO() in notification service etc.
 */

let io = null;

/**
 * Set the Socket.IO server instance (called from server.js).
 * @param {import('socket.io').Server} socketIoInstance
 */
export function setSocketIO(socketIoInstance) {
  io = socketIoInstance;
}

/**
 * Get the Socket.IO server instance.
 * @returns {import('socket.io').Server | null}
 */
export function getSocketIO() {
  return io;
}
