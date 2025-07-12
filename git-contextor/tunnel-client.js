#!/usr/bin/env node

const WebSocket = require('ws');
const http = require('http');
const url = require('url');

class TunnelClient {
  constructor(serverUrl, connectionId, localPort) {
    this.serverUrl = serverUrl;
    this.connectionId = connectionId;
    this.localPort = parseInt(localPort);
    this.ws = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
    this.reconnectDelay = 1000;
  }

  async connect() {
    const wsUrl = this.serverUrl.replace('https://', 'wss://').replace('http://', 'ws://');
    const fullWsUrl = `${wsUrl}/ws/tunnel/${this.connectionId}`;

    console.log(`Connecting to tunnel server: ${fullWsUrl}`);
    console.log(`Local port: ${this.localPort}`);

    this.ws = new WebSocket(fullWsUrl);

    this.ws.on('open', () => {
      console.log('✓ Connected to tunnel server');
      this.reconnectAttempts = 0;
    });

    this.ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        this.handleMessage(message);
      } catch (error) {
        console.error('Error parsing message:', error);
      }
    });

    this.ws.on('close', (code, reason) => {
      console.log(`Connection closed: ${code} - ${reason}`);
      this.attemptReconnect();
    });

    this.ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });

    // Send ping every 30 seconds to keep connection alive
    setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'ping' }));
      }
    }, 30000);
  }

  handleMessage(message) {
    switch (message.type) {
      case 'http-request':
        this.handleHttpRequest(message.data);
        break;
      case 'pong':
        // Pong received, connection is alive
        break;
      default:
        console.log('Unknown message type:', message.type);
    }
  }

  async handleHttpRequest(requestData) {
    const { id, method, path, headers, body } = requestData;
    
    console.log(`→ ${method} ${path}`);

    try {
      // Make request to local server
      const options = {
        hostname: 'localhost',
        port: this.localPort,
        path: path,
        method: method,
        headers: headers
      };

      const response = await this.makeLocalRequest(options, body);
      
      // Send response back through tunnel
      this.ws.send(JSON.stringify({
        type: 'http-response',
        data: {
          id: id,
          status: response.status,
          statusText: response.statusText,
          headers: response.headers,
          body: response.body
        }
      }));

      console.log(`← ${response.status} ${path}`);

    } catch (error) {
      console.error(`Error handling request ${id}:`, error);
      
      // Send error response
      this.ws.send(JSON.stringify({
        type: 'http-response',
        data: {
          id: id,
          status: 502,
          statusText: 'Bad Gateway',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            error: 'Local server error',
            message: error.message 
          })
        }
      }));
    }
  }

  makeLocalRequest(options, body) {
    return new Promise((resolve, reject) => {
      const req = http.request(options, (res) => {
        let responseBody = '';
        
        res.on('data', (chunk) => {
          responseBody += chunk;
        });
        
        res.on('end', () => {
          resolve({
            status: res.statusCode,
            statusText: res.statusMessage,
            headers: res.headers,
            body: responseBody
          });
        });
      });

      req.on('error', (error) => {
        reject(error);
      });

      req.setTimeout(30000, () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });

      if (body) {
        req.write(body);
      }
      
      req.end();
    });
  }

  attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached. Exiting.');
      process.exit(1);
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    console.log(`Reconnecting in ${delay}ms... (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    
    setTimeout(() => {
      this.connect();
    }, delay);
  }
}

// Command line usage
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length < 3) {
    console.error('Usage: node tunnel-client.js <serverUrl> <connectionId> <localPort>');
    process.exit(1);
  }

  const [serverUrl, connectionId, localPort] = args;
  
  const client = new TunnelClient(serverUrl, connectionId, localPort);
  
  // Handle process termination
  process.on('SIGINT', () => {
    console.log('\nShutting down tunnel client...');
    if (client.ws) {
      client.ws.close();
    }
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    console.log('\nShutting down tunnel client...');
    if (client.ws) {
      client.ws.close();
    }
    process.exit(0);
  });

  client.connect().catch(error => {
    console.error('Failed to connect:', error);
    process.exit(1);
  });
}

module.exports = TunnelClient;
