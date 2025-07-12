# Model Context Protocol (MCP) Integration

Git Contextor implements the Model Context Protocol (MCP), allowing it to serve as a context provider for AI applications and tools that support MCP.

## What is MCP?

The Model Context Protocol is a standardized way for AI applications to discover and interact with context providers. Git Contextor's MCP implementation allows other tools to access your repository's semantic search capabilities in a standardized way.

## MCP Endpoints

Git Contextor provides the following MCP endpoints:

### Get MCP Specification
```
GET /mcp/v1/spec
Authorization: Bearer <share-api-key>
```

Returns the MCP specification for your repository, including available tools and their parameters.

### Invoke Code Search Tool
```
POST /mcp/v1/tools/code_search/invoke
Authorization: Bearer <share-api-key>
Content-Type: application/json

{
  "query": "your search query"
}
```

## Authentication

MCP endpoints use Bearer token authentication. The token is the API key from a share:

1. Create a share: `git-contextor share create`
2. Use the returned `api_key` as your Bearer token

## Example Usage

### Creating a Share for MCP Access

```bash
# Create a share for MCP access
git-contextor share create --description "MCP Integration" --duration 30d --max-queries 1000

# This will return something like:
# Share ID: abc123
# API Key: sk-abc123...
# URL: http://localhost:3333/shared/abc123
```

### Using cURL to Access MCP

```bash
# Get the MCP specification
curl -H "Authorization: Bearer sk-abc123..." \
     http://localhost:3333/mcp/v1/spec

# Invoke the code search tool
curl -X POST \
     -H "Authorization: Bearer sk-abc123..." \
     -H "Content-Type: application/json" \
     -d '{"query": "authentication logic"}' \
     http://localhost:3333/mcp/v1/tools/code_search/invoke
```

### Python MCP Client

```python
import requests

class GitContextorMCPClient:
    def __init__(self, base_url, api_key):
        self.base_url = base_url.rstrip('/')
        self.headers = {
            'Authorization': f'Bearer {api_key}',
            'Content-Type': 'application/json'
        }
    
    def get_specification(self):
        """Get the MCP specification for this repository."""
        response = requests.get(f'{self.base_url}/mcp/v1/spec', headers=self.headers)
        response.raise_for_status()
        return response.json()
    
    def search_code(self, query):
        """Search for code using the MCP code_search tool."""
        payload = {'query': query}
        response = requests.post(
            f'{self.base_url}/mcp/v1/tools/code_search/invoke',
            headers=self.headers,
            json=payload
        )
        response.raise_for_status()
        return response.json()['content']

# Usage
client = GitContextorMCPClient('http://localhost:3333', 'sk-abc123...')

# Get available tools
spec = client.get_specification()
print(f"Repository: {spec['name']}")
print(f"Available tools: {[tool['name'] for tool in spec['tools']]}")

# Search for code
results = client.search_code('error handling patterns')
print(f"Search results:\n{results}")
```

### Node.js MCP Client

```javascript
class GitContextorMCPClient {
  constructor(baseUrl, apiKey) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.headers = {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    };
  }
  
  async getSpecification() {
    const response = await fetch(`${this.baseUrl}/mcp/v1/spec`, {
      headers: this.headers
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return await response.json();
  }
  
  async searchCode(query) {
    const response = await fetch(`${this.baseUrl}/mcp/v1/tools/code_search/invoke`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({ query })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.content;
  }
}

// Usage
const client = new GitContextorMCPClient('http://localhost:3333', 'sk-abc123...');

// Get available tools
const spec = await client.getSpecification();
console.log(`Repository: ${spec.name}`);
console.log(`Available tools: ${spec.tools.map(t => t.name).join(', ')}`);

// Search for code
const results = await client.searchCode('database connection logic');
console.log(`Search results:\n${results}`);
```

## MCP Tool: code_search

The `code_search` tool is the primary MCP tool provided by Git Contextor. It performs semantic search across your repository and returns formatted results.

### Parameters

- `query` (required): The natural language query to search for

### Response Format

The tool returns a formatted string containing:
- File paths and line numbers
- Relevant code snippets
- Context information

Example response:
```
File: src/auth/jwt.js
Lines: 15-32
```javascript
function generateToken(user) {
  const payload = {
    userId: user.id,
    email: user.email,
    role: user.role
  };
  
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: '24h'
  });
}
```

---

File: src/auth/middleware.js
Lines: 8-25
```javascript
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }
  
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user;
    next();
  });
}
```
```

## Integration with AI Applications

### Claude Desktop

If you're using Claude Desktop, you can integrate Git Contextor as an MCP server:

1. Create a long-term share for MCP access
2. Configure Claude Desktop to use Git Contextor as an MCP server
3. Reference your codebase in conversations with Claude

### Custom AI Applications

For custom AI applications that support MCP:

```python
# Example: Using Git Contextor with a custom AI agent
class CodeAwareAgent:
    def __init__(self, mcp_client, llm_client):
        self.mcp = mcp_client
        self.llm = llm_client
    
    async def answer_question(self, question):
        # Use MCP to get relevant code context
        context = await self.mcp.search_code(question)
        
        # Combine with the user's question
        prompt = f"""
        Based on the following code context, answer the user's question:
        
        Context:
        {context}
        
        Question: {question}
        
        Please provide a comprehensive answer based on the code shown above.
        """
        
        # Get response from your LLM
        response = await self.llm.generate(prompt)
        return response
```

## Security Considerations

1. **API Key Management**: Store MCP API keys securely
2. **Share Expiration**: Set appropriate expiration times for MCP shares
3. **Query Limits**: Monitor and limit the number of queries per share
4. **Network Security**: Use HTTPS in production environments
5. **Access Control**: Only create shares for trusted MCP clients

## Troubleshooting

### Common Issues

1. **401 Unauthorized**: Check that your Bearer token is correct
2. **403 Forbidden**: Verify the share hasn't expired or exceeded query limits
3. **404 Not Found**: Ensure you're using the correct MCP endpoint URLs
4. **Empty Results**: The repository might not be indexed yet

### Debug Information

Enable debug logging to troubleshoot MCP issues:

```bash
DEBUG=true git-contextor start
```

This will provide detailed logs of MCP requests and responses.

## Best Practices

1. **Long-term Shares**: Create shares with longer expiration times for stable MCP integrations
2. **Reasonable Query Limits**: Set appropriate query limits based on expected usage
3. **Error Handling**: Implement proper error handling in your MCP clients
4. **Connection Pooling**: For high-volume MCP usage, consider connection pooling
5. **Monitoring**: Monitor MCP usage through the Git Contextor dashboard

## Next Steps

- Learn about [sharing capabilities](../features/sharing-and-chat.md) for more advanced use cases
- Explore [programmatic access](./programmatic.md) for direct API integration
- Check out [LangChain integration](./langchain.md) for RAG workflows
