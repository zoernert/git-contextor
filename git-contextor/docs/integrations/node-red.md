# Integrating Git Contextor with Node-RED

Node-RED is a visual programming tool for wiring together hardware devices, APIs, and online services. This guide shows how to integrate Git Contextor's semantic search and AI capabilities into your Node-RED flows.

## Overview

Git Contextor provides a REST API that can be easily integrated into Node-RED flows using HTTP request nodes. This enables you to:

- **Query Code Knowledge**: Search your codebase semantically from Node-RED flows
- **AI-Powered Automation**: Use repository context in automated workflows
- **Code Analysis**: Analyze code changes and trigger actions based on findings
- **Documentation Generation**: Create automated documentation workflows

## Prerequisites

- **Node-RED** installed and running
- **Git Contextor** service running with API access
- **API Key** for Git Contextor (found in your `config.json`)

## Basic Integration

### 1. HTTP Request Node Setup

Add an HTTP Request node to your flow with the following configuration:

- **Method**: `POST`
- **URL**: `http://localhost:3333/api/search`
- **Headers**: 
  - `Content-Type`: `application/json`
  - `x-api-key`: `your-git-contextor-api-key`

### 2. Payload Preparation

Before the HTTP request node, add a Function node to prepare the search payload:

```javascript
// Function node to prepare Git Contextor search request
msg.payload = {
    query: msg.payload.searchQuery || "authentication logic",
    maxTokens: 2048,
    includeMetadata: true
};

msg.headers = {
    'Content-Type': 'application/json',
    'x-api-key': 'your-git-contextor-api-key'
};

return msg;
```

### 3. Response Processing

Add another Function node after the HTTP request to process the response:

```javascript
// Function node to process Git Contextor response
if (msg.payload && msg.payload.results) {
    const results = msg.payload.results;
    
    // Extract relevant information
    msg.codeContext = results.map(item => ({
        file: item.metadata.file,
        content: item.content,
        relevance: item.similarity
    }));
    
    // Create summary
    msg.summary = {
        totalResults: results.length,
        topFile: results[0]?.metadata?.file || "N/A",
        searchQuery: msg.payload.query
    };
}

return msg;
```

## Advanced Use Cases

### 1. Code Change Analysis

Create a flow that analyzes code changes and provides context:

```javascript
// Webhook trigger for Git events
[Webhook] → [Function: Extract Changed Files] → [Git Contextor Search] → [AI Analysis] → [Slack Notification]
```

Function node for file analysis:
```javascript
// Analyze changed files
const changedFiles = msg.payload.commits[0].modified || [];
const searchQueries = changedFiles.map(file => ({
    query: `file:${file} purpose functionality`,
    context: `analyzing changes in ${file}`
}));

msg.searchQueries = searchQueries;
return msg;
```

### 2. Automated Documentation

Create documentation based on code context:

```javascript
// Documentation generation flow
[Schedule] → [Git Contextor Search] → [Format Documentation] → [Save to Wiki]
```

Documentation formatter:
```javascript
// Format search results into documentation
const results = msg.payload.results;
let documentation = `# Code Documentation\n\n`;

results.forEach(result => {
    documentation += `## ${result.metadata.file}\n\n`;
    documentation += `${result.content}\n\n`;
    documentation += `*Relevance: ${result.similarity}*\n\n`;
});

msg.documentation = documentation;
return msg;
```

### 3. Intelligent Monitoring

Monitor code quality and complexity:

```javascript
// Code quality monitoring
[Timer] → [Git Contextor Search] → [Analyze Complexity] → [Alert if Issues]
```

Complexity analysis:
```javascript
// Analyze code complexity from search results
const results = msg.payload.results;
let complexityIssues = [];

results.forEach(result => {
    const content = result.content;
    
    // Simple complexity metrics
    const lineCount = content.split('\n').length;
    const cyclomaticComplexity = (content.match(/if|for|while|case/g) || []).length;
    
    if (lineCount > 100 || cyclomaticComplexity > 10) {
        complexityIssues.push({
            file: result.metadata.file,
            lines: lineCount,
            complexity: cyclomaticComplexity
        });
    }
});

msg.complexityIssues = complexityIssues;
return msg;
```

## Integration Patterns

### 1. Event-Driven Code Analysis

```json
{
    "flow": [
        {
            "id": "webhook-trigger",
            "type": "http in",
            "name": "Git Webhook",
            "url": "/git-hook",
            "method": "post"
        },
        {
            "id": "extract-changes",
            "type": "function",
            "name": "Extract Changes",
            "func": "// Extract changed files from webhook payload"
        },
        {
            "id": "search-context",
            "type": "http request",
            "name": "Search Git Contextor",
            "method": "POST",
            "url": "http://localhost:3333/api/search"
        },
        {
            "id": "analyze-impact",
            "type": "function",
            "name": "Analyze Impact",
            "func": "// Analyze the impact of changes"
        },
        {
            "id": "notify-team",
            "type": "http request",
            "name": "Notify Slack",
            "method": "POST",
            "url": "https://hooks.slack.com/services/..."
        }
    ]
}
```

### 2. Scheduled Code Reviews

```javascript
// Weekly code review automation
[Schedule: Weekly] → [Git Contextor Chat] → [Generate Review] → [Email Team]
```

Chat API integration:
```javascript
// Use Git Contextor chat API for code reviews
msg.payload = {
    query: "What are the main changes this week? Any potential issues?",
    context_type: "code_review"
};

msg.headers = {
    'Content-Type': 'application/json',
    'x-api-key': 'your-git-contextor-api-key'
};

// Send to /api/chat endpoint
return msg;
```

### 3. Dynamic Documentation

```javascript
// Real-time documentation updates
[File Change] → [Git Contextor Search] → [Update Documentation] → [Sync to Portal]
```

## Error Handling

Add error handling to your Git Contextor integration:

```javascript
// Error handling function
if (msg.statusCode !== 200) {
    node.error("Git Contextor API error: " + msg.statusCode, msg);
    
    // Fallback behavior
    msg.payload = {
        error: true,
        message: "Git Contextor unavailable",
        fallback: "Using cached results"
    };
}

return msg;
```

## Security Considerations

1. **API Key Management**: Store API keys in Node-RED environment variables
2. **Network Security**: Use HTTPS for production deployments
3. **Rate Limiting**: Implement rate limiting to avoid overwhelming Git Contextor
4. **Input Validation**: Validate search queries and parameters

## Performance Optimization

1. **Caching**: Cache frequent search results in Node-RED context
2. **Batching**: Batch multiple queries when possible
3. **Filtering**: Use specific file extensions and paths to limit search scope
4. **Timeout Handling**: Set appropriate timeouts for HTTP requests

## Example Flows

### Complete Code Analysis Flow

```json
{
    "name": "Git Contextor Code Analysis",
    "nodes": [
        {
            "id": "trigger",
            "type": "inject",
            "name": "Daily Analysis",
            "cron": "0 9 * * *"
        },
        {
            "id": "search",
            "type": "http request",
            "name": "Search Recent Changes",
            "method": "POST",
            "url": "http://localhost:3333/api/search",
            "headers": {
                "x-api-key": "your-key"
            }
        },
        {
            "id": "format",
            "type": "function",
            "name": "Format Report",
            "func": "// Format analysis report"
        },
        {
            "id": "email",
            "type": "e-mail",
            "name": "Send Report",
            "server": "smtp.company.com"
        }
    ]
}
```

## Troubleshooting

### Common Issues

1. **Connection Errors**: Check Git Contextor service status
2. **Authentication**: Verify API key configuration
3. **Empty Results**: Ensure repository is indexed
4. **Timeout**: Increase HTTP request timeout settings

### Debug Commands

```bash
# Test Git Contextor API
curl -X POST http://localhost:3333/api/search \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-key" \
  -d '{"query": "test query"}'

# Check Node-RED logs
docker logs node-red-container

# Verify connectivity
ping localhost
```

## Resources

- [Node-RED Documentation](https://nodered.org/docs/)
- [Git Contextor API Reference](../API_REFERENCE.md)
- [Git Contextor Configuration Guide](../ADVANCED_CONFIGURATION.md)
- [Node-RED Community](https://discourse.nodered.org/)
