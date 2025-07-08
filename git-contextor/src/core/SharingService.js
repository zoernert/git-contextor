const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');
const { spawn } = require('child_process');

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
            type: options.type || 'general',
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
        await this.saveShare(shareConfig);

        const response = {
            share_id: shareId,
            api_key: shareConfig.api_key,
            expires_at: shareConfig.expires_at,
            access_url: `/shared/${shareId}`
        };

        if (this.tunnelStatus === 'running' && this.tunnelUrl) {
            response.public_url = `${this.tunnelUrl}${response.access_url}`;
        }

        return response;
    }

    async validateShare(shareId, apiKey) {
        const share = this.shareStore.get(shareId);
        if (!share) {
            throw new Error('Share not found');
        }

        if (new Date() > new Date(share.expires_at)) {
            this.shareStore.delete(shareId);
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

    async getAndValidateShare(shareId) {
        const share = this.shareStore.get(shareId);
        if (!share) {
            return null;
        }
        if (new Date() > new Date(share.expires_at)) {
            // Share ist abgelaufen, entferne ihn
            this.shareStore.delete(shareId);
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
        try {
            await fs.unlink(path.join(this.shareDir, `${shareId}.json`));
        } catch (error) {
            // File might not exist, ignore
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
        return {
            status: this.tunnelStatus,
            url: this.tunnelUrl,
            service: this.tunnelService,
            password: this.tunnelPassword
        };
    }

    async stopTunnel() {
        return new Promise((resolve) => {
            if (this.tunnelProcess) {
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

    async startTunnel(service) {
        if (this.tunnelStatus !== 'stopped' && this.tunnelStatus !== 'error') {
            throw new Error(`Tunnel is already active with status: ${this.tunnelStatus}`);
        }

        this.tunnelStatus = 'starting';
        this.tunnelService = service;
        this.tunnelUrl = null;
        this.tunnelPassword = null;

        const port = this.config.services.port;
        let command, args;

        // For now, only localtunnel is supported programmatically
        if (service === 'localtunnel') {
            command = 'npx';
            args = ['localtunnel', '--port', port];
        } else {
            this.tunnelStatus = 'error';
            throw new Error(`Unsupported tunnel service for UI control: ${service}`);
        }
        
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
