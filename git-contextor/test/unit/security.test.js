const { apiKeyAuth } = require('../../src/utils/security');

describe('Security Utils', () => {
    describe('apiKeyAuth', () => {
        it('should create middleware function', () => {
            const config = { services: { apiKey: 'test-key' } };
            const middleware = apiKeyAuth(config);
            expect(typeof middleware).toBe('function');
        });

        it('should handle valid API key', () => {
            const config = { services: { apiKey: 'test-key' } };
            const middleware = apiKeyAuth(config);
            
            const req = { 
                headers: { 'x-api-key': 'test-key' },
                ip: '192.168.1.1',
                originalUrl: '/api/test'
            };
            const res = {};
            const next = jest.fn();
            
            middleware(req, res, next);
            expect(next).toHaveBeenCalled();
        });

        it('should reject invalid API key', () => {
            const config = { services: { apiKey: 'test-key' } };
            const middleware = apiKeyAuth(config);
            
            const req = { 
                headers: { 'x-api-key': 'wrong-key' },
                ip: '192.168.1.1',
                originalUrl: '/api/test'
            };
            const res = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn()
            };
            const next = jest.fn();
            
            middleware(req, res, next);
            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
        });

        it('should allow MCP routes from localhost', () => {
            const config = { services: { apiKey: 'test-key' } };
            const middleware = apiKeyAuth(config);
            
            const req = { 
                headers: {},
                ip: '127.0.0.1',
                originalUrl: '/mcp/test'
            };
            const res = {};
            const next = jest.fn();
            
            middleware(req, res, next);
            expect(next).toHaveBeenCalled();
        });
    });
});
