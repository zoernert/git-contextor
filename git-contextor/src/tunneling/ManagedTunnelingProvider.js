const WebSocket = require('ws');
const EventEmitter = require('events');

class ManagedTunnelingProvider extends EventEmitter {
  constructor(config) {
    super();
    this.config = config;
    this.tunnelId = null;
    this.tunnelUrl = null;
    this.status = 'stopped';
    this.websocket = null;
    this.proxy = null;
  }

  async createTunnel(options = {}) {
    if (this.status !== 'stopped') {
      throw new Error(`Tunnel is already active with status: ${this.status}`);
    }

    this.status = 'starting';

    try {
      const response = await fetch(`${this.config.apiUrl}/api/tunnels`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          localPort: options.localPort || 3333,
          subdomain: this.config.subdomain || options.subdomain,
          gitContextorShare: this.config.gitContextorShare || true,
          description: options.description || 'Git Contextor Share'
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Tunnel creation failed: ${response.status} ${response.statusText} - ${errorData.message || 'Unknown error'}`);
      }

      const tunnelData = await response.json();
      
      this.tunnelId = tunnelData._id;
      this.tunnelUrl = tunnelData.url;
      this.status = 'running';

      // Start WebSocket connection for real-time communication
      await this.startWebSocketConnection(tunnelData);

      this.emit('tunnel-created', {
        id: this.tunnelId,
        url: this.tunnelUrl,
        status: this.status
      });

      return {
        id: this.tunnelId,
        url: this.tunnelUrl,
        status: this.status
      };

    } catch (error) {
      this.status = 'error';
      this.emit('tunnel-error', error);
      throw error;
    }
  }

  async startWebSocketConnection(tunnelData) {
    const wsUrl = `${this.config.apiUrl.replace('https://', 'wss://').replace('http://', 'ws://')}/ws/tunnel/${this.tunnelId}`;
    
    this.websocket = new WebSocket(wsUrl, {
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`
      }
    });

    this.websocket.on('open', () => {
      console.log('WebSocket connection established for tunnel');
      this.emit('websocket-connected');
    });

    this.websocket.on('message', (data) => {
      try {
        const message = JSON.parse(data);
        this.handleWebSocketMessage(message);
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    });

    this.websocket.on('close', (code, reason) => {
      console.log(`WebSocket connection closed: ${code} ${reason}`);
      this.emit('websocket-disconnected', { code, reason });
      
      // Attempt to reconnect if the tunnel is still supposed to be running
      if (this.status === 'running') {
        setTimeout(() => this.reconnectWebSocket(), 5000);
      }
    });

    this.websocket.on('error', (error) => {
      console.error('WebSocket error:', error);
      this.emit('websocket-error', error);
    });
  }

  async reconnectWebSocket() {
    if (this.status !== 'running' || this.websocket?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      await this.startWebSocketConnection({ _id: this.tunnelId });
    } catch (error) {
      console.error('Failed to reconnect WebSocket:', error);
      setTimeout(() => this.reconnectWebSocket(), 10000);
    }
  }

  handleWebSocketMessage(message) {
    switch (message.type) {
      case 'tunnel-request':
        this.handleTunnelRequest(message.data);
        break;
      case 'tunnel-status':
        this.handleTunnelStatus(message.data);
        break;
      case 'ping':
        this.sendWebSocketMessage({ type: 'pong' });
        break;
      default:
        console.log('Unknown WebSocket message type:', message.type);
    }
  }

  async handleTunnelRequest(requestData) {
    try {
      // Forward the request to the local Git Contextor instance
      const response = await fetch(`http://localhost:${requestData.localPort}${requestData.path}`, {
        method: requestData.method,
        headers: requestData.headers,
        body: requestData.body
      });

      const responseData = {
        requestId: requestData.requestId,
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        body: await response.text()
      };

      this.sendWebSocketMessage({
        type: 'tunnel-response',
        data: responseData
      });

    } catch (error) {
      console.error('Error handling tunnel request:', error);
      this.sendWebSocketMessage({
        type: 'tunnel-response',
        data: {
          requestId: requestData.requestId,
          status: 500,
          statusText: 'Internal Server Error',
          headers: {},
          body: JSON.stringify({ error: 'Failed to process request' })
        }
      });
    }
  }

  handleTunnelStatus(statusData) {
    if (statusData.status === 'disconnected') {
      this.status = 'error';
      this.emit('tunnel-disconnected', statusData);
    }
  }

  sendWebSocketMessage(message) {
    if (this.websocket?.readyState === WebSocket.OPEN) {
      this.websocket.send(JSON.stringify(message));
    }
  }

  async deleteTunnel() {
    if (!this.tunnelId) {
      return;
    }

    try {
      await fetch(`${this.config.apiUrl}/api/tunnels/${this.tunnelId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`
        }
      });
    } catch (error) {
      console.error('Error deleting tunnel:', error);
    }
  }

  async stopTunnel() {
    this.status = 'stopping';

    // Close WebSocket connection
    if (this.websocket) {
      this.websocket.close();
      this.websocket = null;
    }

    // Delete tunnel from service
    await this.deleteTunnel();

    // Reset state
    this.tunnelId = null;
    this.tunnelUrl = null;
    this.status = 'stopped';

    this.emit('tunnel-stopped');
  }

  getTunnelStatus() {
    return {
      status: this.status,
      url: this.tunnelUrl,
      service: 'managed',
      id: this.tunnelId
    };
  }

  isRunning() {
    return this.status === 'running';
  }
}

module.exports = ManagedTunnelingProvider;
