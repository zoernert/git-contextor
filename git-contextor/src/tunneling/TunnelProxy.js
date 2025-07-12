const http = require('http');
const { createProxyMiddleware } = require('http-proxy-middleware');

class TunnelProxy {
  constructor(localPort, targetHost = 'localhost', targetPort = 3333) {
    this.localPort = localPort;
    this.targetHost = targetHost;
    this.targetPort = targetPort;
    this.server = null;
  }

  async start() {
    return new Promise((resolve, reject) => {
      const proxy = createProxyMiddleware({
        target: `http://${this.targetHost}:${this.targetPort}`,
        changeOrigin: true,
        ws: true, // Enable WebSocket proxying
        onError: (err, req, res) => {
          console.error('Proxy error:', err);
          if (res.writeHead) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Proxy error' }));
          }
        },
        onProxyReq: (proxyReq, req, res) => {
          // Add custom headers to identify tunnel requests
          proxyReq.setHeader('X-Tunnel-Request', 'true');
          proxyReq.setHeader('X-Tunnel-Port', this.localPort);
        }
      });

      this.server = http.createServer(proxy);
      
      this.server.on('upgrade', proxy.upgrade);
      
      this.server.listen(this.localPort, (err) => {
        if (err) {
          reject(err);
        } else {
          console.log(`Tunnel proxy listening on port ${this.localPort}`);
          resolve();
        }
      });

      this.server.on('error', (err) => {
        console.error('Tunnel proxy server error:', err);
        reject(err);
      });
    });
  }

  async stop() {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          console.log('Tunnel proxy stopped');
          this.server = null;
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  isRunning() {
    return this.server && this.server.listening;
  }
}

module.exports = TunnelProxy;
