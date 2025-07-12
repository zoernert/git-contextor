# Advanced Configuration Guide

Git Contextor offers extensive configuration options to fine-tune performance, customize behavior, and integrate with various providers. This guide covers advanced configuration scenarios and best practices.

## Configuration File Location

The configuration file is located at `.gitcontextor/config.json` in your repository root. You can edit it directly or use the CLI:

```bash
# Show current configuration
git-contextor config --show

# Edit configuration via web UI
# Navigate to Configuration tab in the dashboard
```

## Complete Configuration Reference

### Embedding Providers

#### Local Embeddings (Default)
```json
{
  "embedding": {
    "provider": "local",
    "model": "Xenova/all-MiniLM-L6-v2",
    "dimensions": 384
  }
}
```

**Supported local models:**
- `Xenova/all-MiniLM-L6-v2` (384 dimensions) - Fast, lightweight
- `Xenova/all-mpnet-base-v2` (768 dimensions) - Higher quality
- `Xenova/multilingual-e5-large` (1024 dimensions) - Multilingual support

#### OpenAI Embeddings
```json
{
  "embedding": {
    "provider": "openai",
    "model": "text-embedding-3-small",
    "apiKey": "sk-...",
    "dimensions": 1536
  }
}
```

**Supported OpenAI models:**
- `text-embedding-3-small` (1536 dimensions) - Cost-effective
- `text-embedding-3-large` (3072 dimensions) - Highest quality
- `text-embedding-ada-002` (1536 dimensions) - Legacy

#### Google Gemini Embeddings
```json
{
  "embedding": {
    "provider": "gemini",
    "model": "text-embedding-004",
    "apiKey": "your-gemini-key",
    "dimensions": 768
  }
}
```

### Vision API Configuration

Enable vision processing for images, diagrams, and screenshots:

```json
{
  "vision": {
    "enabled": true,
    "provider": "openai",
    "model": "gpt-4o-mini",
    "apiKey": "sk-...",
    "prompt": "Describe this image for a software developer. Focus on text, code, diagrams, UI elements, and technical content. Be concise but comprehensive."
  }
}
```

**Supported vision providers:**
- **OpenAI**: `gpt-4o`, `gpt-4o-mini`, `gpt-4-vision-preview`
- **Google Gemini**: `gemini-1.5-pro-latest`, `gemini-1.5-flash`

**Supported image formats:** PNG, JPEG, WebP, GIF, BMP

### Chat/LLM Configuration

Configure the AI chat functionality:

```json
{
  "chat": {
    "provider": "openai",
    "model": "gpt-4o-mini",
    "apiKey": "sk-..."
  }
}
```

**Alternative configuration format:**
```json
{
  "llm": {
    "provider": "gemini",
    "model": "gemini-1.5-flash",
    "apiKey": "your-gemini-key"
  }
}
```

**Supported chat providers:**
- **OpenAI**: `gpt-4o`, `gpt-4o-mini`, `gpt-4-turbo`, `gpt-3.5-turbo`
- **Google Gemini**: `gemini-1.5-pro-latest`, `gemini-1.5-flash`, `gemini-pro`

### Advanced Chunking Strategies

#### Function-Aware Chunking
```json
{
  "chunking": {
    "strategy": "function",
    "maxChunkSize": 1024,
    "overlap": 0.25,
    "includeComments": true
  }
}
```

**Chunking strategies:**
- `"function"` - Intelligent parsing using Tree-sitter (recommended)
- `"text"` - Simple text-based chunking

**Supported languages for function chunking:**
- JavaScript/TypeScript (`.js`, `.jsx`, `.ts`, `.tsx`)
- Python (`.py`)
- More languages can be added via Tree-sitter parsers

#### Chunking Parameters
- `maxChunkSize`: Maximum characters per chunk (default: 1024)
- `overlap`: Percentage overlap between chunks (0-1, default: 0.25)
- `includeComments`: Whether to include comments in chunks (default: true)

### File Indexing Configuration

```json
{
  "indexing": {
    "excludePatterns": [
      "node_modules/**",
      ".git/**",
      ".gitcontextor/**",
      "*.test.js",
      "*.spec.js",
      "dist/**",
      "build/**",
      "coverage/**",
      "*.log"
    ],
    "includeExtensions": [
      ".js", ".jsx", ".ts", ".tsx",
      ".py", ".java", ".c", ".cpp", ".cs",
      ".php", ".rb", ".go", ".rs", ".kt",
      ".scala", ".swift", ".dart", ".r",
      ".html", ".css", ".scss", ".sass",
      ".json", ".yaml", ".yml", ".toml",
      ".xml", ".md", ".txt", ".sql", ".pdf"
    ],
    "followSymlinks": false
  }
}
```

**Office document support:**
- `.docx` - Microsoft Word documents
- `.xlsx` - Microsoft Excel spreadsheets
- `.pdf` - PDF documents (text extraction)

### Vector Store Configuration

#### Auto-selection (Recommended)
```json
{
  "vectorStore": {
    "provider": "auto"
  }
}
```

#### In-Memory Store
```json
{
  "vectorStore": {
    "provider": "memory",
    "memory": {
      "persistence": true
    }
  }
}
```

#### Qdrant Vector Database
```json
{
  "vectorStore": {
    "provider": "qdrant",
    "qdrant": {
      "host": "localhost",
      "port": 6333
    }
  }
}
```

**Vector store comparison:**
- **Auto**: Automatically selects Qdrant if available, falls back to memory
- **Memory**: Fast, no external dependencies, data lost on restart
- **Qdrant**: Persistent, scalable, requires external service

### Performance Tuning

```json
{
  "performance": {
    "batchSize": 10,
    "concurrency": 3,
    "cacheEnabled": true,
    "cacheTtl": 300000
  }
}
```

**Performance parameters:**
- `batchSize`: Files processed in each batch during indexing
- `concurrency`: Number of concurrent operations
- `cacheEnabled`: Enable embedding caching
- `cacheTtl`: Cache time-to-live in milliseconds

### File Monitoring Configuration

```json
{
  "monitoring": {
    "watchEnabled": true,
    "debounceMs": 1000,
    "maxQueueSize": 100
  }
}
```

**Monitoring parameters:**
- `watchEnabled`: Enable real-time file watching
- `debounceMs`: Delay before processing file changes
- `maxQueueSize`: Maximum queued file changes

### Service Configuration

```json
{
  "services": {
    "port": 3333,
    "apiKey": "gctx_...",
    "keepCollectionOnExit": true
  }
}
```

## Environment Variables

Git Contextor supports environment variables for API keys:

```bash
# OpenAI API Key
export OPENAI_API_KEY="sk-..."

# Google Gemini API Key
export GOOGLE_API_KEY="your-gemini-key"

# Debug logging
export DEBUG="1"
```

## Advanced Use Cases

### Multi-Language Repository
```json
{
  "indexing": {
    "includeExtensions": [
      ".js", ".ts", ".py", ".java", ".go", ".rs", ".cpp", ".c", ".cs",
      ".php", ".rb", ".scala", ".kt", ".swift", ".dart", ".r", ".sql"
    ]
  },
  "chunking": {
    "strategy": "function",
    "maxChunkSize": 2048,
    "overlap": 0.2
  }
}
```

### Documentation-Heavy Project
```json
{
  "indexing": {
    "includeExtensions": [
      ".md", ".txt", ".rst", ".adoc", ".tex", ".html", ".xml", ".json", ".yaml"
    ]
  },
  "chunking": {
    "strategy": "text",
    "maxChunkSize": 1536,
    "overlap": 0.3
  }
}
```

### High-Performance Setup
```json
{
  "embedding": {
    "provider": "openai",
    "model": "text-embedding-3-small"
  },
  "vectorStore": {
    "provider": "qdrant"
  },
  "performance": {
    "batchSize": 20,
    "concurrency": 5,
    "cacheEnabled": true
  }
}
```

### Vision-Enabled Project
```json
{
  "vision": {
    "enabled": true,
    "provider": "openai",
    "model": "gpt-4o-mini"
  },
  "indexing": {
    "includeExtensions": [
      ".png", ".jpg", ".jpeg", ".webp", ".gif", ".bmp",
      ".js", ".ts", ".py", ".md", ".html", ".css"
    ]
  }
}
```

## Configuration Best Practices

### 1. Provider Selection
- **Local embeddings**: Best for privacy and no API costs
- **OpenAI**: High quality, good API integration
- **Gemini**: Cost-effective, good multilingual support

### 2. Chunking Strategy
- Use `"function"` strategy for code-heavy repositories
- Use `"text"` strategy for documentation-heavy projects
- Adjust `maxChunkSize` based on your LLM's context window

### 3. Performance Optimization
- Start with default settings
- Increase `batchSize` and `concurrency` for faster indexing
- Enable caching for repeated operations
- Use Qdrant for large repositories

### 4. File Filtering
- Exclude test files and build artifacts
- Include only relevant file types
- Use specific patterns for your project structure

### 5. Vision Configuration
- Enable vision for UI/UX projects with screenshots
- Use lower-cost models for vision (e.g., `gpt-4o-mini`)
- Customize the vision prompt for your use case

## Configuration Migration

When upgrading Git Contextor, your configuration is automatically migrated. However, you can manually check for new options:

```bash
# Backup current config
cp .gitcontextor/config.json .gitcontextor/config.json.backup

# Reinitialize to see new options
git-contextor init --force

# Merge your settings back
```

## Troubleshooting Configuration

### Common Issues

1. **Invalid API Keys**: Check environment variables and config file
2. **Performance Issues**: Reduce batch size and concurrency
3. **Memory Issues**: Switch to Qdrant for large repositories
4. **Missing Files**: Check exclude patterns and file extensions

### Validation Commands

```bash
# Test configuration
git-contextor config --show

# Test API connectivity
git-contextor chat "test query"

# Check service status
git-contextor status
```

## Security Considerations

- Store API keys in environment variables, not in config files
- Use least-privilege API keys when possible
- Regular rotation of API keys
- Secure your `.gitcontextor` directory appropriately

## Performance Monitoring

Monitor your configuration's performance:

```bash
# Check indexing progress
git-contextor status

# Monitor via web dashboard
# Navigate to http://localhost:3333 and check metrics
```

The configuration system is designed to be flexible and extensible. Start with the defaults and adjust based on your specific needs and performance requirements.
