/**
 * WebSocket Service
 * Handles real-time updates for analytics dashboard
 */
class WebSocketService {
    constructor() {
        this.ws = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 3000;
        this.listeners = new Map();
        this.isConnected = false;
        this.heartbeatInterval = null;
    }

    /**
     * Connect to WebSocket server
     */
    connect(url = null) {
        const wsUrl = url || this.getWebSocketURL();

        try {
            this.ws = new WebSocket(wsUrl);
            this.setupEventHandlers();
        } catch (error) {
            console.error('WebSocket connection error:', error);
            this.scheduleReconnect();
        }
    }

    /**
     * Setup WebSocket event handlers
     */
    setupEventHandlers() {
        this.ws.onopen = () => {
            console.log('WebSocket connected');
            this.isConnected = true;
            this.reconnectAttempts = 0;
            this.startHeartbeat();
            this.emit('connected');
        };

        this.ws.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                this.handleMessage(message);
            } catch (error) {
                console.error('Error parsing WebSocket message:', error);
            }
        };

        this.ws.onerror = (error) => {
            console.error('WebSocket error:', error);
            this.emit('error', error);
        };

        this.ws.onclose = () => {
            console.log('WebSocket disconnected');
            this.isConnected = false;
            this.stopHeartbeat();
            this.emit('disconnected');
            this.scheduleReconnect();
        };
    }

    /**
     * Handle incoming messages
     */
    handleMessage(message) {
        const { type, data } = message;

        switch (type) {
            case 'new_response':
                this.emit('newResponse', data);
                break;

            case 'response_update':
                this.emit('responseUpdate', data);
                break;

            case 'survey_update':
                this.emit('surveyUpdate', data);
                break;

            case 'location_update':
                this.emit('locationUpdate', data);
                break;

            case 'metrics_update':
                this.emit('metricsUpdate', data);
                break;

            case 'pong':
                // Heartbeat response
                break;

            default:
                console.log('Unknown message type:', type);
        }
    }

    /**
     * Subscribe to survey updates
     */
    subscribeSurvey(surveyId) {
        if (!this.isConnected) {
            console.warn('WebSocket not connected. Cannot subscribe.');
            return;
        }

        this.send({
            type: 'subscribe',
            data: { surveyId }
        });
    }

    /**
     * Unsubscribe from survey updates
     */
    unsubscribeSurvey(surveyId) {
        if (!this.isConnected) return;

        this.send({
            type: 'unsubscribe',
            data: { surveyId }
        });
    }

    /**
     * Subscribe to multiple surveys
     */
    subscribeMultiple(surveyIds) {
        if (!this.isConnected) {
            console.warn('WebSocket not connected. Cannot subscribe.');
            return;
        }

        surveyIds.forEach(id => this.subscribeSurvey(id));
    }

    /**
     * Send message to server
     */
    send(message) {
        if (!this.isConnected || !this.ws) {
            console.warn('WebSocket not connected. Cannot send message.');
            return false;
        }

        try {
            this.ws.send(JSON.stringify(message));
            return true;
        } catch (error) {
            console.error('Error sending WebSocket message:', error);
            return false;
        }
    }

    /**
     * Add event listener
     */
    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event).push(callback);
    }

    /**
     * Remove event listener
     */
    off(event, callback) {
        if (!this.listeners.has(event)) return;

        const callbacks = this.listeners.get(event);
        const index = callbacks.indexOf(callback);
        if (index > -1) {
            callbacks.splice(index, 1);
        }
    }

    /**
     * Emit event to listeners
     */
    emit(event, data) {
        if (!this.listeners.has(event)) return;

        const callbacks = this.listeners.get(event);
        callbacks.forEach(callback => {
            try {
                callback(data);
            } catch (error) {
                console.error('Error in event listener:', error);
            }
        });
    }

    /**
     * Start heartbeat to keep connection alive
     */
    startHeartbeat() {
        this.heartbeatInterval = setInterval(() => {
            if (this.isConnected) {
                this.send({ type: 'ping' });
            }
        }, 30000); // 30 seconds
    }

    /**
     * Stop heartbeat
     */
    stopHeartbeat() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
    }

    /**
     * Schedule reconnection attempt
     */
    scheduleReconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error('Max reconnection attempts reached');
            this.emit('maxReconnectAttemptsReached');
            return;
        }

        this.reconnectAttempts++;
        const delay = this.reconnectDelay * this.reconnectAttempts;

        console.log(`Reconnecting in ${delay}ms... (Attempt ${this.reconnectAttempts})`);

        setTimeout(() => {
            this.connect();
        }, delay);
    }

    /**
     * Disconnect WebSocket
     */
    disconnect() {
        if (this.ws) {
            this.stopHeartbeat();
            this.ws.close();
            this.ws = null;
            this.isConnected = false;
        }
    }

    /**
     * Get WebSocket URL based on current location
     */
    getWebSocketURL() {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.host;
        return `${protocol}//${host}/ws`;
    }

    /**
     * Check if connected
     */
    isWebSocketConnected() {
        return this.isConnected && this.ws && this.ws.readyState === WebSocket.OPEN;
    }
}
