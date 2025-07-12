# Programmatic Access - Node.js & Python

This guide shows how to interact with Git Contextor programmatically using direct API calls from Node.js and Python applications.

## Getting Started

First, ensure Git Contextor is running locally:
```bash
git-contextor start
```

The API will be available at `http://localhost:3333` (or your configured port).

## Authentication

All API endpoints (except public ones) require authentication using the `x-api-key` header. You can find your API key in the `.gitcontextor/config.json` file:

```json
{
  "services": {
    "apiKey": "your-api-key-here",
    "port": 3333
  }
}
```

## Node.js Examples

### Basic Search

```javascript
const fetch = require('node-fetch');

async function searchCode(query, maxTokens = 2048) {
  const response = await fetch('http://localhost:3333/api/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': 'your-api-key-here'
    },
    body: JSON.stringify({
      query: query,
      maxTokens: maxTokens
    })
  });
  
  const data = await response.json();
  return data;
}

// Usage
searchCode('authentication logic')
  .then(results => {
    console.log('Optimized Context:', results.optimizedContext);
    console.log('Token Count:', results.tokenCount);
  })
  .catch(err => console.error('Error:', err));
```

### AI Chat

```javascript
async function chatWithRepository(query, contextType = 'general') {
  const response = await fetch('http://localhost:3333/api/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': 'your-api-key-here'
    },
    body: JSON.stringify({
      query: query,
      context_type: contextType,
      include_summary: true
    })
  });
  
  const data = await response.json();
  return data;
}

// Usage
chatWithRepository('Explain the authentication flow')
  .then(result => {
    console.log('AI Response:', result.response);
    console.log('Context Used:', result.context.length, 'chunks');
  })
  .catch(err => console.error('Error:', err));
```

### File Browser

```javascript
async function getFileTree() {
  const response = await fetch('http://localhost:3333/api/files/tree', {
    headers: {
      'x-api-key': 'your-api-key-here'
    }
  });
  
  return await response.json();
}

async function getFileContent(filePath) {
  const response = await fetch(`http://localhost:3333/api/files/content?path=${encodeURIComponent(filePath)}`, {
    headers: {
      'x-api-key': 'your-api-key-here'
    }
  });
  
  const data = await response.json();
  return data.content;
}

// Usage
getFileTree().then(tree => console.log('Repository structure:', tree));
getFileContent('src/index.js').then(content => console.log('File content:', content));
```

### Repository Status

```javascript
async function getRepositoryStatus() {
  const response = await fetch('http://localhost:3333/api/status', {
    headers: {
      'x-api-key': 'your-api-key-here'
    }
  });
  
  return await response.json();
}

// Usage
getRepositoryStatus().then(status => {
  console.log('Repository:', status.repository.name);
  console.log('Indexed Files:', status.indexer.totalFiles);
  console.log('Total Chunks:', status.indexer.totalChunks);
});
```

## Python Examples

### Basic Search

```python
import requests
import json

def search_code(query, max_tokens=2048):
    url = 'http://localhost:3333/api/search'
    headers = {
        'Content-Type': 'application/json',
        'x-api-key': 'your-api-key-here'
    }
    payload = {
        'query': query,
        'maxTokens': max_tokens
    }
    
    response = requests.post(url, headers=headers, json=payload)
    response.raise_for_status()
    return response.json()

# Usage
results = search_code('authentication logic')
print(f"Optimized Context: {results['optimizedContext']}")
print(f"Token Count: {results['tokenCount']}")
```

### AI Chat

```python
def chat_with_repository(query, context_type='general'):
    url = 'http://localhost:3333/api/chat'
    headers = {
        'Content-Type': 'application/json',
        'x-api-key': 'your-api-key-here'
    }
    payload = {
        'query': query,
        'context_type': context_type,
        'include_summary': True
    }
    
    response = requests.post(url, headers=headers, json=payload)
    response.raise_for_status()
    return response.json()

# Usage
result = chat_with_repository('Explain the authentication flow')
print(f"AI Response: {result['response']}")
print(f"Context Used: {len(result['context'])} chunks")
```

### File Browser

```python
def get_file_tree():
    url = 'http://localhost:3333/api/files/tree'
    headers = {'x-api-key': 'your-api-key-here'}
    
    response = requests.get(url, headers=headers)
    response.raise_for_status()
    return response.json()

def get_file_content(file_path):
    url = f'http://localhost:3333/api/files/content'
    headers = {'x-api-key': 'your-api-key-here'}
    params = {'path': file_path}
    
    response = requests.get(url, headers=headers, params=params)
    response.raise_for_status()
    return response.json()['content']

# Usage
tree = get_file_tree()
print(f"Repository structure: {json.dumps(tree, indent=2)}")

content = get_file_content('src/index.js')
print(f"File content: {content}")
```

### Repository Management

```python
def get_repository_status():
    url = 'http://localhost:3333/api/status'
    headers = {'x-api-key': 'your-api-key-here'}
    
    response = requests.get(url, headers=headers)
    response.raise_for_status()
    return response.json()

def trigger_reindex(file_path=None):
    url = 'http://localhost:3333/api/reindex'
    headers = {
        'Content-Type': 'application/json',
        'x-api-key': 'your-api-key-here'
    }
    payload = {'file': file_path} if file_path else {}
    
    response = requests.post(url, headers=headers, json=payload)
    response.raise_for_status()
    return response.json()

# Usage
status = get_repository_status()
print(f"Repository: {status['repository']['name']}")
print(f"Indexed Files: {status['indexer']['totalFiles']}")
print(f"Total Chunks: {status['indexer']['totalChunks']}")

# Trigger full reindex
reindex_result = trigger_reindex()
print(f"Reindex Status: {reindex_result['message']}")
```

## Error Handling

Always handle API errors appropriately:

### Node.js
```javascript
async function safeApiCall(apiFunction) {
  try {
    const result = await apiFunction();
    return result;
  } catch (error) {
    if (error.response) {
      console.error('API Error:', error.response.status, error.response.data);
    } else if (error.request) {
      console.error('Network Error: No response received');
    } else {
      console.error('Error:', error.message);
    }
    throw error;
  }
}
```

### Python
```python
def safe_api_call(func, *args, **kwargs):
    try:
        return func(*args, **kwargs)
    except requests.exceptions.HTTPError as e:
        print(f"HTTP Error: {e.response.status_code} - {e.response.text}")
        raise
    except requests.exceptions.ConnectionError:
        print("Connection Error: Could not connect to Git Contextor")
        raise
    except requests.exceptions.RequestException as e:
        print(f"Request Error: {e}")
        raise
```

## Best Practices

1. **Cache API Keys**: Store your API key in environment variables or configuration files
2. **Rate Limiting**: Be mindful of API rate limits, especially for bulk operations
3. **Error Handling**: Always implement proper error handling
4. **Async Operations**: Use async/await patterns for better performance
5. **Connection Pooling**: For high-volume applications, consider connection pooling
6. **Timeouts**: Set appropriate timeouts for API calls

## Environment Variables

For security, store your API key in environment variables:

### Node.js
```javascript
const API_KEY = process.env.GITCONTEXTOR_API_KEY;
const API_BASE = process.env.GITCONTEXTOR_API_BASE || 'http://localhost:3333';
```

### Python
```python
import os

API_KEY = os.getenv('GITCONTEXTOR_API_KEY')
API_BASE = os.getenv('GITCONTEXTOR_API_BASE', 'http://localhost:3333')
```

## Next Steps

- Check out the [OpenAPI specification](../openapi.json) for complete API documentation
- Explore [LangChain integration](./langchain.md) for advanced RAG workflows
- Learn about [sharing capabilities](../features/sharing-and-chat.md) for collaborative development
