#!/usr/bin/env node

/**
 * Git Contextor MCP Service Test Script
 * 
 * This script tests the MCP endpoints of a running Git Contextor instance.
 * 
 * Usage:
 *   node test-mcp.js --url http://localhost:3333 --token your-share-api-key
 *   node test-mcp.js --help
 */

const https = require('https');
const http = require('http');
const { URL } = require('url');

class MCPTester {
    constructor(baseUrl, token) {
        this.baseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
        this.token = token;
        this.mcpBaseUrl = `${this.baseUrl}/mcp/v1`;
    }

    async makeRequest(path, method = 'GET', body = null) {
        const url = new URL(`${this.mcpBaseUrl}${path}`);
        const isHttps = url.protocol === 'https:';
        const httpModule = isHttps ? https : http;

        const options = {
            hostname: url.hostname,
            port: url.port || (isHttps ? 443 : 80),
            path: url.pathname + url.search,
            method: method,
            headers: {
                'Authorization': `Bearer ${this.token}`,
                'Content-Type': 'application/json',
                'User-Agent': 'Git-Contextor-MCP-Tester/1.0'
            }
        };

        if (body) {
            const bodyString = JSON.stringify(body);
            options.headers['Content-Length'] = Buffer.byteLength(bodyString);
        }

        return new Promise((resolve, reject) => {
            const req = httpModule.request(options, (res) => {
                let data = '';
                
                res.on('data', (chunk) => {
                    data += chunk;
                });

                res.on('end', () => {
                    try {
                        const result = {
                            status: res.statusCode,
                            headers: res.headers,
                            body: data ? JSON.parse(data) : null
                        };
                        resolve(result);
                    } catch (error) {
                        resolve({
                            status: res.statusCode,
                            headers: res.headers,
                            body: data,
                            parseError: error.message
                        });
                    }
                });
            });

            req.on('error', (error) => {
                reject(error);
            });

            if (body) {
                req.write(JSON.stringify(body));
            }

            req.end();
        });
    }

    async testSpec() {
        console.log('🔍 Testing MCP Spec Endpoint...');
        try {
            const response = await this.makeRequest('/spec');
            
            if (response.status === 200) {
                console.log('✅ Spec endpoint successful');
                console.log('📋 Available capabilities:');
                console.log(JSON.stringify(response.body, null, 2));
                return response.body;
            } else {
                console.log(`❌ Spec endpoint failed with status ${response.status}`);
                console.log('Response:', response.body);
                return null;
            }
        } catch (error) {
            console.log('❌ Spec endpoint error:', error.message);
            return null;
        }
    }

    async testCodeSearch(query = 'authentication') {
        console.log(`\n🔍 Testing Code Search Tool with query: "${query}"`);
        try {
            const body = {
                query: query
            };

            const response = await this.makeRequest('/tools/code_search/invoke', 'POST', body);
            
            if (response.status === 200) {
                console.log('✅ Code search successful');
                console.log('🎯 Search results:');
                
                if (response.body && response.body.content) {
                    // Truncate long responses for readability
                    const content = response.body.content;
                    if (content.length > 500) {
                        console.log(content.substring(0, 500) + '...\n[Content truncated]');
                    } else {
                        console.log(content);
                    }
                } else {
                    console.log(JSON.stringify(response.body, null, 2));
                }
                return response.body;
            } else {
                console.log(`❌ Code search failed with status ${response.status}`);
                console.log('Response:', response.body);
                return null;
            }
        } catch (error) {
            console.log('❌ Code search error:', error.message);
            return null;
        }
    }

    async testAuthentication() {
        console.log('🔐 Testing Authentication...');
        try {
            // Test without token first
            const originalToken = this.token;
            this.token = 'invalid-token';
            
            const response = await this.makeRequest('/spec');
            
            if (response.status === 401 || response.status === 403) {
                console.log('✅ Authentication properly enforced (unauthorized access blocked)');
            } else {
                console.log('⚠️  Authentication might not be working properly');
                console.log(`Expected 401/403, got ${response.status}`);
            }
            
            // Restore original token
            this.token = originalToken;
            
        } catch (error) {
            console.log('❌ Authentication test error:', error.message);
        }
    }

    async runAllTests() {
        console.log('🚀 Git Contextor MCP Service Test Suite');
        console.log('=====================================');
        console.log(`Base URL: ${this.baseUrl}`);
        console.log(`MCP URL: ${this.mcpBaseUrl}`);
        console.log(`Token: ${this.token ? this.token.substring(0, 10) + '...' : 'Not provided'}`);
        console.log('');

        // Test 1: Authentication
        await this.testAuthentication();

        // Test 2: Spec endpoint
        const spec = await this.testSpec();
        
        if (!spec) {
            console.log('\n❌ Cannot continue tests - spec endpoint failed');
            return;
        }

        // Test 3: Code search tool
        await this.testCodeSearch('authentication');
        await this.testCodeSearch('error handling');
        await this.testCodeSearch('database connection');

        console.log('\n✨ Test suite completed');
    }
}

// CLI argument parsing
function parseArgs() {
    const args = process.argv.slice(2);
    const config = {
        url: 'http://localhost:3333',
        token: null,
        query: null,
        help: false
    };

    for (let i = 0; i < args.length; i++) {
        switch (args[i]) {
            case '--url':
            case '-u':
                config.url = args[++i];
                break;
            case '--token':
            case '-t':
                config.token = args[++i];
                break;
            case '--query':
            case '-q':
                config.query = args[++i];
                break;
            case '--help':
            case '-h':
                config.help = true;
                break;
            default:
                console.log(`Unknown argument: ${args[i]}`);
                config.help = true;
        }
    }

    return config;
}

function showHelp() {
    console.log(`
Git Contextor MCP Service Tester

Usage:
  node test-mcp.js [options]

Options:
  --url, -u <url>      Base URL of Git Contextor service (default: http://localhost:3333)
  --token, -t <token>  Share API token for authentication (required)
  --query, -q <query>  Custom query to test (optional)
  --help, -h           Show this help message

Examples:
  # Test local instance
  node test-mcp.js --token gctx_abc123...

  # Test remote instance
  node test-mcp.js --url https://my-tunnel.loca.lt --token gctx_abc123...

  # Test with custom query
  node test-mcp.js --token gctx_abc123... --query "user authentication logic"

Notes:
  - Make sure Git Contextor is running before testing
  - Get your token by running: git-contextor share create
  - The MCP endpoints are available at: <base-url>/mcp/v1
`);
}

async function main() {
    const config = parseArgs();

    if (config.help) {
        showHelp();
        process.exit(0);
    }

    if (!config.token) {
        console.log('❌ Error: Token is required');
        console.log('Get your token by running: git-contextor share create');
        console.log('Then use: node test-mcp.js --token your-token-here');
        process.exit(1);
    }

    try {
        const tester = new MCPTester(config.url, config.token);

        if (config.query) {
            // Test specific query only
            console.log('🚀 Testing specific query...\n');
            await tester.testCodeSearch(config.query);
        } else {
            // Run full test suite
            await tester.runAllTests();
        }

    } catch (error) {
        console.log('❌ Fatal error:', error.message);
        process.exit(1);
    }
}

// Run the script
if (require.main === module) {
    main().catch(console.error);
}

module.exports = MCPTester;