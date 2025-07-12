# Git Contextor Troubleshooting Guide

Common issues and solutions for Git Contextor installation, configuration, and usage.

## Installation Issues

### Node.js Version Requirements

**Issue**: Git Contextor requires Node.js 18 or higher.

**Symptoms:**
- Error: "Git Contextor requires Node.js 18 or higher"
- Installation fails with version warnings

**Solution:**
```bash
# Check your Node.js version
node --version

# Install Node.js 18+ from https://nodejs.org/
# Or use a version manager like nvm:
nvm install 18
nvm use 18
```

### Permission Errors

**Issue**: Permission denied during installation.

**Symptoms:**
- `EACCES` errors during npm install
- Permission denied writing to global directories

**Solution:**
```bash
# Use npx instead of global installation
npx git-contextor init

# Or configure npm to use a different directory
npm config set prefix '~/.npm-global'
export PATH=~/.npm-global/bin:$PATH

# Or use sudo (not recommended)
sudo npm install -g git-contextor
```

## Initialization Problems

### Already Initialized

**Issue**: Git Contextor is already initialized in the repository.

**Symptoms:**
- "Git Contextor already initialized" message
- Existing `.gitcontextor` directory

**Solution:**
```bash
# Force re-initialization
git-contextor init --force

# Or remove existing configuration
rm -rf .gitcontextor
git-contextor init
```

### Configuration Errors

**Issue**: Invalid configuration during initialization.

**Symptoms:**
- JSON parsing errors
- Invalid API keys
- Missing required fields

**Solution:**
```bash
# Check configuration
git-contextor config --show

# Edit configuration manually
nano .gitcontextor/config.json

# Or reinitialize
git-contextor init --force
```

## Service Startup Issues

### Port Already in Use

**Issue**: The configured port is already in use.

**Symptoms:**
- "Port 3333 is already in use"
- `EADDRINUSE` errors

**Solution:**
```bash
# Use a different port
git-contextor start --port 8080

# Or stop the conflicting service
lsof -i :3333
kill -9 <PID>

# Or configure a different default port
git-contextor config --port 8080
```

### Qdrant Connection Issues

**Issue**: Cannot connect to Qdrant vector database.

**Symptoms:**
- "Failed to connect to Qdrant"
- Vector store initialization errors
- Empty search results

**Solution:**
```bash
# Check if Qdrant is running
curl http://localhost:6333/health

# Start Qdrant with Docker
docker run -p 6333:6333 -p 6334:6334 qdrant/qdrant

# Or use in-memory storage
git-contextor config --vector-store memory
```

### API Key Issues

**Issue**: Invalid or missing API keys.

**Symptoms:**
- "Invalid API key" errors
- Authentication failures
- Empty responses from AI providers

**Solution:**
```bash
# Check your API key
git-contextor config --show | grep apiKey

# Update API key
git-contextor config --api-key your-new-key

# Or set environment variable
export OPENAI_API_KEY=your-key
export GOOGLE_API_KEY=your-key
```

## Search and Chat Issues

### Empty Search Results

**Issue**: Semantic search returns no results.

**Symptoms:**
- "No relevant context found"
- Empty results array
- Search works but returns nothing

**Solution:**
```bash
# Check indexing status
git-contextor status

# Force reindexing
git-contextor reindex

# Check if files are being indexed
git-contextor config --show | grep includeExtensions

# Enable debug logging
DEBUG=true git-contextor start
```

### Slow Search Performance

**Issue**: Searches take too long to complete.

**Symptoms:**
- Long response times
- Timeouts
- High memory usage

**Solution:**
```bash
# Reduce chunk size
git-contextor config --max-chunk-size 800

# Reduce token limit
git-contextor query "your query" --max-tokens 1000

# Add more exclude patterns
git-contextor config --exclude-pattern "large-directory/**"

# Use Qdrant instead of memory storage
git-contextor config --vector-store qdrant
```

### Chat Not Working

**Issue**: AI chat returns errors or empty responses.

**Symptoms:**
- "Chat failed" messages
- API errors from AI providers
- No response from chat commands

**Solution:**
```bash
# Check chat configuration
git-contextor config --show | grep -A 5 chat

# Verify API key
curl -H "Authorization: Bearer your-api-key" https://api.openai.com/v1/models

# Check if context is being found
git-contextor query "your question"

# Try with different context type
git-contextor chat "your question" --context general
```

## File Watching Issues

### Files Not Being Indexed

**Issue**: New or modified files aren't being automatically indexed.

**Symptoms:**
- Search results don't include recent changes
- File watcher shows as disabled
- No activity in the dashboard

**Solution:**
```bash
# Check file watcher status
git-contextor status

# Enable file watching
git-contextor config --watch-enabled true

# Restart the service
git-contextor stop
git-contextor start

# Force reindex specific files
git-contextor reindex --file path/to/file.js
```

### Excluded Files

**Issue**: Files you want to index are being excluded.

**Symptoms:**
- Important files missing from search
- Partial search results
- Files listed in .gitignore being ignored

**Solution:**
```bash
# Check exclude patterns
git-contextor config --show | grep excludePatterns

# Check .gitignore
cat .gitignore

# Add file extensions to include
git-contextor config --include-extensions .md,.txt,.sql

# Remove exclude patterns if necessary
# (requires editing .gitcontextor/config.json)
```

## API and Integration Issues

### API Authentication Failures

**Issue**: API calls fail with authentication errors.

**Symptoms:**
- 401 Unauthorized responses
- "Invalid API key" errors
- Integration tools can't connect

**Solution:**
```bash
# Check API key
git-contextor config --show | grep apiKey

# Test API access
curl -H "x-api-key: your-api-key" http://localhost:3333/api/status

# Generate new API key
# (requires editing .gitcontextor/config.json)
```

### CORS Issues

**Issue**: Browser requests blocked by CORS policy.

**Symptoms:**
- "CORS policy" errors in browser console
- Web requests fail from other domains
- Integration from web apps fails

**Solution:**
The API includes CORS headers by default. If you're still having issues:
- Ensure you're using the correct API endpoints
- Check if you're making requests from HTTPS to HTTP
- Consider using a proxy or running Git Contextor with HTTPS

### Rate Limiting

**Issue**: Too many API requests being rate limited.

**Symptoms:**
- 429 Too Many Requests responses
- Slow or failing API calls
- Share quotas exceeded

**Solution:**
```bash
# Check share usage
git-contextor share list

# Increase query limits for shares
git-contextor share create --max-queries 1000

# Implement retry logic in your code
# Add delays between requests
```

## Performance Issues

### High Memory Usage

**Issue**: Git Contextor consuming too much memory.

**Symptoms:**
- System running out of memory
- Slow performance
- Process killed by OS

**Solution:**
```bash
# Check memory usage
git-contextor status

# Reduce chunk size
git-contextor config --max-chunk-size 512

# Use Qdrant instead of memory storage
git-contextor config --vector-store qdrant

# Reduce concurrency
git-contextor config --concurrency 1

# Add more exclude patterns
git-contextor config --exclude-pattern "node_modules/**"
```

### Slow Indexing

**Issue**: Initial indexing takes too long.

**Symptoms:**
- Indexing never completes
- Very slow progress
- High CPU usage

**Solution:**
```bash
# Check indexing status
git-contextor status

# Reduce batch size
git-contextor config --batch-size 5

# Add exclude patterns for large directories
git-contextor config --exclude-pattern "dist/**"
git-contextor config --exclude-pattern "build/**"

# Use local embeddings for faster processing
git-contextor config --embedding-provider local
```

## Sharing and Collaboration Issues

### Shares Not Working

**Issue**: Shared links don't work or return errors.

**Symptoms:**
- 404 errors on share URLs
- "Share not found" messages
- Access denied errors

**Solution:**
```bash
# Check active shares
git-contextor share list

# Verify share hasn't expired
# Check queries remaining

# Create new share
git-contextor share create --duration 7d

# Check if service is accessible
curl http://localhost:3333/health
```

### Tunnel Connection Issues

**Issue**: Public tunnels not working.

**Symptoms:**
- Tunnel URLs not accessible
- Connection refused errors
- Tunnel services failing

**Solution:**
```bash
# Check tunnel status
curl -H "x-api-key: your-key" http://localhost:3333/api/share/tunnel

# Try different tunnel service
git-contextor share tunnel --service localtunnel

# Install tunnel service manually
npm install -g localtunnel
lt --port 3333

# Check firewall settings
# Ensure Git Contextor is accessible locally first
```

## Debug and Diagnostic Commands

### Enable Debug Logging

```bash
# Start with debug output
DEBUG=true git-contextor start

# Or set environment variable
export DEBUG=true
git-contextor start
```

### Check System Status

```bash
# Full status check
git-contextor status

# Configuration check
git-contextor config --show

# Health check
curl http://localhost:3333/health
```

### Test API Endpoints

```bash
# Test search
curl -X POST -H "Content-Type: application/json" \
     -H "x-api-key: your-key" \
     -d '{"query": "test"}' \
     http://localhost:3333/api/search

# Test chat
curl -X POST -H "Content-Type: application/json" \
     -H "x-api-key: your-key" \
     -d '{"query": "test"}' \
     http://localhost:3333/api/chat
```

### File System Checks

```bash
# Check .gitcontextor directory
ls -la .gitcontextor/

# Check configuration file
cat .gitcontextor/config.json

# Check logs (if available)
tail -f .gitcontextor/logs/app.log
```

## Common Error Messages

### "Git Contextor not initialized"

**Solution:**
```bash
git-contextor init
```

### "Service not running"

**Solution:**
```bash
git-contextor start
```

### "Invalid JSON in config"

**Solution:**
```bash
# Validate JSON
cat .gitcontextor/config.json | jq .

# Or reinitialize
git-contextor init --force
```

### "Embedding provider not configured"

**Solution:**
```bash
git-contextor config --embedding-provider openai --api-key your-key
```

### "Vector store connection failed"

**Solution:**
```bash
# Start Qdrant
docker run -p 6333:6333 -p 6334:6334 qdrant/qdrant

# Or use memory storage
git-contextor config --vector-store memory
```

## Getting Help

### Documentation
- [User Guide](./GUIDE.md) - Complete setup and usage guide
- [API Reference](./API_REFERENCE.md) - Complete API documentation
- [CLI Reference](./CLI_REFERENCE.md) - Command-line interface guide

### Support Channels
- **GitHub Issues**: Report bugs and request features
- **Discussions**: Community Q&A and sharing
- **Documentation**: Self-service help and guides

### Providing Debug Information

When reporting issues, include:

1. **System Information**:
   ```bash
   node --version
   npm --version
   git-contextor --version
   ```

2. **Configuration**:
   ```bash
   git-contextor config --show
   ```

3. **Status Information**:
   ```bash
   git-contextor status
   ```

4. **Error Messages**: Complete error messages and stack traces

5. **Steps to Reproduce**: Detailed steps to reproduce the issue

6. **Environment**: OS, Node.js version, repository size, etc.

### Community Resources

- **GitHub Repository**: https://github.com/stromdao/git-contextor
- **Issue Tracker**: https://github.com/stromdao/git-contextor/issues
- **Discussions**: https://github.com/stromdao/git-contextor/discussions
- **Documentation**: Complete guides and references

---

If you can't find a solution to your problem in this guide, please:
1. Check the [GitHub Issues](https://github.com/stromdao/git-contextor/issues) for similar problems
2. Search the [Discussions](https://github.com/stromdao/git-contextor/discussions) for community solutions
3. Create a new issue with detailed information about your problem
