# AI Agent Tunnel Integration Guide
## Git Contextor Host - Tunnel Service

### Overview
This guide provides comprehensive instructions for AI agents to integrate with the tunnel service at `tunnel.corrently.cloud`. The service allows you to expose local development servers to the internet through secure tunnels, making them accessible via public URLs.

### Service Details
- **Production Server**: `tunnel.corrently.cloud`
- **Protocol**: HTTPS with WebSocket tunnels
- **Authentication**: API Key based
- **Tunnel Types**: Path-based tunnels (recommended) and subdomain-based tunnels

---

## Quick Start

### 1. Prerequisites
- Valid API key for tunnel.corrently.cloud
- Node.js runtime for tunnel client
- Local server/application to expose

### 2. Basic Tunnel Creation Flow
```bash
# 1. Create tunnel via API
curl -X POST https://tunnel.corrently.cloud/api/tunnels \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "tunnelPath": "my-app-test",
    "localPort": 3000,
    "description": "Development server tunnel"
  }'

# 2. Start tunnel client with returned connectionId
node tunnel-client.js https://tunnel.corrently.cloud CONNECTION_ID 3000

# 3. Access your app via: https://tunnel.corrently.cloud/tunnel/my-app-test
```

---

## API Reference

### Authentication
All API requests require an API key in the Authorization header:
```bash
Authorization: Bearer YOUR_API_KEY
```

### Base URL
```
https://tunnel.corrently.cloud
```

### Endpoints

#### 1. Health Check
```bash
GET /api/health
```
**Response:**
```json
{
  "status": "ok",
  "mode": "path-based-tunnels"
}
```

#### 2. User Authentication Check
```bash
GET /api/auth/me
```
**Response:**
```json
{
  "usage": {
    "tunnelsUsed": 0,
    "dataTransferred": 2463,
    "resetDate": "2025-07-10T22:57:09.045Z"
  },
  "email": "user@example.com",
  "plan": "enterprise",
  "isActive": true
}
```

#### 3. Create Tunnel
```bash
POST /api/tunnels
```
**Request Body:**
```json
{
  "tunnelPath": "unique-path-name",
  "localPort": 3000,
  "targetHost": "localhost",
  "description": "Optional description"
}
```

**Response:**
```json
{
  "id": "tunnel-id",
  "userId": "user-id",
  "tunnelPath": "unique-path-name",
  "localPort": 3000,
  "targetHost": "localhost",
  "connectionId": "connection-id-for-client",
  "url": "https://tunnel.corrently.cloud/tunnel/unique-path-name",
  "subdomainUrl": "https://sub-xyz.tunnel.corrently.cloud",
  "isActive": true,
  "expiresAt": "2025-07-13T06:05:01.955Z",
  "createdAt": "2025-07-12T22:05:01.956Z"
}
```

#### 4. List Tunnels
```bash
GET /api/tunnels
```
**Response:**
```json
[
  {
    "id": "tunnel-id",
    "tunnelPath": "my-app",
    "localPort": 3000,
    "url": "https://tunnel.corrently.cloud/tunnel/my-app",
    "isActive": true,
    "expiresAt": "2025-07-13T06:05:01.955Z"
  }
]
```

#### 5. Delete Tunnel
```bash
DELETE /api/tunnels/{tunnelId}
```

---

## Tunnel Client Integration

### Required Files
You need the `tunnel-client.js` file from the repository. Here's the essential setup:

```javascript
// tunnel-client.js usage
const tunnelClient = require('./tunnel-client.js');

// Parameters: serverUrl, connectionId, localPort
node tunnel-client.js https://tunnel.corrently.cloud CONNECTION_ID 3000
```

### Tunnel Client Behavior
- Establishes WebSocket connection to the tunnel server
- Forwards HTTP requests from tunnel URL to local server
- Automatically handles connection recovery
- Logs all forwarded requests

---

## Local Server Requirements

### Critical Configuration
Your local server **MUST** bind to `0.0.0.0` (all interfaces) or both `localhost` and `127.0.0.1` to work properly with the tunnel client.

#### ✅ Correct Configuration
```javascript
// Node.js HTTP server
server.listen(3000, '0.0.0.0', () => {
  console.log('Server running on http://0.0.0.0:3000');
});
```

#### ❌ Incorrect Configuration
```javascript
// This will cause "Connection Refused" errors
server.listen(3000, 'localhost', () => {
  console.log('Server running on localhost:3000');
});
```

### Testing Local Server
Before creating a tunnel, verify your local server is accessible:
```bash
# Test both interfaces
curl http://localhost:3000
curl http://127.0.0.1:3000
```
Both should return successful responses.

---

## Complete Integration Example

### Step-by-Step Implementation

#### 1. Start Local Server
```javascript
// server.js
const http = require('http');

const server = http.createServer((req, res) => {
  res.writeHead(200, {'Content-Type': 'application/json'});
  res.end(JSON.stringify({
    message: 'Hello from local server!',
    timestamp: new Date().toISOString(),
    path: req.url,
    method: req.method
  }));
});

// IMPORTANT: Bind to 0.0.0.0 for tunnel compatibility
server.listen(3000, '0.0.0.0', () => {
  console.log('Server running on http://0.0.0.0:3000');
});
```

#### 2. Create Tunnel
```bash
#!/bin/bash
API_KEY="your-api-key-here"
TUNNEL_PATH="ai-agent-demo-$(date +%s)"
LOCAL_PORT=3000

# Create tunnel
RESPONSE=$(curl -s -X POST https://tunnel.corrently.cloud/api/tunnels \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d "{
    \"tunnelPath\": \"$TUNNEL_PATH\",
    \"localPort\": $LOCAL_PORT,
    \"description\": \"AI Agent Demo Tunnel\"
  }")

# Extract connection ID and tunnel URL
CONNECTION_ID=$(echo $RESPONSE | jq -r '.connectionId')
TUNNEL_URL=$(echo $RESPONSE | jq -r '.url')

echo "Tunnel created: $TUNNEL_URL"
echo "Connection ID: $CONNECTION_ID"
```

#### 3. Start Tunnel Client
```bash
# Start tunnel client (runs in background)
node tunnel-client.js https://tunnel.corrently.cloud $CONNECTION_ID $LOCAL_PORT &
TUNNEL_PID=$!

# Wait for connection to establish
sleep 5

echo "Tunnel active! Access your app at: $TUNNEL_URL"
```

#### 4. Test Connection
```bash
# Test the tunnel
curl -H "Accept: application/json" $TUNNEL_URL

# Should return your local server's response
```

#### 5. Cleanup
```bash
# Stop tunnel client
kill $TUNNEL_PID

# Delete tunnel
curl -X DELETE https://tunnel.corrently.cloud/api/tunnels/$TUNNEL_ID \
  -H "Authorization: Bearer $API_KEY"
```

---

## Error Handling

### Common Issues and Solutions

#### 1. "Bad Gateway: Local server error"
**Problem**: Tunnel client can't connect to local server
**Solution**: 
- Ensure local server binds to `0.0.0.0` not just `localhost`
- Verify server is running: `curl http://127.0.0.1:PORT`
- Check firewall settings

#### 2. "Connection Refused"
**Problem**: Local server not accessible
**Solution**:
```bash
# Check if port is in use
lsof -i :3000

# Test local connectivity
curl http://localhost:3000
curl http://127.0.0.1:3000
```

#### 3. "WebSocket Connection Failed"
**Problem**: Tunnel client can't connect to tunnel server
**Solution**:
- Verify API key is valid
- Check connection ID from tunnel creation response
- Ensure internet connectivity

#### 4. "Tunnel Not Found"
**Problem**: Tunnel URL returns 404
**Solution**:
- Verify tunnel is active: `GET /api/tunnels`
- Check tunnel hasn't expired
- Ensure tunnel client is running

---

## Best Practices for AI Agents

### 1. Tunnel Lifecycle Management
```javascript
class TunnelManager {
  constructor(apiKey, serverUrl = 'https://tunnel.corrently.cloud') {
    this.apiKey = apiKey;
    this.serverUrl = serverUrl;
    this.activeTunnels = new Map();
  }

  async createTunnel(localPort, description = '') {
    const tunnelPath = `ai-agent-${Date.now()}`;
    
    const response = await fetch(`${this.serverUrl}/api/tunnels`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        tunnelPath,
        localPort,
        description
      })
    });

    const tunnel = await response.json();
    this.activeTunnels.set(tunnel.id, tunnel);
    return tunnel;
  }

  async deleteTunnel(tunnelId) {
    await fetch(`${this.serverUrl}/api/tunnels/${tunnelId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`
      }
    });
    this.activeTunnels.delete(tunnelId);
  }

  async cleanup() {
    for (const [tunnelId] of this.activeTunnels) {
      await this.deleteTunnel(tunnelId);
    }
  }
}
```

### 2. Health Monitoring
```javascript
async function monitorTunnelHealth(tunnelUrl) {
  try {
    const response = await fetch(tunnelUrl, {
      timeout: 5000,
      headers: { 'User-Agent': 'AI-Agent-Health-Check' }
    });
    return response.ok;
  } catch (error) {
    console.error('Tunnel health check failed:', error);
    return false;
  }
}
```

### 3. Automatic Retry Logic
```javascript
async function createTunnelWithRetry(apiKey, localPort, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const tunnel = await createTunnel(apiKey, localPort);
      return tunnel;
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
}
```

---

## Security Considerations

### 1. API Key Management
- Store API keys securely (environment variables)
- Never log API keys
- Rotate keys regularly

### 2. Tunnel Security
- Use HTTPS for all tunnel communications
- Implement proper authentication in your local server
- Monitor tunnel usage and access logs

### 3. Network Security
- Bind local servers to specific interfaces when possible
- Use firewall rules to restrict local access
- Implement rate limiting in your local server

---

## Troubleshooting Checklist

Before creating a tunnel, verify:
- [ ] Local server is running and accessible
- [ ] Server binds to `0.0.0.0` or both `localhost` and `127.0.0.1`
- [ ] Port is not blocked by firewall
- [ ] API key is valid and has sufficient quota
- [ ] `tunnel-client.js` is available

When tunnel fails:
- [ ] Check tunnel client logs for connection errors
- [ ] Verify tunnel is listed in `GET /api/tunnels`
- [ ] Test local server directly: `curl http://127.0.0.1:PORT`
- [ ] Check tunnel URL accessibility
- [ ] Verify WebSocket connection is established

---

## Sample Implementation

Here's a complete working example for AI agents:

```javascript
// ai-agent-tunnel.js
const http = require('http');
const { spawn } = require('child_process');

class AIAgentTunnel {
  constructor(apiKey, serverUrl = 'https://tunnel.corrently.cloud') {
    this.apiKey = apiKey;
    this.serverUrl = serverUrl;
    this.tunnelClient = null;
    this.localServer = null;
    this.tunnel = null;
  }

  async startLocalServer(port = 3000) {
    return new Promise((resolve, reject) => {
      this.localServer = http.createServer((req, res) => {
        res.writeHead(200, {'Content-Type': 'application/json'});
        res.end(JSON.stringify({
          message: 'AI Agent Local Server',
          timestamp: new Date().toISOString(),
          path: req.url,
          method: req.method
        }));
      });

      this.localServer.listen(port, '0.0.0.0', () => {
        console.log(`Local server running on http://0.0.0.0:${port}`);
        resolve();
      });

      this.localServer.on('error', reject);
    });
  }

  async createTunnel(localPort, description = 'AI Agent Tunnel') {
    const tunnelPath = `ai-agent-${Date.now()}`;
    
    const response = await fetch(`${this.serverUrl}/api/tunnels`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        tunnelPath,
        localPort,
        description
      })
    });

    this.tunnel = await response.json();
    return this.tunnel;
  }

  async startTunnelClient() {
    if (!this.tunnel) {
      throw new Error('Tunnel not created yet');
    }

    this.tunnelClient = spawn('node', [
      'tunnel-client.js',
      this.serverUrl,
      this.tunnel.connectionId,
      this.tunnel.localPort.toString()
    ]);

    // Wait for client to connect
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    return this.tunnel.url;
  }

  async cleanup() {
    if (this.tunnelClient) {
      this.tunnelClient.kill();
    }
    
    if (this.localServer) {
      this.localServer.close();
    }
    
    if (this.tunnel) {
      await fetch(`${this.serverUrl}/api/tunnels/${this.tunnel.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });
    }
  }
}

// Usage example
async function main() {
  const tunnel = new AIAgentTunnel('your-api-key');
  
  try {
    // Start local server
    await tunnel.startLocalServer(3000);
    
    // Create tunnel
    await tunnel.createTunnel(3000, 'AI Agent Demo');
    
    // Start tunnel client
    const publicUrl = await tunnel.startTunnelClient();
    
    console.log(`🚀 Tunnel active! Access at: ${publicUrl}`);
    
    // Keep running
    process.on('SIGINT', async () => {
      await tunnel.cleanup();
      process.exit(0);
    });
    
  } catch (error) {
    console.error('Error:', error);
    await tunnel.cleanup();
  }
}

if (require.main === module) {
  main();
}

module.exports = AIAgentTunnel;
```

---

## Support and Resources

### Documentation
- API Reference: Available at tunnel.corrently.cloud/api/docs
- GitHub Repository: Contains tunnel-client.js and examples
- Test Scripts: Use provided test-system.sh for validation

### Rate Limits
- Default: 100 tunnels per hour
- Enterprise: Custom limits available
- Monitor usage via `GET /api/auth/me`

### Contact
For integration support and custom requirements, contact the tunnel service administrators.

---

*Last updated: July 12, 2025*
*Version: 1.0*
