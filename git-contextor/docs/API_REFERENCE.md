# Git Contextor API Reference

Complete reference for all Git Contextor REST API endpoints, including request/response formats, authentication, and usage examples.

## Base URL and Authentication

**Base URL:** `http://localhost:3333` (configurable via `services.port` in config)

**Authentication:** Most endpoints require an API key in the `x-api-key` header:

```bash
curl -H "x-api-key: your-api-key" http://localhost:3333/api/status
```

Find your API key in `.gitcontextor/config.json` under `services.apiKey`.

## Public Endpoints

These endpoints don't require authentication:

### Health Check

Check if the API server is running.

```
GET /health
```

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2023-10-27T10:00:00.000Z",
  "version": "1.1.6"
}
```

### UI Configuration (localhost only)

Get configuration for the web UI.

```
GET /api/uiconfig
```

**Response:**
```json
{
  "apiKey": "generated-api-key",
  "features": {
    "fileBrowser": {
      "enabled": true
    }
  }
}
```

### Documentation (localhost only)

List available documentation files.

```
GET /api/docs
```

**Response:**
```json
[
  {
    "name": "API REFERENCE",
    "filename": "API.md"
  },
  {
    "name": "USER GUIDE",
    "filename": "GUIDE.md"
  }
]
```

Get specific documentation file.

```
GET /api/docs/{filename}
```

**Response:** Markdown content of the file.

## Core API Endpoints

All endpoints below require the `x-api-key` header.

### Service Status

Get current status of Git Contextor services.

```
GET /api/status
```

**Response:**
```json
{
  "status": "running",
  "repository": {
    "name": "my-project",
    "path": "/path/to/my-project"
  },
  "indexer": {
    "status": "idle",
    "totalFiles": 150,
    "totalChunks": 2500,
    "lastActivity": "2023-10-27T09:55:00.000Z"
  },
  "watcher": {
    "status": "enabled"
  },
  "fileWatcher": {
    "latestActivity": []
  }
}
```

### System Metrics

Get detailed performance metrics.

```
GET /api/metrics
```

**Response:**
```json
{
  "timestamp": "2023-10-27T10:01:00.000Z",
  "indexer": {
    "totalFiles": 150,
    "totalChunks": 2500,
    "errorCount": 5
  },
  "vectorStore": {
    "totalVectors": 2500,
    "avgDimensions": 1536
  },
  "system": {
    "memoryUsageMb": "128.50",
    "cpuUsage": 0
  }
}
```

## Search and Chat APIs

### Semantic Search

Perform semantic search across the repository.

```
POST /api/search
Content-Type: application/json
```

**Request Body:**
```json
{
  "query": "authentication logic",
  "maxTokens": 4096,
  "filter": {
    "fileTypes": ["js", "ts"]
  },
  "llmType": "claude-sonnet"
}
```

**Parameters:**
- `query` (required): Natural language search query
- `maxTokens` (optional): Maximum tokens in response (default: 4096)
- `filter` (optional): Filter options
- `llmType` (optional): LLM type for optimization

**Response:**
```json
{
  "query": "authentication logic",
  "optimizedContext": "--- File: src/auth/jwt.js (Score: 0.92) ---\n...",
  "results": [
    {
      "filePath": "src/auth/jwt.js",
      "score": 0.92,
      "content": "function generateToken(user) { ... }",
      "startLine": 10,
      "endLine": 25
    }
  ],
  "tokenCount": 1024
}
```

### AI Chat

Send queries to AI using repository context.

```
POST /api/chat
Content-Type: application/json
```

**Request Body:**
```json
{
  "query": "Explain the authentication flow",
  "context_type": "general",
  "include_summary": true
}
```

**Parameters:**
- `query` (required): Natural language query
- `context_type` (optional): Context type (general|architecture|security)
- `include_summary` (optional): Include collection summary

**Response:**
```json
{
  "query": "Explain the authentication flow",
  "response": "The authentication flow in this project...",
  "context": [
    {
      "filePath": "src/auth/jwt.js",
      "score": 0.92,
      "content": "function generateToken...",
      "startLine": 10,
      "endLine": 25
    }
  ]
}
```

## Repository Management APIs

### Reindex Repository

Trigger reindexing of the repository.

```
POST /api/reindex
Content-Type: application/json
```

**Request Body (optional):**
```json
{
  "file": "src/auth/jwt.js"
}
```

**Response (full reindex):**
```json
{
  "message": "Full repository reindex started."
}
```

**Response (file reindex):**
```json
{
  "message": "Successfully reindexed file: src/auth/jwt.js"
}
```

### Clear Index

Clear the entire vector index.

```
DELETE /api/reindex
```

**Response:**
```json
{
  "message": "Collection and index data cleared successfully."
}
```

## Collection Management APIs

### Get Collection Summary

Get AI-generated repository summary.

```
GET /api/collection/summary
```

**Response:** Plain text Markdown summary of the repository.

### Generate Collection Summary

Trigger generation of a new collection summary.

```
POST /api/collection/summarize
Content-Type: application/json
```

**Request Body (optional):**
```json
{
  "numClusters": 15
}
```

**Response:**
```json
{
  "message": "Collection summary generation started. This may take a few minutes."
}
```

## File Browser APIs

### Get File Tree

Get repository file structure.

```
GET /api/files/tree
```

**Response:**
```json
[
  {
    "name": "src",
    "type": "directory",
    "path": "src",
    "children": [
      {
        "name": "index.js",
        "type": "file",
        "path": "src/index.js"
      }
    ]
  }
]
```

### Get File Content

Get content of a specific file.

```
GET /api/files/content?path=src/index.js
```

**Response:**
```json
{
  "content": "const express = require('express');\n..."
}
```

## Configuration APIs

### Get Configuration

Get current Git Contextor configuration.

```
GET /api/config
```

**Response:**
```json
{
  "version": "1.0.0",
  "repository": {
    "path": "/path/to/repo",
    "name": "my-repo"
  },
  "embedding": {
    "provider": "local",
    "model": "Xenova/all-MiniLM-L6-v2",
    "dimensions": 384
  },
  "services": {
    "port": 3333
  }
}
```

### Update Configuration

Update Git Contextor configuration.

```
POST /api/config
Content-Type: application/json
```

**Request Body:**
```json
{
  "embedding": {
    "provider": "openai",
    "model": "text-embedding-3-small",
    "dimensions": 1536
  }
}
```

**Response:**
```json
{
  "message": "Configuration saved. Please restart the service to apply changes."
}
```

### Update Monitoring Settings

Update file watching settings.

```
POST /api/config/monitoring
Content-Type: application/json
```

**Request Body:**
```json
{
  "enabled": true
}
```

**Response:**
```json
{
  "message": "Monitoring settings updated. Please restart the service to apply changes."
}
```

## Sharing APIs

### Create Share

Create a new share for public access.

```
POST /api/share
Content-Type: application/json
```

**Request Body:**
```json
{
  "description": "Code review access",
  "expires_at": "2023-11-01T00:00:00Z",
  "max_queries": 100,
  "scope": ["general", "architecture"]
}
```

**Response:**
```json
{
  "id": "abc123",
  "description": "Code review access",
  "expires_at": "2023-11-01T00:00:00Z",
  "max_queries": 100,
  "access_count": 0,
  "scope": ["general", "architecture"],
  "api_key": "sk-share-abc123...",
  "url": "http://localhost:3333/shared/abc123"
}
```

### List Shares

List all active shares.

```
GET /api/share
```

**Response:**
```json
{
  "shares": [
    {
      "id": "abc123",
      "description": "Code review access",
      "expires_at": "2023-11-01T00:00:00Z",
      "max_queries": 100,
      "access_count": 5,
      "scope": ["general"]
    }
  ]
}
```

### Tunnel Management

Start a tunnel service.

```
POST /api/share/tunnel
Content-Type: application/json
```

**Request Body:**
```json
{
  "service": "localtunnel"
}
```

**Response:**
```json
{
  "message": "Tunnel service 'localtunnel' is starting."
}
```

Get tunnel status.

```
GET /api/share/tunnel
```

**Response:**
```json
{
  "status": "running",
  "url": "https://abc123.localtunnel.me",
  "service": "localtunnel"
}
```

Stop tunnel.

```
DELETE /api/share/tunnel
```

**Response:**
```json
{
  "message": "Tunnel stopped."
}
```

## Shared Access APIs

These APIs use share-specific authentication with the `x-share-key` header.

### Shared File Tree

Get file tree for a shared repository.

```
GET /shared/{shareId}/files/tree
x-share-key: share-api-key
```

**Response:** Same format as `/api/files/tree`

### Shared File Content

Get file content for a shared repository.

```
GET /shared/{shareId}/files/content?path=src/index.js
x-share-key: share-api-key
```

**Response:** Same format as `/api/files/content`

### Shared Chat

Chat with a shared repository.

```
POST /shared/{shareId}/chat
Content-Type: application/json
x-share-key: share-api-key
```

**Request Body:**
```json
{
  "query": "How does authentication work?"
}
```

**Response:**
```json
{
  "query": "How does authentication work?",
  "response": "Authentication in this project...",
  "context": [...],
  "share_id": "abc123",
  "queries_remaining": 95
}
```

### Share Information

Get information about a specific share.

```
GET /shared/{shareId}/info
x-share-key: share-api-key
```

**Response:**
```json
{
  "share_id": "abc123",
  "description": "Code review access",
  "expires_at": "2023-11-01T00:00:00Z",
  "queries_used": 5,
  "queries_remaining": 95,
  "scope": ["general"]
}
```

## Model Context Protocol (MCP) APIs

These APIs use Bearer token authentication with share API keys.

### Get MCP Specification

Get the MCP specification for the repository.

```
GET /mcp/v1/spec
Authorization: Bearer share-api-key
```

**Response:**
```json
{
  "name": "Git Contextor: my-repo",
  "description": "Provides context-aware search for the my-repo repository.",
  "tools": [
    {
      "name": "code_search",
      "description": "Searches the repository for code snippets...",
      "parameters": {
        "type": "object",
        "properties": {
          "query": {
            "type": "string",
            "description": "The natural language query to search for."
          }
        },
        "required": ["query"]
      }
    }
  ]
}
```

### Invoke MCP Code Search

Invoke the MCP code search tool.

```
POST /mcp/v1/tools/code_search/invoke
Authorization: Bearer share-api-key
Content-Type: application/json
```

**Request Body:**
```json
{
  "query": "authentication logic"
}
```

**Response:**
```json
{
  "content": "File: src/auth/jwt.js\nLines: 15-32\n```javascript\nfunction generateToken(user) { ... }\n```"
}
```

## Error Responses

All endpoints return standard HTTP status codes and error objects:

### 400 Bad Request
```json
{
  "error": "Missing required field: query"
}
```

### 401 Unauthorized
```json
{
  "error": "Unauthorized"
}
```

### 403 Forbidden
```json
{
  "error": "Forbidden: This resource is only available on localhost."
}
```

### 404 Not Found
```json
{
  "error": "File not found."
}
```

### 500 Internal Server Error
```json
{
  "error": "Internal Server Error"
}
```

### 503 Service Unavailable
```json
{
  "error": "Service unavailable - configuration mismatch detected"
}
```

## Rate Limiting

- **Regular API**: No explicit rate limits, but bounded by system resources
- **Shared Access**: Limited by share query quotas
- **MCP API**: Limited by share query quotas

## Best Practices

### Authentication
- Store API keys securely
- Use environment variables for automation
- Rotate keys regularly for shares

### Performance
- Use appropriate `maxTokens` limits
- Cache responses when possible
- Use specific filters to reduce search scope

### Error Handling
- Always check HTTP status codes
- Implement retry logic for transient failures
- Handle quota exhaustion gracefully

### Usage Patterns
- Use search for finding relevant code
- Use chat for explanatory queries
- Use file browser for exploration
- Use shares for collaboration

## SDK Examples

### JavaScript/Node.js

```javascript
class GitContextorAPI {
  constructor(baseUrl, apiKey) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.apiKey = apiKey;
  }
  
  async search(query, options = {}) {
    const response = await fetch(`${this.baseUrl}/api/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey
      },
      body: JSON.stringify({ query, ...options })
    });
    
    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }
    
    return await response.json();
  }
  
  async chat(query, contextType = 'general') {
    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey
      },
      body: JSON.stringify({ 
        query, 
        context_type: contextType,
        include_summary: true 
      })
    });
    
    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }
    
    return await response.json();
  }
  
  async getStatus() {
    const response = await fetch(`${this.baseUrl}/api/status`, {
      headers: { 'x-api-key': this.apiKey }
    });
    
    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }
    
    return await response.json();
  }
}
```

### Python

```python
import requests

class GitContextorAPI:
    def __init__(self, base_url, api_key):
        self.base_url = base_url.rstrip('/')
        self.api_key = api_key
        self.headers = {
            'x-api-key': api_key,
            'Content-Type': 'application/json'
        }
    
    def search(self, query, **options):
        payload = {'query': query, **options}
        response = requests.post(
            f'{self.base_url}/api/search',
            headers=self.headers,
            json=payload
        )
        response.raise_for_status()
        return response.json()
    
    def chat(self, query, context_type='general'):
        payload = {
            'query': query,
            'context_type': context_type,
            'include_summary': True
        }
        response = requests.post(
            f'{self.base_url}/api/chat',
            headers=self.headers,
            json=payload
        )
        response.raise_for_status()
        return response.json()
    
    def get_status(self):
        response = requests.get(
            f'{self.base_url}/api/status',
            headers=self.headers
        )
        response.raise_for_status()
        return response.json()
```

## Next Steps

- Review the [OpenAPI specification](./openapi.json) for complete API documentation
- Try the [programmatic integration guide](./integrations/programmatic.md) for practical examples
- Explore [sharing features](./features/sharing-and-chat.md) for collaboration
- Check out [MCP integration](./integrations/mcp.md) for AI tool integration
