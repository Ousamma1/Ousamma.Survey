/**
 * WebSocket Client Library for Survey System
 * Handles real-time connections using Socket.io
 */

class WebSocketClient {
  constructor(options = {}) {
    this.url = options.url || 'http://localhost:3002';
    this.token = options.token || null;
    this.autoReconnect = options.autoReconnect !== false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = options.maxReconnectAttempts || 5;
    this.reconnectDelay = options.reconnectDelay || 1000;

    this.socket = null;
    this.isConnected = false;
    this.eventHandlers = new Map();
    this.joinedRooms = new Set();

    // Toast notification settings
    this.enableToasts = options.enableToasts !== false;
    this.toastContainer = null;

    // Initialize toast container if enabled
    if (this.enableToasts) {
      this.initializeToastContainer();
    }
  }

  /**
   * Initialize toast notification container
   */
  initializeToastContainer() {
    if (document.getElementById('ws-toast-container')) {
      this.toastContainer = document.getElementById('ws-toast-container');
      return;
    }

    this.toastContainer = document.createElement('div');
    this.toastContainer.id = 'ws-toast-container';
    this.toastContainer.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 10000;
      max-width: 400px;
    `;
    document.body.appendChild(this.toastContainer);
  }

  /**
   * Show toast notification
   */
  showToast(message, type = 'info', duration = 5000) {
    if (!this.enableToasts || !this.toastContainer) return;

    const toast = document.createElement('div');
    toast.className = `ws-toast ws-toast-${type}`;

    const colors = {
      info: '#3498db',
      success: '#2ecc71',
      warning: '#f39c12',
      error: '#e74c3c'
    };

    toast.style.cssText = `
      background: ${colors[type] || colors.info};
      color: white;
      padding: 15px 20px;
      margin-bottom: 10px;
      border-radius: 5px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.2);
      animation: slideIn 0.3s ease-out;
      cursor: pointer;
    `;

    toast.textContent = message;

    // Click to dismiss
    toast.addEventListener('click', () => {
      toast.style.animation = 'slideOut 0.3s ease-out';
      setTimeout(() => toast.remove(), 300);
    });

    this.toastContainer.appendChild(toast);

    // Auto dismiss
    if (duration > 0) {
      setTimeout(() => {
        if (toast.parentNode) {
          toast.style.animation = 'slideOut 0.3s ease-out';
          setTimeout(() => toast.remove(), 300);
        }
      }, duration);
    }
  }

  /**
   * Connect to WebSocket server
   */
  connect() {
    return new Promise((resolve, reject) => {
      try {
        // Load Socket.io library if not already loaded
        if (typeof io === 'undefined') {
          const script = document.createElement('script');
          script.src = 'https://cdn.socket.io/4.7.2/socket.io.min.js';
          script.onload = () => this._doConnect(resolve, reject);
          script.onerror = () => reject(new Error('Failed to load Socket.io library'));
          document.head.appendChild(script);
        } else {
          this._doConnect(resolve, reject);
        }
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Internal connect method
   */
  _doConnect(resolve, reject) {
    const options = {
      transports: ['websocket', 'polling'],
      reconnection: this.autoReconnect,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: this.reconnectDelay
    };

    if (this.token) {
      options.auth = { token: this.token };
    }

    this.socket = io(this.url, options);

    // Connection events
    this.socket.on('connect', () => {
      this.isConnected = true;
      this.reconnectAttempts = 0;
      console.log('[WebSocket] Connected:', this.socket.id);
      this.showToast('Connected to real-time updates', 'success', 3000);
      resolve(this.socket);
    });

    this.socket.on('connected', (data) => {
      console.log('[WebSocket] Connection confirmed:', data);
      this._trigger('connected', data);
    });

    this.socket.on('disconnect', (reason) => {
      this.isConnected = false;
      console.log('[WebSocket] Disconnected:', reason);
      this.showToast('Disconnected from real-time updates', 'warning', 3000);
      this._trigger('disconnected', { reason });
    });

    this.socket.on('connect_error', (error) => {
      console.error('[WebSocket] Connection error:', error);
      this.reconnectAttempts++;

      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        this.showToast('Failed to connect to real-time updates', 'error', 5000);
        reject(error);
      }
    });

    // Server messages
    this.socket.on('error', (data) => {
      console.error('[WebSocket] Error:', data);
      this.showToast(data.message || 'WebSocket error', 'error', 5000);
      this._trigger('error', data);
    });

    this.socket.on('rate_limit_exceeded', (data) => {
      console.warn('[WebSocket] Rate limit exceeded:', data);
      this.showToast('Too many requests. Please slow down.', 'warning', 5000);
      this._trigger('rate_limit_exceeded', data);
    });

    this.socket.on('server_shutdown', (data) => {
      console.warn('[WebSocket] Server shutting down:', data);
      this.showToast('Server is restarting...', 'warning', 5000);
      this._trigger('server_shutdown', data);
    });

    // Room events
    this.socket.on('room_joined', (data) => {
      console.log('[WebSocket] Joined room:', data.room);
      this.joinedRooms.add(data.room);
      this._trigger('room_joined', data);
    });

    this.socket.on('room_left', (data) => {
      console.log('[WebSocket] Left room:', data.room);
      this.joinedRooms.delete(data.room);
      this._trigger('room_left', data);
    });

    // Heartbeat
    this.socket.on('pong', (data) => {
      this._trigger('pong', data);
    });

    // Real-time event handlers
    this._setupEventHandlers();
  }

  /**
   * Setup real-time event handlers
   */
  _setupEventHandlers() {
    // Survey response events
    this.socket.on('response.new', (data) => {
      console.log('[WebSocket] New response:', data);
      this.showToast(`New survey response received`, 'info', 4000);
      this._trigger('response.new', data);
    });

    // Analytics events
    this.socket.on('analytics.update', (data) => {
      console.log('[WebSocket] Analytics update:', data);
      this._trigger('analytics.update', data);
    });

    // Location events
    this.socket.on('surveyor.location', (data) => {
      console.log('[WebSocket] Surveyor location update:', data);
      this._trigger('surveyor.location', data);
    });

    // Notification events
    this.socket.on('notification', (data) => {
      console.log('[WebSocket] Notification:', data);

      const type = data.priority === 'high' ? 'warning' : 'info';
      this.showToast(data.message || data.title, type, 5000);

      this._trigger('notification', data);
    });

    // User events
    this.socket.on('user_connected', (data) => {
      this._trigger('user_connected', data);
    });

    this.socket.on('user_disconnected', (data) => {
      this._trigger('user_disconnected', data);
    });
  }

  /**
   * Join a room
   */
  joinRoom(room) {
    if (!this.isConnected) {
      console.warn('[WebSocket] Not connected. Cannot join room:', room);
      return false;
    }

    this.socket.emit('join_room', { room });
    return true;
  }

  /**
   * Leave a room
   */
  leaveRoom(room) {
    if (!this.isConnected) {
      console.warn('[WebSocket] Not connected. Cannot leave room:', room);
      return false;
    }

    this.socket.emit('leave_room', { room });
    return true;
  }

  /**
   * Join survey room
   */
  joinSurvey(surveyId) {
    return this.joinRoom(`survey:${surveyId}`);
  }

  /**
   * Join project room
   */
  joinProject(projectId) {
    return this.joinRoom(`project:${projectId}`);
  }

  /**
   * Join user room (auto-joined if authenticated)
   */
  joinUser(userId) {
    return this.joinRoom(`user:${userId}`);
  }

  /**
   * Send ping
   */
  ping() {
    if (this.isConnected) {
      this.socket.emit('ping');
    }
  }

  /**
   * Get joined rooms
   */
  getRooms() {
    if (this.isConnected) {
      this.socket.emit('get_rooms');
    }
  }

  /**
   * Register event handler
   */
  on(event, handler) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event).push(handler);
  }

  /**
   * Unregister event handler
   */
  off(event, handler) {
    if (!this.eventHandlers.has(event)) return;

    const handlers = this.eventHandlers.get(event);
    const index = handlers.indexOf(handler);
    if (index > -1) {
      handlers.splice(index, 1);
    }
  }

  /**
   * Trigger event handlers
   */
  _trigger(event, data) {
    if (!this.eventHandlers.has(event)) return;

    this.eventHandlers.get(event).forEach(handler => {
      try {
        handler(data);
      } catch (error) {
        console.error(`[WebSocket] Error in event handler for ${event}:`, error);
      }
    });
  }

  /**
   * Disconnect
   */
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      this.joinedRooms.clear();
    }
  }

  /**
   * Get connection status
   */
  getStatus() {
    return {
      connected: this.isConnected,
      socketId: this.socket?.id,
      rooms: Array.from(this.joinedRooms),
      reconnectAttempts: this.reconnectAttempts
    };
  }
}

// Add CSS animations for toasts
if (!document.getElementById('ws-toast-styles')) {
  const style = document.createElement('style');
  style.id = 'ws-toast-styles';
  style.textContent = `
    @keyframes slideIn {
      from {
        transform: translateX(400px);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }

    @keyframes slideOut {
      from {
        transform: translateX(0);
        opacity: 1;
      }
      to {
        transform: translateX(400px);
        opacity: 0;
      }
    }
  `;
  document.head.appendChild(style);
}

// Export for use in other scripts
window.WebSocketClient = WebSocketClient;
