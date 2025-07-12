const WebSocket = require('ws');
const EventEmitter = require('events');

class TunnelWebSocket extends EventEmitter {
  constructor(url, options = {}) {
    super();
    this.url = url;
    this.options = options;
    this.ws = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = options.maxReconnectAttempts || 5;
    this.reconnectDelay = options.reconnectDelay || 1000;
    this.isConnected = false;
    this.shouldReconnect = true;
  }

  async connect() {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.url, this.options);

        this.ws.on('open', () => {
          console.log('WebSocket connected to tunnel service');
          this.isConnected = true;
          this.reconnectAttempts = 0;
          this.emit('connected');
          resolve();
        });

        this.ws.on('message', (data) => {
          try {
            const message = JSON.parse(data);
            this.emit('message', message);
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
            this.emit('error', error);
          }
        });

        this.ws.on('close', (code, reason) => {
          console.log(`WebSocket connection closed: ${code} ${reason}`);
          this.isConnected = false;
          this.emit('disconnected', { code, reason });
          
          if (this.shouldReconnect && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.scheduleReconnect();
          }
        });

        this.ws.on('error', (error) => {
          console.error('WebSocket error:', error);
          this.emit('error', error);
          if (!this.isConnected) {
            reject(error);
          }
        });

        this.ws.on('ping', () => {
          this.ws.pong();
        });

      } catch (error) {
        reject(error);
      }
    });
  }

  scheduleReconnect() {
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts);
    console.log(`Scheduling WebSocket reconnect in ${delay}ms (attempt ${this.reconnectAttempts + 1}/${this.maxReconnectAttempts})`);
    
    setTimeout(() => {
      if (this.shouldReconnect) {
        this.reconnectAttempts++;
        this.connect().catch((error) => {
          console.error('WebSocket reconnect failed:', error);
          if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error('Max reconnect attempts reached');
            this.emit('max-reconnect-attempts-reached');
          }
        });
      }
    }, delay);
  }

  send(message) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
      return true;
    }
    return false;
  }

  ping() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.ping();
      return true;
    }
    return false;
  }

  close() {
    this.shouldReconnect = false;
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isConnected = false;
  }

  getReadyState() {
    return this.ws ? this.ws.readyState : WebSocket.CLOSED;
  }

  getConnectionState() {
    return {
      isConnected: this.isConnected,
      readyState: this.getReadyState(),
      reconnectAttempts: this.reconnectAttempts,
      maxReconnectAttempts: this.maxReconnectAttempts
    };
  }
}

module.exports = TunnelWebSocket;
