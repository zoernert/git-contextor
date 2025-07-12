# Tunnel.corrently.cloud Integration

Git Contextor now uses `tunnel.corrently.cloud` as the default tunnel service for sharing your local development environment with AI agents and team members.

## Quick Start

1. **Get your API key** from tunnel.corrently.cloud
2. **Set your API key** as an environment variable:
   ```bash
   export CORRENTLY_TUNNEL_API_KEY=your_api_key_here
   ```
3. **Start sharing** your Git Contextor instance:
   ```bash
   git-contextor share --tunnel
   ```

## Configuration

### Environment Variable (Recommended)
Set your API key as an environment variable:
```bash
export CORRENTLY_TUNNEL_API_KEY=your_api_key_here
```

### Configuration File
Alternatively, set it in your Git Contextor configuration:
```bash
git-contextor config --set tunneling.corrently.apiKey your_api_key_here
```

## Available Commands

### Test Connection
Test your tunnel service connection and view account information:
```bash
git-contextor tunnel test
```

### Start Tunnel
Start a tunnel to share your local Git Contextor instance:
```bash
git-contextor tunnel start
```

### Check Status
View the current tunnel status:
```bash
git-contextor tunnel status
```

### Stop Tunnel
Stop the active tunnel:
```bash
git-contextor tunnel stop
```

### List Tunnels
List all your tunnels:
```bash
git-contextor tunnel list
```

## Advanced Usage

### Custom Tunnel Path
Specify a custom path for your tunnel:
```bash
git-contextor tunnel start --description "My Custom Tunnel"
```

### Different Service
Use a different tunnel service (if needed):
```bash
git-contextor tunnel start --service localtunnel
```

## Troubleshooting

### API Key Issues
If you get an API key error:
1. Make sure you have a valid API key from tunnel.corrently.cloud
2. Check that it's correctly set as an environment variable
3. Test the connection: `git-contextor tunnel test`

### Connection Issues
If the tunnel fails to connect:
1. Ensure your local Git Contextor server is running
2. Check your internet connection
3. Verify the server binds to `0.0.0.0` not just `localhost`

### Local Server Configuration
Your local Git Contextor server must be accessible on all interfaces. The default configuration should work, but if you have issues, ensure it's not bound only to localhost.

## Benefits of tunnel.corrently.cloud

- **Reliable**: Enterprise-grade tunnel service
- **Secure**: HTTPS tunnels with authentication
- **Fast**: Optimized for AI agent interactions
- **Persistent**: Tunnels remain active until manually stopped
- **Path-based**: Clean URLs like `https://tunnel.corrently.cloud/tunnel/your-path`

## Migration from Other Services

If you were using localtunnel or other services, the migration is automatic. Just set your API key and Git Contextor will use tunnel.corrently.cloud by default.

## Support

For issues with the tunnel service itself, contact tunnel.corrently.cloud support.
For Git Contextor integration issues, please file an issue in the Git Contextor repository.
