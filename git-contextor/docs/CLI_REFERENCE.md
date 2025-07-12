# Git Contextor CLI Reference

Complete reference for all Git Contextor command-line interface commands and options.

## Installation

```bash
# Install globally
npm install -g git-contextor

# Or use with npx (no installation required)
npx git-contextor --help
```

## Global Options

- `--help`: Show help information
- `--version`: Show version information

## Commands Overview

- [`init`](#init) - Initialize Git Contextor in a repository
- [`start`](#start) - Start the Git Contextor service
- [`stop`](#stop) - Stop the Git Contextor service
- [`status`](#status) - Show service status and repository info
- [`config`](#config) - Manage configuration
- [`query`](#query) - Search for code context
- [`chat`](#chat) - Chat with your repository using AI
- [`reindex`](#reindex) - Force reindexing of the repository
- [`share`](#share) - Share repository AI access

---

## init

Initialize Git Contextor in the current repository.

```bash
git-contextor init [options]
```

### Options

- `-f, --force`: Force initialization even if already initialized

### Examples

```bash
# Basic initialization
git-contextor init

# Force re-initialization
git-contextor init --force
```

### Interactive Setup

The `init` command will guide you through:

1. **Embedding Provider**: Choose between local (no API key), OpenAI, or Google Gemini
2. **API Keys**: Enter API keys for your chosen providers
3. **Chat Provider**: Choose the LLM for conversational features
4. **Configuration**: Set up basic configuration options

### Environment Variables

The init command respects these environment variables:

- `OPENAI_API_KEY`: Automatically configures OpenAI if present
- `GOOGLE_API_KEY`: Automatically configures Google Gemini if present
- `GEMINI_API_KEY`: Alias for `GOOGLE_API_KEY`

---

## start

Start the Git Contextor service.

```bash
git-contextor start [options]
```

### Options

- `-p, --port <port>`: Port for API and UI (overrides config)
- `-d, --daemon`: Run as daemon process
- `--clean`: Delete the vector collection on next stop (forces full reindex)
- `--no-watch`: Disable file watching for this session

### Examples

```bash
# Start normally
git-contextor start

# Start on custom port
git-contextor start --port 8080

# Start as daemon
git-contextor start --daemon

# Start with clean slate (will reindex everything)
git-contextor start --clean

# Start without file watching
git-contextor start --no-watch
```

### Process Management

When started normally, the service runs in the foreground. Use `Ctrl+C` to stop.

When started as daemon (`--daemon`), the service runs in the background. Use `git-contextor stop` to stop it.

### First Run

On first run, Git Contextor will:

1. Check for Qdrant vector database
2. Offer to start Qdrant via Docker if not running
3. Begin initial indexing of your repository
4. Start the web UI and API server

---

## stop

Stop the Git Contextor service.

```bash
git-contextor stop
```

### Examples

```bash
# Stop the service
git-contextor stop
```

### Notes

- Only works for daemon processes started with `--daemon`
- For foreground processes, use `Ctrl+C`
- Will gracefully shut down indexing and API server

---

## status

Show service status and repository information.

```bash
git-contextor status
```

### Example Output

```
✓ Git Contextor is running.

--- Repository Info ---
Name:      my-project
Path:      /path/to/my-project

--- Indexer Status ---
Status:         idle
Indexed Files:  150
Total Chunks:   2500
Last Update:    2023-10-27T10:00:00.000Z

--- File Watcher ---
Status:         enabled
```

### Status Information

- **Repository**: Name and path of the monitored repository
- **Indexer**: Current status, file count, chunk count, and last activity
- **File Watcher**: Whether real-time file monitoring is enabled

---

## config

Manage Git Contextor configuration.

```bash
git-contextor config [options]
```

### Options

#### Display Options
- `--show`: Show current configuration

#### Embedding Options
- `--embedding-provider <provider>`: Set embedding provider (local|openai|gemini)
- `--embedding-model <model>`: Set embedding model name
- `--embedding-dimensions <dim>`: Set embedding dimensions
- `--api-key <key>`: Set API key for embedding provider

#### Chunking Options
- `--max-chunk-size <size>`: Set maximum chunk size in characters
- `--chunk-overlap <percentage>`: Set chunk overlap percentage (0-1)

#### Indexing Options
- `--exclude-pattern <pattern>`: Add exclude pattern (can be used multiple times)

### Examples

```bash
# Show current configuration
git-contextor config --show

# Change embedding provider
git-contextor config --embedding-provider openai --api-key sk-...

# Adjust chunking parameters
git-contextor config --max-chunk-size 1500 --chunk-overlap 0.3

# Add exclude pattern
git-contextor config --exclude-pattern "temp/**"
```

### Configuration File

Configuration is stored in `.gitcontextor/config.json`. You can also edit this file directly, but remember to restart the service for changes to take effect.

---

## query

Search for code context using semantic search.

```bash
git-contextor query <searchQuery> [options]
```

### Options

- `-t, --max-tokens <tokens>`: Maximum tokens to return (default: 2048)
- `-l, --llm-type <type>`: LLM type for token optimization (default: claude-sonnet)
- `-f, --filter <filter>`: File type filter (comma-separated: js,ts,py)

### Examples

```bash
# Basic search
git-contextor query "authentication logic"

# Search with token limit
git-contextor query "database connection" --max-tokens 1000

# Search with file type filter
git-contextor query "error handling" --filter js,ts

# Search optimized for specific LLM
git-contextor query "API endpoints" --llm-type gpt-4
```

### Output

The query command returns:
- **Optimized Context**: Formatted context string optimized for LLM consumption
- **Token Count**: Number of tokens in the response
- **Relevant Files**: List of files containing relevant context

---

## chat

Chat with your repository using AI.

```bash
git-contextor chat <query> [options]
```

### Options

- `-c, --context <type>`: Context type (general|architecture|security) (default: general)

### Examples

```bash
# Basic chat
git-contextor chat "How does authentication work in this project?"

# Chat with specific context type
git-contextor chat "What security measures are implemented?" --context security

# Architecture-focused chat
git-contextor chat "Explain the overall system design" --context architecture
```

### Context Types

- **general**: General-purpose context for any questions
- **architecture**: Focus on system architecture and design patterns
- **security**: Focus on security implementations and vulnerabilities

### Output

The chat command returns:
- **AI Response**: Generated response from the configured LLM
- **Context Used**: Information about the context chunks used
- **Warnings**: If no context was found or index is empty

---

## reindex

Force reindexing of the repository or specific files.

```bash
git-contextor reindex [options]
```

### Options

- `-f, --file <file>`: Reindex specific file (relative path from repository root)

### Examples

```bash
# Full repository reindex
git-contextor reindex

# Reindex specific file
git-contextor reindex --file src/index.js

# Reindex specific directory (multiple files)
git-contextor reindex --file src/auth/
```

### When to Reindex

- After making significant changes to configuration
- After adding new file types to include patterns
- When search results seem outdated
- After resolving indexing errors

### Process

- Full reindex processes all files in the repository
- File-specific reindex only processes the specified file
- Reindexing runs in the background for full repository reindex
- File-specific reindex runs synchronously

---

## share

Share repository AI access with others.

```bash
git-contextor share <action> [options]
```

### Actions

- `create`: Create a new share
- `list`: List active shares
- `tunnel`: Create a public tunnel

### Options for `create`

- `-d, --duration <duration>`: Share duration (24h, 7d, 1w, 30d) (default: 24h)
- `-s, --scope <scope>`: Access scope (general,architecture,security)
- `--description <desc>`: Share description
- `--max-queries <num>`: Maximum queries allowed (default: 100)
- `-t, --tunnel [service]`: Create public tunnel (ngrok|localtunnel|serveo)

### Options for `tunnel`

- `--service <service>`: Tunnel service to use (ngrok|localtunnel|serveo)

### Examples

```bash
# Create basic share
git-contextor share create

# Create share with custom settings
git-contextor share create --duration 7d --max-queries 500 --description "Code review access"

# Create share with tunnel
git-contextor share create --tunnel localtunnel

# List active shares
git-contextor share list

# Create tunnel only
git-contextor share tunnel --service ngrok
```

### Duration Formats

- `24h`: 24 hours
- `7d`: 7 days
- `1w`: 1 week
- `30d`: 30 days

### Share Output

Creating a share returns:
- **Share ID**: Unique identifier for the share
- **API Key**: Authentication key for accessing the share
- **URL**: Direct URL to access the shared repository
- **Expiration**: When the share expires
- **Query Limit**: Maximum number of queries allowed

---

## Environment Variables

Git Contextor respects the following environment variables:

### API Keys
- `OPENAI_API_KEY`: OpenAI API key
- `GOOGLE_API_KEY`: Google Gemini API key
- `GEMINI_API_KEY`: Alias for Google Gemini API key

### Debugging
- `DEBUG`: Enable debug logging (set to any truthy value)

### Database
- `QDRANT_HOST`: Qdrant host (default: localhost)
- `QDRANT_PORT`: Qdrant port (default: 6333)

### Examples

```bash
# Run with debug logging
DEBUG=true git-contextor start

# Use custom Qdrant host
QDRANT_HOST=my-qdrant-server git-contextor start

# Initialize with API key from environment
OPENAI_API_KEY=sk-... git-contextor init
```

---

## Configuration File Structure

The configuration file is stored at `.gitcontextor/config.json`:

```json
{
  "version": "1.0.0",
  "repository": {
    "path": "/path/to/repository",
    "name": "repository-name",
    "branch": "main"
  },
  "embedding": {
    "provider": "local",
    "model": "Xenova/all-MiniLM-L6-v2",
    "apiKey": null,
    "dimensions": 384
  },
  "chat": {
    "provider": "openai",
    "model": "gpt-4o-mini",
    "apiKey": "sk-..."
  },
  "chunking": {
    "strategy": "function",
    "maxChunkSize": 1024,
    "overlap": 0.25,
    "includeComments": true
  },
  "indexing": {
    "excludePatterns": [
      "node_modules/**",
      ".git/**",
      "*.test.js"
    ],
    "includeExtensions": [
      ".js", ".ts", ".py", ".md"
    ]
  },
  "services": {
    "port": 3333,
    "apiKey": "generated-api-key"
  }
}
```

---

## Exit Codes

Git Contextor uses standard exit codes:

- `0`: Success
- `1`: General error
- `2`: Configuration error
- `3`: Network error
- `4`: Service not running

---

## Tips and Best Practices

### Performance

- Use `--daemon` for long-running services
- Configure appropriate `excludePatterns` to avoid indexing unnecessary files
- Use file-specific reindex for quick updates

### Security

- Store API keys in environment variables when possible
- Use shares with reasonable expiration times
- Monitor share usage through the web UI

### Troubleshooting

- Use `DEBUG=true` to get detailed logging
- Check service status with `git-contextor status`
- Verify configuration with `git-contextor config --show`

### Development Workflow

1. Initialize: `git-contextor init`
2. Start service: `git-contextor start --daemon`
3. Test search: `git-contextor query "test query"`
4. Use web UI: Open `http://localhost:3333`
5. Stop when done: `git-contextor stop`

---

## Getting Help

- Use `git-contextor --help` for command overview
- Use `git-contextor <command> --help` for command-specific help
- Check the [documentation](https://github.com/stromdao/git-contextor/docs) for detailed guides
- Report issues on [GitHub](https://github.com/stromdao/git-contextor/issues)
