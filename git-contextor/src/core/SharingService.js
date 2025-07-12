const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');
const { spawn } = require('child_process');
const ManagedTunnelingProvider = require('../tunneling/ManagedTunnelingProvider');
const CorrentlyTunnelProvider = require('../tunneling/CorrentlyTunnelProvider');

function parseDuration(duration) {
    // Already in milliseconds
    if (typeof duration === 'number') {
        return duration;
    }
    // Default to 24h if invalid
    if (typeof duration !== 'string') {
        return 24 * 60 * 60 * 1000;
    }

    const match = duration.match(/^(\d+)([hdwm])$/);
    if (!match) return 24 * 60 * 60 * 1000; // Default 24h for invalid strings
    
    const [, amount, unit] = match;
    const multipliers = { 
        h: 60 * 60 * 1000, 
        d: 24 * 60 * 60 * 1000, 
        w: 7 * 24 * 60 * 60 * 1000, 
        m: 30 * 24 * 60 * 60 * 1000 
    };
    return parseInt(amount, 10) * multipliers[unit];
}

class SharingService {
    constructor(repoPath, config) {
        this.repoPath = repoPath;
        this.config = config;
        this.shareStore = new Map(); // In-memory store for shares
        this.shareDir = path.join(repoPath, '.gitcontextor', 'shares');

        this.tunnelProcess = null;
        this.tunnelUrl = null;
        this.tunnelService = null;
        this.tunnelStatus = 'stopped'; // stopped, starting, running, error
        this.tunnelPassword = null;
        this.apiKeyStore = new Map(); // In-memory store for apiKey -> shareId mapping
        
        // Initialize tunnel providers
        this.managedTunnelingProvider = null;
        this.correntlyTunnelProvider = null;
        
        if (config.tunneling && config.tunneling.provider === 'managed') {
            this.managedTunnelingProvider = new ManagedTunnelingProvider(config.tunneling.managed);
        } else if (config.tunneling && config.tunneling.provider === 'corrently') {
            this.correntlyTunnelProvider = new CorrentlyTunnelProvider(config.tunneling.corrently);
        }
    }

    async init() {
        await fs.mkdir(this.shareDir, { recursive: true });
        await this.loadExistingShares();
    }

    async createShare(options = {}) {
        const shareId = crypto.randomBytes(16).toString('hex');
        const durationMs = parseDuration(options.duration);
        const shareConfig = {
            id: shareId,
            created_at: new Date().toISOString(),
            expires_at: new Date(Date.now() + durationMs).toISOString(),
            scope: options.scope || ['general'],
            description: options.description || 'Repository AI Access',
            access_count: 0,
            max_queries: options.maxQueries || 100,
            allowed_ips: options.allowedIps || [],
            api_key: crypto.randomBytes(32).toString('hex')
        };

        this.shareStore.set(shareId, shareConfig);
        this.apiKeyStore.set(shareConfig.api_key, shareId); // Diese Zeile hinzufügen
        await this.saveShare(shareConfig);

        const response = {
            share_id: shareId,
            api_key: shareConfig.api_key,
            expires_at: shareConfig.expires_at,
            access_url: `/shared/${shareId}`
        };

        if (this.tunnelStatus === 'running' && this.tunnelUrl) {
            response.public_url = `${this.tunnelUrl}${response.access_url}`;
            response.mcp_server_url = `${this.tunnelUrl}/mcp/v1`; // Diese Zeile hinzufügen
        }

        return response;
    }

    async validateShare(shareId, apiKey) {
        const share = this.shareStore.get(shareId);
        if (!share) {
            throw new Error('Share not found');
        }

        if (new Date() > new Date(share.expires_at)) {
            await this.deleteShare(shareId);
            throw new Error('Share expired');
        }

        if (share.api_key !== apiKey) {
            throw new Error('Invalid API key');
        }

        if (share.access_count >= share.max_queries) {
            throw new Error('Query limit exceeded');
        }

        return share;
    }

    async getAndValidateShareByApiKey(apiKey) {
        const shareId = this.apiKeyStore.get(apiKey);
        if (!shareId) {
            return null;
        }
        const share = this.shareStore.get(shareId);
        if (!share) {
            // Sollte nicht passieren, wenn die Stores synchron sind, aber zur Sicherheit aufräumen
            this.apiKeyStore.delete(apiKey);
            return null;
        }

        if (new Date() > new Date(share.expires_at)) {
            // Abgelaufenen Share entfernen
            await this.deleteShare(shareId);
            return null;
        }
        return share;
    }

    async incrementUsage(shareId) {
        const share = this.shareStore.get(shareId);
        if (share) {
            share.access_count++;
            await this.saveShare(share);
        }
    }

    async saveShare(shareConfig) {
        const filePath = path.join(this.shareDir, `${shareConfig.id}.json`);
        await fs.writeFile(filePath, JSON.stringify(shareConfig, null, 2));
    }

    async loadExistingShares() {
        try {
            const files = await fs.readdir(this.shareDir);
            for (const file of files) {
                if (file.endsWith('.json')) {
                    const content = await fs.readFile(path.join(this.shareDir, file), 'utf8');
                    const share = JSON.parse(content);
                    
                    // Only load non-expired shares
                    if (new Date() <= new Date(share.expires_at)) {
                        this.shareStore.set(share.id, share);
                        this.apiKeyStore.set(share.api_key, share.id); // Diese Zeile hinzufügen
                    } else {
                        await fs.unlink(path.join(this.shareDir, file));
                    }
                }
            }
        } catch (error) {
            // Directory doesn't exist yet, ignore
        }
    }

    async deleteShare(shareId) {
        const share = this.shareStore.get(shareId);
        if (share) {
            this.apiKeyStore.delete(share.api_key);
        }
        this.shareStore.delete(shareId);

        try {
            await fs.unlink(path.join(this.shareDir, `${shareId}.json`));
        } catch (error) {
            if (error.code !== 'ENOENT') {
                console.error(`Error unlinking share file for ${shareId}:`, error);
            }
        }
    }

    getActiveShares() {
        return Array.from(this.shareStore.values())
            .filter(share => new Date() <= new Date(share.expires_at))
            .map(share => ({
                id: share.id,
                description: share.description,
                expires_at: share.expires_at,
                access_count: share.access_count,
                max_queries: share.max_queries
            }));
    }

    _parseTunnelOutput(output) {
        // Match URL, which can appear on stdout or stderr
        const urlMatch = output.match(/your url is: (https:\/\/[^\s]+)/);
        if (urlMatch && urlMatch[1] && !this.tunnelUrl) { // Set URL only once
            this.tunnelUrl = urlMatch[1];
            this.tunnelStatus = 'running';
        }

        // Match an explicitly printed password, which can appear on stderr.
        const passwordMatch = output.match(/(?:your password is:|Password:)\s*(\w+)/i);
        if (passwordMatch && passwordMatch[1]) {
            this.tunnelPassword = passwordMatch[1];
        }
    }

    getTunnelStatus() {
        if (this.tunnelService === 'managed' && this.managedTunnelingProvider) {
            return this.managedTunnelingProvider.getTunnelStatus();
        }
        
        if (this.tunnelService === 'corrently' && this.correntlyTunnelProvider) {
            return this.correntlyTunnelProvider.getTunnelStatus();
        }
        
        return {
            status: this.tunnelStatus,
            url: this.tunnelUrl,
            service: this.tunnelService,
            password: this.tunnelPassword
        };
    }

    async stopTunnel() {
        return new Promise(async (resolve) => {
            if (this.tunnelService === 'managed' && this.managedTunnelingProvider) {
                try {
                    await this.managedTunnelingProvider.stopTunnel();
                } catch (error) {
                    console.error('Error stopping managed tunnel:', error);
                }
            } else if (this.tunnelService === 'corrently' && this.correntlyTunnelProvider) {
                try {
                    await this.correntlyTunnelProvider.stopTunnel();
                } catch (error) {
                    console.error('Error stopping corrently tunnel:', error);
                }
            } else if (this.tunnelProcess) {
                this.tunnelProcess.kill();
                // The 'exit' event handler will clean up state.
            }
            
            // Reset state immediately for snappy UI
            this.tunnelProcess = null;
            this.tunnelUrl = null;
            this.tunnelService = null;
            this.tunnelStatus = 'stopped';
            this.tunnelPassword = null;
            resolve();
        });
    }

    async startTunnel(service, options = {}) {
        if (this.tunnelStatus !== 'stopped' && this.tunnelStatus !== 'error') {
            throw new Error(`Tunnel is already active with status: ${this.tunnelStatus}`);
        }

        this.tunnelStatus = 'starting';
        this.tunnelService = service;
        this.tunnelUrl = null;
        this.tunnelPassword = null;

        const port = this.config.services.port;

        if (service === 'managed') {
            return this.startManagedTunnel(port, options);
        } else if (service === 'corrently') {
            return this.startCorrentlyTunnel(port, options);
        } else if (service === 'localtunnel') {
            return this.startLocalTunnel(port, options);
        } else {
            this.tunnelStatus = 'error';
            throw new Error(`Unsupported tunnel service: ${service}`);
        }
    }

    async startManagedTunnel(port, options = {}) {
        if (!this.managedTunnelingProvider) {
            throw new Error('Managed tunneling provider not configured');
        }

        if (!this.config.tunneling.managed.apiKey) {
            throw new Error('API key required for managed tunneling');
        }

        try {
            const tunnelData = await this.managedTunnelingProvider.createTunnel({
                localPort: port,
                subdomain: options.subdomain || this.config.tunneling.managed.subdomain,
                description: options.description || 'Git Contextor Share'
            });

            this.tunnelUrl = tunnelData.url;
            this.tunnelStatus = 'running';

            // Set up event listeners
            this.managedTunnelingProvider.on('tunnel-error', (error) => {
                console.error('Managed tunnel error:', error);
                this.tunnelStatus = 'error';
            });

            this.managedTunnelingProvider.on('tunnel-disconnected', () => {
                console.log('Managed tunnel disconnected');
                this.tunnelStatus = 'error';
            });

            this.managedTunnelingProvider.on('tunnel-stopped', () => {
                console.log('Managed tunnel stopped');
                this.tunnelStatus = 'stopped';
                this.tunnelUrl = null;
            });

            return tunnelData;

        } catch (error) {
            this.tunnelStatus = 'error';
            throw error;
        }
    }

    async startCorrentlyTunnel(port, options = {}) {
        if (!this.correntlyTunnelProvider) {
            throw new Error('Corrently tunnel provider not configured');
        }

        if (!this.config.tunneling.corrently.apiKey) {
            throw new Error('API key required for tunnel.corrently.cloud service. Please set CORRENTLY_TUNNEL_API_KEY environment variable or configure it in your config.');
        }

        try {
            const tunnelData = await this.correntlyTunnelProvider.createTunnel({
                localPort: port,
                tunnelPath: options.tunnelPath || `git-contextor-${Date.now()}`,
                description: options.description || this.config.tunneling.corrently.description || 'Git Contextor Share'
            });

            this.tunnelUrl = tunnelData.url;
            this.tunnelStatus = 'running';

            // Set up event listeners
            this.correntlyTunnelProvider.on('tunnel-error', (error) => {
                console.error('Corrently tunnel error:', error);
                this.tunnelStatus = 'error';
            });

            this.correntlyTunnelProvider.on('tunnel-disconnected', () => {
                console.log('Corrently tunnel disconnected');
                this.tunnelStatus = 'error';
            });

            this.correntlyTunnelProvider.on('tunnel-stopped', () => {
                console.log('Corrently tunnel stopped');
                this.tunnelStatus = 'stopped';
                this.tunnelUrl = null;
            });

            this.correntlyTunnelProvider.on('tunnel-created', (data) => {
                console.log('Corrently tunnel created:', data.url);
            });

            return tunnelData;

        } catch (error) {
            this.tunnelStatus = 'error';
            throw error;
        }
    }

    async startLocalTunnel(port, options = {}) {
        let command, args;

        command = 'npx';
        args = ['localtunnel', '--port', port];
        
        this.tunnelProcess = spawn(command, args);

        this.tunnelProcess.stdout.on('data', (data) => {
            const output = data.toString();
            this._parseTunnelOutput(output);
        });

        this.tunnelProcess.stderr.on('data', (data) => {
            const output = data.toString();
            // Log stderr for debugging, but still parse it for info like URL or password
            console.error(`Tunnel service output on stderr: ${output}`);
            this._parseTunnelOutput(output);
        });

        this.tunnelProcess.on('error', (err) => {
            console.error('Failed to start tunnel process:', err);
            this.tunnelStatus = 'error';
            this.tunnelProcess = null;
        });

        this.tunnelProcess.on('exit', (code) => {
            if (this.tunnelStatus !== 'stopped') {
                this.tunnelStatus = code === 0 ? 'stopped' : 'error';
                this.tunnelUrl = null;
                this.tunnelProcess = null;
                this.tunnelPassword = null;
            }
        });
    }
}

module.exports = SharingService;
