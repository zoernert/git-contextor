# Git Contextor Integration Plan with Tunnel Service

## Overview

This plan outlines the integration between Git Contextor and the managed tunneling service hosted at `https://tunnel.corrently.cloud/`. The integration will provide Git Contextor users with professional-grade tunneling capabilities, replacing the current localtunnel/ngrok approach with a managed, monetized service.

## 1. Integration Architecture

```
┌─────────────────┐    ┌──────────────────────┐    ┌─────────────────┐
│   Git Contextor │    │   Tunnel Service     │    │   Public Internet│
│   Local Instance│◄──►│ tunnel.corrently.    │◄──►│   External Users │
│                 │    │ cloud                │    │                 │
└─────────────────┘    └──────────────────────┘    └─────────────────┘
```

## 2. Configuration Changes Required

### 2.1 Update Git Contextor Configuration Schema

Add tunneling configuration to `src/core/ConfigManager.js`:

```javascript
// Add to defaultConfig
tunneling: {
  provider: 'managed', // 'managed', 'localtunnel', 'ngrok'
  managed: {
    apiUrl: 'https://tunnel.corrently.cloud',
    apiKey: null, // User-provided API key
    subdomain: null, // Optional custom subdomain
    gitContextorShare: true
  },
  localtunnel: {
    // Existing localtunnel config
  }
}
```

### 2.2 Update SharingService Class

Modify `src/core/SharingService.js` to support the managed tunneling provider:

```javascript
// Add new methods for managed tunneling
async startManagedTunnel() {
  const config = this.config.tunneling.managed;
  
  try {
    // Create tunnel via tunnel service API
    const response = await fetch(`${config.apiUrl}/api/tunnels`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        localPort: this.config.services.port,
        subdomain: config.subdomain,
        gitContextorShare: true
      })
    });

    if (!response.ok) {
      throw new Error(`Tunnel creation failed: ${response.statusText}`);
    }

    const tunnelData = await response.json();
    
    this.tunnelUrl = tunnelData.url;
    this.tunnelId = tunnelData._id;
    this.tunnelStatus = 'running';
    
    // Start local proxy to forward requests
    await this.startLocalProxy(tunnelData);
    
    return tunnelData;
  } catch (error) {
    this.tunnelStatus = 'error';
    throw error;
  }
}

async startLocalProxy(tunnelData) {
  // Implementation to handle incoming tunnel requests
  // This would set up a WebSocket connection or HTTP proxy
  // to forward requests from the tunnel service to the local Git Contextor instance
}
```

## 3. Implementation Steps

### Phase 1: Basic Integration (Week 1-2)

1. **Add Managed Tunneling Provider**
   - Implement `ManagedTunnelingProvider` class
   - Add API integration for tunnel creation/deletion
   - Update UI to support managed tunneling option

2. **Configuration Updates**
   - Add tunneling configuration schema
   - Update CLI commands to support managed tunneling
   - Add validation for API keys and endpoints

3. **Basic Tunnel Management**
   - Implement tunnel creation via REST API
   - Add tunnel status monitoring
   - Implement tunnel cleanup on shutdown

### Phase 2: Advanced Features (Week 3-4)

1. **WebSocket Integration**
   - Implement WebSocket connection for real-time tunnel data
   - Add request/response forwarding logic
   - Handle connection failures and reconnection

2. **Enhanced UI Integration**
   - Update sharing interface to show managed tunneling option
   - Add tunnel status indicators
   - Implement tunnel management controls

3. **Error Handling & Monitoring**
   - Add comprehensive error handling
   - Implement tunnel health monitoring
   - Add logging and debugging capabilities

### Phase 3: Production Features (Week 5-6)

1. **Authentication & Security**
   - Implement secure API key management
   - Add request validation and rate limiting
   - Implement secure tunnel protocols

2. **Usage Analytics**
   - Add tunnel usage tracking
   - Implement bandwidth monitoring
   - Add cost estimation features

3. **Documentation & Testing**
   - Complete integration documentation
   - Add comprehensive test coverage
   - Create user migration guides

## 4. Code Changes Required

### 4.1 New Files to Create

```
src/tunneling/
├── ManagedTunnelingProvider.js
├── TunnelProxy.js
└── TunnelWebSocket.js

src/cli/commands/
├── tunnel.js (enhanced)
└── account.js (new - for API key management)
```

### 4.2 Files to Modify

```
src/core/
├── ConfigManager.js (add tunneling config)
├── SharingService.js (add managed tunneling)
└── ServiceManager.js (integrate tunneling lifecycle)

src/ui/public/
├── index.html (update sharing UI)
└── js/app.js (add tunneling controls)

src/cli/commands/
├── init.js (add tunneling setup)
├── share.js (integrate managed tunneling)
└── start.js (add tunneling options)
```

## 5. API Integration Points

### 5.1 Tunnel Service Endpoints to Use

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/auth/register` | POST | Create user account |
| `/api/auth/login` | POST | Authenticate user |
| `/api/tunnels` | POST | Create new tunnel |
| `/api/tunnels` | GET | List user tunnels |
| `/api/tunnels/:id` | DELETE | Delete tunnel |
| `/api/subscriptions/plans` | GET | Get available plans |

### 5.2 Authentication Flow

```javascript
// 1. User registration/login
const authResponse = await fetch(`${apiUrl}/api/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password })
});

// 2. Store JWT token for subsequent requests
const { token } = await authResponse.json();

// 3. Create tunnel with authentication
const tunnelResponse = await fetch(`${apiUrl}/api/tunnels`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-auth-token': token
  },
  body: JSON.stringify({
    localPort: 3333,
    subdomain: 'my-git-contextor',
    gitContextorShare: true
  })
});
```

## 6. User Experience Flow

### 6.1 Initial Setup

```bash
# 1. User configures managed tunneling
git-contextor config --tunneling-provider managed
git-contextor config --tunneling-api-url https://tunnel.corrently.cloud
git-contextor config --tunneling-api-key YOUR_API_KEY

# 2. Create share with managed tunneling
git-contextor share create --tunnel managed --description "External review"
```

### 6.2 UI Integration

The sharing interface will be enhanced with:

- Managed tunneling option in provider selection
- API key configuration panel
- Tunnel status monitoring
- Usage and billing information
- Subscription management integration

## 7. Migration Strategy

### 7.1 Backward Compatibility

- Keep existing localtunnel/ngrok integrations
- Add managed tunneling as additional option
- Provide configuration migration utilities
- Maintain existing CLI command structure

### 7.2 User Migration Path

1. **Existing Users**: Can continue using current tunneling methods
2. **New Users**: Default to managed tunneling with free tier
3. **Power Users**: Migration guide for advanced features

## 8. Testing Strategy

### 8.1 Integration Testing

```javascript
// Example test structure
describe('Managed Tunneling Integration', () => {
  test('should create tunnel successfully', async () => {
    const tunnel = await managedProvider.createTunnel({
      localPort: 3333,
      subdomain: 'test-instance'
    });
    
    expect(tunnel.url).toMatch(/https:\/\/.*\.tunnel\.corrently\.cloud/);
    expect(tunnel.status).toBe('active');
  });
  
  test('should handle tunnel requests', async () => {
    // Test request forwarding from tunnel to local instance
  });
});
```

### 8.2 End-to-End Testing

- Test complete share creation and access flow
- Validate tunnel connectivity and performance
- Test error handling and recovery scenarios
- Verify security and authentication

## 9. Documentation Updates

### 9.1 User Documentation

- Update README with managed tunneling instructions
- Create tunneling configuration guide
- Add troubleshooting section for tunnel issues
- Document migration from existing solutions

### 9.2 Developer Documentation

- API integration documentation
- Architecture overview
- Security considerations
- Performance optimization guidelines

## 10. Benefits of Integration

### 10.1 For Git Contextor Users

- **Professional Infrastructure**: Reliable, monitored tunneling service
- **Better Security**: Built-in authentication and access controls
- **Usage Analytics**: Track sharing usage and performance
- **Scalability**: Handle multiple concurrent shares efficiently
- **Support**: Professional support for tunneling issues

### 10.2 For Tunnel Service

- **New User Base**: Git Contextor's developer community
- **Use Case Validation**: Real-world usage of Git sharing features
- **Feature Development**: Insights for Git-specific optimizations
- **Revenue Growth**: Subscription-based revenue from Git Contextor users

## 11. Timeline and Milestones

| Week | Milestone | Deliverables |
|------|-----------|--------------|
| 1 | Basic Integration | Config schema, API integration |
| 2 | Tunnel Management | Create/delete tunnels, basic UI |
| 3 | WebSocket Integration | Real-time tunnel communication |
| 4 | Advanced Features | Enhanced UI, error handling |
| 5 | Production Ready | Security, monitoring, testing |
| 6 | Release | Documentation, migration guides |

## 12. Success Metrics

- **Technical**: Tunnel creation success rate > 95%
- **Performance**: Tunnel latency < 100ms additional overhead
- **User Adoption**: 25% of shares use managed tunneling within 3 months
- **Reliability**: 99.5% tunnel uptime
- **User Satisfaction**: Positive feedback on tunneling experience

## 13. Risk Mitigation

### 13.1 Technical Risks

- **API Compatibility**: Regular testing against tunnel service API
- **Network Issues**: Implement retry logic and failover mechanisms
- **Security Concerns**: Regular security audits and updates

### 13.2 Business Risks

- **Service Dependency**: Maintain fallback to existing solutions
- **Cost Management**: Clear pricing communication to users
- **Feature Parity**: Ensure managed solution matches existing capabilities

This integration plan provides a comprehensive roadmap for successfully integrating Git Contextor with the managed tunneling service, delivering enhanced value to users while maintaining backward compatibility and reliability.