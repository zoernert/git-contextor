const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  GetPromptRequestSchema,
  ListPromptsRequestSchema,
} = require('@modelcontextprotocol/sdk/types.js');
const logger = require('../cli/utils/logger');

class MCPServer {
  constructor(services, config) {
    this.services = services;
    this.config = config;
    this.server = null;
    this.transport = null;
  }

  createServer() {
    this.server = new Server(
      {
        name: 'git-contextor',
        version: require('../../package.json').version,
      },
      {
        capabilities: {
          tools: {},
          resources: {},
          prompts: {},
        },
      }
    );

    this.setupHandlers();
    return this.server;
  }

  setupHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'semantic_search',
            description: 'Search the repository using semantic/natural language queries',
            inputSchema: {
              type: 'object',
              properties: {
                query: {
                  type: 'string',
                  description: 'Natural language search query'
                },
                maxTokens: {
                  type: 'number',
                  description: 'Maximum tokens to return (default: 2048)',
                  default: 2048
                }
              },
              required: ['query']
            }
          },
          {
            name: 'ask_ai',
            description: 'Ask AI questions about the repository with context',
            inputSchema: {
              type: 'object',
              properties: {
                query: {
                  type: 'string',
                  description: 'Question to ask about the repository'
                },
                includeSummary: {
                  type: 'boolean',
                  description: 'Include repository summary in context',
                  default: false
                }
              },
              required: ['query']
            }
          },
          {
            name: 'get_file_content',
            description: 'Get the content of a specific file',
            inputSchema: {
              type: 'object',
              properties: {
                filePath: {
                  type: 'string',
                  description: 'Relative path to the file'
                }
              },
              required: ['filePath']
            }
          }
        ]
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'semantic_search':
            return await this.handleSemanticSearch(args);
          case 'ask_ai':
            return await this.handleAskAI(args);
          case 'get_file_content':
            return await this.handleGetFileContent(args);
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        logger.error(`MCP tool error (${name}):`, error);
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${error.message}`,
            },
          ],
          isError: true,
        };
      }
    });

    // List available resources
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => {
      return {
        resources: [
          {
            uri: 'repo://summary',
            name: 'Repository Summary',
            description: 'AI-generated overview of the repository structure and purpose',
            mimeType: 'text/markdown'
          },
          {
            uri: 'repo://status',
            name: 'Repository Status',
            description: 'Current indexing status and statistics',
            mimeType: 'application/json'
          },
          {
            uri: 'repo://files',
            name: 'File Tree',
            description: 'Repository file structure',
            mimeType: 'application/json'
          }
        ]
      };
    });

    // Read specific resources
    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const { uri } = request.params;

      try {
        switch (uri) {
          case 'repo://summary':
            return await this.handleGetSummary();
          case 'repo://status':
            return await this.handleGetStatus();
          case 'repo://files':
            return await this.handleGetFileTree();
          default:
            throw new Error(`Unknown resource: ${uri}`);
        }
      } catch (error) {
        logger.error(`MCP resource error (${uri}):`, error);
        throw error;
      }
    });

    // List available prompts
    this.server.setRequestHandler(ListPromptsRequestSchema, async () => {
      return {
        prompts: [
          {
            name: 'code_review',
            description: 'Generate a code review prompt with repository context',
            arguments: [
              {
                name: 'filePath',
                description: 'File to review',
                required: false
              }
            ]
          },
          {
            name: 'documentation',
            description: 'Generate documentation for code',
            arguments: [
              {
                name: 'topic',
                description: 'Specific topic to document',
                required: false
              }
            ]
          }
        ]
      };
    });

    // Handle prompt requests
    this.server.setRequestHandler(GetPromptRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      switch (name) {
        case 'code_review':
          return await this.handleCodeReviewPrompt(args);
        case 'documentation':
          return await this.handleDocumentationPrompt(args);
        default:
          throw new Error(`Unknown prompt: ${name}`);
      }
    });
  }

  // Tool handlers
  async handleSemanticSearch(args) {
    const { query, maxTokens = 2048 } = args;
    const result = await this.services.contextOptimizer.search(query, { maxTokens });

    let response = `# Search Results for: "${query}"\n\n`;
    
    if (result.results && result.results.length > 0) {
      response += `Found ${result.results.length} relevant code chunks (${result.tokenCount} tokens):\n\n`;
      response += result.optimizedContext;
    } else {
      response += 'No relevant code found for this query.';
    }

    return {
      content: [
        {
          type: 'text',
          text: response,
        },
      ],
    };
  }

  async handleAskAI(args) {
    const { query, includeSummary = false } = args;
    
    try {
      const result = await this.services.contextOptimizer.chat(query, { includeSummary });

      return {
        content: [
          {
            type: 'text',
            text: result.response,
          },
        ],
      };
    } catch (error) {
      throw new Error(`AI chat failed: ${error.message}`);
    }
  }

  async handleGetFileContent(args) {
    const { filePath } = args;
    const fs = require('fs').promises;
    const path = require('path');

    try {
      const fullPath = path.join(this.config.repository.path, filePath);
      
      // Security check
      if (!fullPath.startsWith(this.config.repository.path)) {
        throw new Error('File path is outside repository');
      }

      const content = await fs.readFile(fullPath, 'utf8');
      
      return {
        content: [
          {
            type: 'text',
            text: `# ${filePath}\n\n\`\`\`\n${content}\n\`\`\``,
          },
        ],
      };
    } catch (error) {
      throw new Error(`Failed to read file: ${error.message}`);
    }
  }

  // Resource handlers
  async handleGetSummary() {
    try {
      const summary = await this.services.contextOptimizer.getOrCreateSummary();
      
      return {
        contents: [
          {
            uri: 'repo://summary',
            mimeType: 'text/markdown',
            text: summary || 'No summary available. Generate one using the update summary feature.',
          },
        ],
      };
    } catch (error) {
      throw new Error(`Failed to get summary: ${error.message}`);
    }
  }

  async handleGetStatus() {
    const status = await this.services.indexer.getStatus();
    
    return {
      contents: [
        {
          uri: 'repo://status',
          mimeType: 'application/json',
          text: JSON.stringify(status, null, 2),
        },
      ],
    };
  }

  async handleGetFileTree() {
    // Simplified file tree - in a real implementation, you'd want to use the existing file browser logic
    const fs = require('fs').promises;
    const path = require('path');

    try {
      const files = await this.getFileList(this.config.repository.path);
      
      return {
        contents: [
          {
            uri: 'repo://files',
            mimeType: 'application/json',
            text: JSON.stringify({ files }, null, 2),
          },
        ],
      };
    } catch (error) {
      throw new Error(`Failed to get file tree: ${error.message}`);
    }
  }

  async getFileList(dir, relativeTo = dir) {
    const fs = require('fs').promises;
    const path = require('path');
    const files = [];

    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const relativePath = path.relative(relativeTo, fullPath);
        
        // Skip git and node_modules
        if (entry.name.startsWith('.') || entry.name === 'node_modules') {
          continue;
        }

        if (entry.isFile()) {
          files.push(relativePath);
        } else if (entry.isDirectory()) {
          const subFiles = await this.getFileList(fullPath, relativeTo);
          files.push(...subFiles);
        }
      }
    } catch (error) {
      logger.debug(`Error reading directory ${dir}:`, error);
    }

    return files;
  }

  // Prompt handlers
  async handleCodeReviewPrompt(args) {
    const { filePath } = args || {};
    
    let prompt = `Please review this code for:
- Code quality and best practices
- Potential bugs or issues
- Performance considerations
- Security concerns
- Documentation completeness

`;

    if (filePath) {
      prompt += `Focus on the file: ${filePath}\n\n`;
    } else {
      prompt += `Review the most relevant code based on the context provided.\n\n`;
    }

    return {
      description: 'Code review prompt with repository context',
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: prompt,
          },
        },
      ],
    };
  }

  async handleDocumentationPrompt(args) {
    const { topic } = args || {};
    
    let prompt = `Generate comprehensive documentation for this codebase including:
- Overview and purpose
- Architecture and key components
- Setup and installation instructions
- Usage examples
- API documentation (if applicable)

`;

    if (topic) {
      prompt += `Focus specifically on: ${topic}\n\n`;
    }

    return {
      description: 'Documentation generation prompt',
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: prompt,
          },
        },
      ],
    };
  }

  // Start MCP server with stdio transport (for VS Code)
  async start() {
    if (!this.server) {
      this.createServer();
    }

    this.transport = new StdioServerTransport();
    await this.server.connect(this.transport);
    logger.info('MCP server started with stdio transport');
  }

  // Start MCP server with stdio transport (for VS Code)
  async startStdio() {
    return this.start();
  }

  async stop() {
    if (this.server && this.transport) {
      await this.server.close();
      logger.info('MCP server stopped');
    }
  }
}

module.exports = MCPServer;
