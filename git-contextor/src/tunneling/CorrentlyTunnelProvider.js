const { spawn } = require('child_process');
const EventEmitter = require('events');
const path = require('path');

class CorrentlyTunnelProvider extends EventEmitter {
  constructor(config) {
    super();
    this.config = config;
    this.tunnelId = null;
    this.tunnelUrl = null;
    this.status = 'stopped';
    this.tunnelClient = null;
    this.tunnel = null;
    this.serverUrl = config.serverUrl || 'https://tunnel.corrently.cloud';
    this.apiKey = config.apiKey;
  }

  async createTunnel(options = {}) {
    if (this.status !== 'stopped') {
      throw new Error(`Tunnel is already active with status: ${this.status}`);
    }

    if (!this.apiKey) {
      throw new Error('API key is required for tunnel.corrently.cloud service');
    }

    this.status = 'starting';

    try {
      // Generate unique tunnel path
      const tunnelPath = options.tunnelPath || `git-contextor-${Date.now()}`;
      const localPort = options.localPort || 3333;
      const description = options.description || 'Git Contextor Share';

      // Create tunnel via API
      const response = await fetch(`${this.serverUrl}/api/tunnels`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          tunnelPath,
          localPort,
          targetHost: 'localhost',
          description
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Tunnel creation failed: ${response.status} ${response.statusText} - ${errorData.message || 'Unknown error'}`);
      }

      this.tunnel = await response.json();
      this.tunnelId = this.tunnel.id;
      this.tunnelUrl = this.tunnel.url;

      // Start tunnel client
      await this.startTunnelClient();

      this.status = 'running';

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

  async startTunnelClient() {
    if (!this.tunnel) {
      throw new Error('Tunnel not created yet');
    }

    const tunnelClientPath = path.join(__dirname, '..', '..', 'tunnel-client.js');
    
    this.tunnelClient = spawn('node', [
      tunnelClientPath,
      this.serverUrl,
      this.tunnel.connectionId,
      this.tunnel.localPort.toString()
    ], {
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: false
    });

    // Handle tunnel client output
    this.tunnelClient.stdout.on('data', (data) => {
      const output = data.toString();
      console.log('Tunnel client:', output);
      this.emit('tunnel-client-output', output);
    });

    this.tunnelClient.stderr.on('data', (data) => {
      const error = data.toString();
      console.error('Tunnel client error:', error);
      this.emit('tunnel-client-error', error);
    });

    this.tunnelClient.on('close', (code) => {
      console.log(`Tunnel client exited with code ${code}`);
      if (this.status === 'running') {
        this.status = 'error';
        this.emit('tunnel-disconnected', { code });
      }
    });

    this.tunnelClient.on('error', (error) => {
      console.error('Tunnel client spawn error:', error);
      this.emit('tunnel-error', error);
    });

    // Wait for client to connect
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Tunnel client connection timeout'));
      }, 10000);

      const onOutput = (data) => {
        if (data.includes('connected') || data.includes('ready')) {
          clearTimeout(timeout);
          this.tunnelClient.stdout.removeListener('data', onOutput);
          resolve();
        }
      };

      this.tunnelClient.stdout.on('data', onOutput);
      
      // Also resolve after 5 seconds as fallback
      setTimeout(() => {
        clearTimeout(timeout);
        this.tunnelClient.stdout.removeListener('data', onOutput);
        resolve();
      }, 5000);
    });

    return this.tunnelUrl;
  }

  async deleteTunnel() {
    if (!this.tunnelId) {
      return;
    }

    try {
      await fetch(`${this.serverUrl}/api/tunnels/${this.tunnelId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });
    } catch (error) {
      console.error('Error deleting tunnel:', error);
    }
  }

  async stopTunnel() {
    this.status = 'stopping';

    // Stop tunnel client
    if (this.tunnelClient) {
      this.tunnelClient.kill('SIGTERM');
      
      // Force kill if it doesn't stop gracefully
      setTimeout(() => {
        if (this.tunnelClient && !this.tunnelClient.killed) {
          this.tunnelClient.kill('SIGKILL');
        }
      }, 5000);
      
      this.tunnelClient = null;
    }

    // Delete tunnel from service
    await this.deleteTunnel();

    // Reset state
    this.tunnelId = null;
    this.tunnelUrl = null;
    this.tunnel = null;
    this.status = 'stopped';

    this.emit('tunnel-stopped');
  }

  getTunnelStatus() {
    return {
      status: this.status,
      url: this.tunnelUrl,
      service: 'corrently',
      id: this.tunnelId
    };
  }

  isRunning() {
    return this.status === 'running';
  }

  async testConnection() {
    if (!this.apiKey) {
      throw new Error('API key is required');
    }

    try {
      const response = await fetch(`${this.serverUrl}/api/health`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });

      if (!response.ok) {
        throw new Error(`Health check failed: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      throw new Error(`Connection test failed: ${error.message}`);
    }
  }

  async getUserInfo() {
    if (!this.apiKey) {
      throw new Error('API key is required');
    }

    try {
      const response = await fetch(`${this.serverUrl}/api/auth/me`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });

      if (!response.ok) {
        throw new Error(`User info failed: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      throw new Error(`Failed to get user info: ${error.message}`);
    }
  }

  async listTunnels() {
    if (!this.apiKey) {
      throw new Error('API key is required');
    }

    try {
      const response = await fetch(`${this.serverUrl}/api/tunnels`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });

      if (!response.ok) {
        throw new Error(`List tunnels failed: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      throw new Error(`Failed to list tunnels: ${error.message}`);
    }
  }
}

module.exports = CorrentlyTunnelProvider;
