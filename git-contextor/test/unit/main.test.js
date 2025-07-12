const ConfigManager = require('../../src/core/ConfigManager');
const ServiceManager = require('../../src/core/ServiceManager');

// Mock dependencies
jest.mock('../../src/core/ConfigManager');
jest.mock('../../src/core/ServiceManager');

describe('Main Entry Point', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should export main modules', () => {
        expect(ConfigManager).toBeDefined();
        expect(ServiceManager).toBeDefined();
    });

    it('should have basic module functionality', () => {
        const mockConfig = new ConfigManager();
        expect(mockConfig).toBeDefined();
        
        const mockService = new ServiceManager();
        expect(mockService).toBeDefined();
    });
});
