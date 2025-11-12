const logger = require('../config/logger');

class ConnectionManager {
  constructor() {
    this.connections = new Map(); // socket.id -> connection info
    this.rooms = new Map(); // room name -> Set of socket.ids
    this.userSockets = new Map(); // userId -> Set of socket.ids
  }

  /**
   * Add a new connection
   */
  addConnection(socket) {
    const connectionInfo = {
      socketId: socket.id,
      userId: socket.user.id,
      isAnonymous: socket.user.isAnonymous,
      connectedAt: new Date(),
      lastActivity: new Date(),
      rooms: new Set(),
      metadata: {
        ip: socket.handshake.address,
        userAgent: socket.handshake.headers['user-agent']
      }
    };

    this.connections.set(socket.id, connectionInfo);

    // Track user sockets
    if (!this.userSockets.has(socket.user.id)) {
      this.userSockets.set(socket.user.id, new Set());
    }
    this.userSockets.get(socket.user.id).add(socket.id);

    logger.info(`Connection added: ${socket.id} (User: ${socket.user.id})`);
    return connectionInfo;
  }

  /**
   * Remove a connection
   */
  removeConnection(socketId) {
    const connection = this.connections.get(socketId);
    if (!connection) return;

    // Remove from user sockets
    const userSockets = this.userSockets.get(connection.userId);
    if (userSockets) {
      userSockets.delete(socketId);
      if (userSockets.size === 0) {
        this.userSockets.delete(connection.userId);
      }
    }

    // Remove from rooms
    connection.rooms.forEach(room => {
      this.leaveRoom(socketId, room);
    });

    this.connections.delete(socketId);
    logger.info(`Connection removed: ${socketId} (User: ${connection.userId})`);
  }

  /**
   * Update last activity timestamp
   */
  updateActivity(socketId) {
    const connection = this.connections.get(socketId);
    if (connection) {
      connection.lastActivity = new Date();
    }
  }

  /**
   * Join a room
   */
  joinRoom(socketId, roomName) {
    const connection = this.connections.get(socketId);
    if (!connection) return false;

    // Add socket to room
    if (!this.rooms.has(roomName)) {
      this.rooms.set(roomName, new Set());
    }
    this.rooms.get(roomName).add(socketId);

    // Add room to connection
    connection.rooms.add(roomName);

    logger.debug(`Socket ${socketId} joined room: ${roomName}`);
    return true;
  }

  /**
   * Leave a room
   */
  leaveRoom(socketId, roomName) {
    const connection = this.connections.get(socketId);
    if (connection) {
      connection.rooms.delete(roomName);
    }

    const room = this.rooms.get(roomName);
    if (room) {
      room.delete(socketId);
      if (room.size === 0) {
        this.rooms.delete(roomName);
      }
    }

    logger.debug(`Socket ${socketId} left room: ${roomName}`);
  }

  /**
   * Get all sockets in a room
   */
  getRoomSockets(roomName) {
    return Array.from(this.rooms.get(roomName) || []);
  }

  /**
   * Get all sockets for a user
   */
  getUserSockets(userId) {
    return Array.from(this.userSockets.get(userId) || []);
  }

  /**
   * Get connection info
   */
  getConnection(socketId) {
    return this.connections.get(socketId);
  }

  /**
   * Get all connections
   */
  getAllConnections() {
    return Array.from(this.connections.values());
  }

  /**
   * Get statistics
   */
  getStats() {
    return {
      totalConnections: this.connections.size,
      authenticatedConnections: Array.from(this.connections.values()).filter(c => !c.isAnonymous).length,
      anonymousConnections: Array.from(this.connections.values()).filter(c => c.isAnonymous).length,
      totalRooms: this.rooms.size,
      uniqueUsers: this.userSockets.size,
      roomStats: Array.from(this.rooms.entries()).map(([name, sockets]) => ({
        name,
        connections: sockets.size
      }))
    };
  }

  /**
   * Clean up stale connections
   */
  cleanupStaleConnections(timeoutMs = 300000) { // 5 minutes default
    const now = Date.now();
    const staleConnections = [];

    this.connections.forEach((connection, socketId) => {
      if (now - connection.lastActivity.getTime() > timeoutMs) {
        staleConnections.push(socketId);
      }
    });

    staleConnections.forEach(socketId => {
      logger.warn(`Cleaning up stale connection: ${socketId}`);
      this.removeConnection(socketId);
    });

    return staleConnections.length;
  }
}

module.exports = new ConnectionManager();
