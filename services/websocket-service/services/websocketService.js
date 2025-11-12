const { Server } = require('socket.io');
const logger = require('../config/logger');
const { socketAuth } = require('../middleware/auth');
const { connectionRateLimit, messageRateLimit } = require('../middleware/rateLimiter');
const connectionManager = require('../utils/connectionManager');
const RoomManager = require('../utils/roomManager');

class WebSocketService {
  constructor() {
    this.io = null;
    this.heartbeatInterval = parseInt(process.env.HEARTBEAT_INTERVAL) || 30000;
    this.connectionTimeout = parseInt(process.env.CONNECTION_TIMEOUT) || 60000;
  }

  /**
   * Initialize Socket.io server
   */
  initialize(httpServer) {
    const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000').split(',');

    this.io = new Server(httpServer, {
      cors: {
        origin: allowedOrigins,
        methods: ['GET', 'POST'],
        credentials: true
      },
      pingInterval: this.heartbeatInterval,
      pingTimeout: this.connectionTimeout,
      transports: ['websocket', 'polling']
    });

    // Apply middleware
    this.io.use(socketAuth);
    this.io.use(connectionRateLimit);

    // Setup event handlers
    this.setupEventHandlers();

    // Start cleanup interval
    this.startCleanupInterval();

    logger.info('WebSocket service initialized');
    return this.io;
  }

  /**
   * Setup Socket.io event handlers
   */
  setupEventHandlers() {
    this.io.on('connection', (socket) => {
      this.handleConnection(socket);

      // Room management
      socket.on('join_room', (data) => this.handleJoinRoom(socket, data));
      socket.on('leave_room', (data) => this.handleLeaveRoom(socket, data));

      // Heartbeat/ping
      socket.on('ping', () => this.handlePing(socket));

      // Get room info
      socket.on('get_rooms', () => this.handleGetRooms(socket));

      // Disconnection
      socket.on('disconnect', (reason) => this.handleDisconnect(socket, reason));

      // Error handling
      socket.on('error', (error) => this.handleError(socket, error));
    });
  }

  /**
   * Handle new connection
   */
  handleConnection(socket) {
    logger.info(`New connection: ${socket.id} (User: ${socket.user.id})`);

    // Add to connection manager
    connectionManager.addConnection(socket);

    // Auto-join rooms
    const autoJoinRooms = RoomManager.getAutoJoinRooms(socket);
    autoJoinRooms.forEach(room => {
      socket.join(room);
      connectionManager.joinRoom(socket.id, room);
      logger.info(`Socket ${socket.id} auto-joined room: ${room}`);
    });

    // Send welcome message
    socket.emit('connected', {
      socketId: socket.id,
      userId: socket.user.id,
      isAnonymous: socket.user.isAnonymous,
      rooms: autoJoinRooms,
      serverTime: new Date()
    });

    // Broadcast to global room
    socket.to('global').emit('user_connected', {
      userId: socket.user.id,
      timestamp: new Date()
    });
  }

  /**
   * Handle join room request
   */
  async handleJoinRoom(socket, data) {
    // Rate limiting
    if (!await messageRateLimit(socket, 'join_room')) {
      return;
    }

    const { room } = data;

    if (!room) {
      socket.emit('error', { message: 'Room name is required' });
      return;
    }

    // Validate room format
    if (!RoomManager.isValidRoom(room)) {
      socket.emit('error', { message: 'Invalid room format' });
      return;
    }

    // Check permissions
    if (!RoomManager.canJoinRoom(socket, room)) {
      socket.emit('error', { message: 'Permission denied to join room' });
      return;
    }

    // Join room
    socket.join(room);
    connectionManager.joinRoom(socket.id, room);

    logger.info(`Socket ${socket.id} joined room: ${room}`);

    // Notify client
    socket.emit('room_joined', {
      room,
      timestamp: new Date()
    });

    // Notify others in the room
    socket.to(room).emit('user_joined_room', {
      userId: socket.user.id,
      room,
      timestamp: new Date()
    });
  }

  /**
   * Handle leave room request
   */
  async handleLeaveRoom(socket, data) {
    // Rate limiting
    if (!await messageRateLimit(socket, 'leave_room')) {
      return;
    }

    const { room } = data;

    if (!room) {
      socket.emit('error', { message: 'Room name is required' });
      return;
    }

    // Leave room
    socket.leave(room);
    connectionManager.leaveRoom(socket.id, room);

    logger.info(`Socket ${socket.id} left room: ${room}`);

    // Notify client
    socket.emit('room_left', {
      room,
      timestamp: new Date()
    });

    // Notify others in the room
    socket.to(room).emit('user_left_room', {
      userId: socket.user.id,
      room,
      timestamp: new Date()
    });
  }

  /**
   * Handle ping/heartbeat
   */
  async handlePing(socket) {
    connectionManager.updateActivity(socket.id);
    socket.emit('pong', { timestamp: new Date() });
  }

  /**
   * Handle get rooms request
   */
  async handleGetRooms(socket) {
    const connection = connectionManager.getConnection(socket.id);
    if (!connection) {
      socket.emit('error', { message: 'Connection not found' });
      return;
    }

    const rooms = Array.from(connection.rooms);
    socket.emit('rooms_list', {
      rooms: rooms.map(room => RoomManager.formatRoomInfo(room,
        connectionManager.getRoomSockets(room).length
      )),
      timestamp: new Date()
    });
  }

  /**
   * Handle disconnection
   */
  handleDisconnect(socket, reason) {
    logger.info(`Disconnection: ${socket.id} (Reason: ${reason})`);

    // Notify others
    socket.to('global').emit('user_disconnected', {
      userId: socket.user.id,
      timestamp: new Date()
    });

    // Remove from connection manager
    connectionManager.removeConnection(socket.id);
  }

  /**
   * Handle errors
   */
  handleError(socket, error) {
    logger.error(`Socket error (${socket.id}):`, error);
  }

  /**
   * Broadcast message to room
   */
  broadcastToRoom(roomName, eventName, data) {
    if (!this.io) {
      logger.warn('Cannot broadcast: WebSocket service not initialized');
      return;
    }

    const socketIds = connectionManager.getRoomSockets(roomName);
    logger.debug(`Broadcasting ${eventName} to room ${roomName} (${socketIds.length} sockets)`);

    this.io.to(roomName).emit(eventName, {
      ...data,
      timestamp: new Date()
    });
  }

  /**
   * Broadcast to specific user
   */
  broadcastToUser(userId, eventName, data) {
    if (!this.io) {
      logger.warn('Cannot broadcast: WebSocket service not initialized');
      return;
    }

    const socketIds = connectionManager.getUserSockets(userId);
    logger.debug(`Broadcasting ${eventName} to user ${userId} (${socketIds.length} sockets)`);

    socketIds.forEach(socketId => {
      this.io.to(socketId).emit(eventName, {
        ...data,
        timestamp: new Date()
      });
    });
  }

  /**
   * Broadcast to all connected clients
   */
  broadcastGlobal(eventName, data) {
    this.broadcastToRoom('global', eventName, data);
  }

  /**
   * Get service statistics
   */
  getStats() {
    return connectionManager.getStats();
  }

  /**
   * Start cleanup interval for stale connections
   */
  startCleanupInterval() {
    setInterval(() => {
      const cleaned = connectionManager.cleanupStaleConnections(this.connectionTimeout);
      if (cleaned > 0) {
        logger.info(`Cleaned up ${cleaned} stale connections`);
      }
    }, 60000); // Run every minute
  }

  /**
   * Shutdown gracefully
   */
  async shutdown() {
    if (this.io) {
      // Notify all clients
      this.broadcastGlobal('server_shutdown', {
        message: 'Server is shutting down'
      });

      // Close all connections
      this.io.close();
      logger.info('WebSocket service shutdown');
    }
  }
}

module.exports = new WebSocketService();
