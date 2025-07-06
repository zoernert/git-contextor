const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');

class SharingService {
    constructor(repoPath, config) {
        this.repoPath = repoPath;
        this.config = config;
        this.shareStore = new Map(); // In-memory store for shares
        this.shareDir = path.join(repoPath, '.gitcontextor', 'shares');
    }

    async init() {
        await fs.mkdir(this.shareDir, { recursive: true });
        await this.loadExistingShares();
    }

    async createShare(options = {}) {
        const shareId = crypto.randomBytes(16).toString('hex');
        const shareConfig = {
            id: shareId,
            created_at: new Date().toISOString(),
            expires_at: new Date(Date.now() + (options.duration || 24 * 60 * 60 * 1000)).toISOString(),
            scope: options.scope || ['general'],
            description: options.description || 'Repository AI Access',
            access_count: 0,
            max_queries: options.maxQueries || 100,
            allowed_ips: options.allowedIps || [],
            api_key: crypto.randomBytes(32).toString('hex')
        };

        this.shareStore.set(shareId, shareConfig);
        await this.saveShare(shareConfig);

        return {
            share_id: shareId,
            api_key: shareConfig.api_key,
            expires_at: shareConfig.expires_at,
            access_url: `/shared/${shareId}`
        };
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
}

module.exports = SharingService;
