# 🚀 Git Contextor

**The AI developer tool that actually understands your codebase**

[![NPM Version](https://img.shields.io/npm/v/git-contextor.svg?style=flat)](https://www.npmjs.com/package/git-contextor)
[![GitHub Stars](https://img.shields.io/github/stars/stromdao/git-contextor.svg?style=social)](https://github.com/stromdao/git-contextor/stargazers)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Twitter Follow](https://img.shields.io/twitter/follow/stromdao?style=social)](https://twitter.com/stromdao)

> Stop copying and pasting code snippets into ChatGPT. Git Contextor automatically indexes your project folder and provides **semantic, context-aware search** that understands what your code actually does.

<!-- ![Git Contextor Demo](placeholder.gif) -->

## 🎯 Why Git Contextor?

**Before Git Contextor:**
- 😩 Manually copying code into ChatGPT/Claude
- 🔍 Searching by keywords, not meaning
- 🧩 Missing context across files
- ⏰ Wasting hours explaining your codebase to AI

**After Git Contextor:**
- 🚀 AI instantly understands your entire project
- 🧠 Semantic search finds relevant code by meaning
- 🔄 Real-time updates as you code
- ⚡ 10x faster AI-assisted development

## ✨ Features That Developers Love

| Feature | Description | Why It Matters |
|---------|-------------|----------------|
| 🧠 **Semantic Search** | Find code by what it does, not what it's called | `"user authentication"` finds OAuth, JWT, sessions |
| 🤖 **Auto-Summary** | Automatically creates an AI-generated summary of your project when idle. | Provides a high-level overview for the AI's "thinking step," leading to smarter, more accurate answers. |
| 💬 **AI Chat & Secure Sharing** | Chat with your repo; share a secure web UI with AI chat and semantic search | Let external collaborators safely interact with your code via AI |
| 🛡️ **Hardened Security** | Tunnels only expose shared links, not the admin UI | Collaborate externally without risking unauthorized access |
| 🔄 **Real-time Sync** | Auto-updates as you write code | Always current, never stale |
| 🌐 **Universal API** | Works with any AI tool or IDE | VS Code, n8n, custom scripts |
| 🔒 **Privacy First** | Runs locally, your code never leaves | Your IP stays protected |
| 🎯 **Token Optimized** | Smart context packing for any LLM | Maximizes AI understanding |
| 📊 **Beautiful Dashboard** | Monitor indexing and search activity | See your codebase come alive |

## 🚀 Quick Start (30 seconds)

Git Contextor uses an in-memory vector store by default, so you can get started right away without any external dependencies.

```bash
# 1. Navigate to your project directory
cd your-awesome-project

# 2. Initialize the project
npx git-contextor@latest init

# 3. Start the indexing service and dashboard
npx git-contextor start

# That's it! Your dashboard is now running.
# Open http://localhost:3333 in your browser to see it.
```

**That's it!** Your entire codebase is now semantically searchable.

## 🎮 Try It Now

```bash
# Search by meaning, not keywords
npx git-contextor query "how is user authentication handled?"

# Chat with your repository's AI
npx git-contextor chat "Explain the auth flow step-by-step"

# Create a temporary, shareable link for AI-powered code review
npx git-contextor share create --tunnel localtunnel --duration 2h
```

## 🔥 Real-World Examples

### VS Code Integration (with GitHub Copilot)

Integrate Git Contextor directly with GitHub Copilot Chat to provide deep, semantic context about your entire workspace. This is the recommended way to use Git Contextor in VS Code.

1.  Open your VS Code `settings.json` file (Ctrl+Shift+P, then "Open User Settings (JSON)").
2.  Add the following configuration:

```json
{
    "mcp": {
        "servers": {
            "git-contextor": {
                "command": "npx",
                "args": ["git-contextor", "mcp"],
                "cwd": "/path/to/your/repository"
            }
        }
    }
}
```

Replace `"/path/to/your/repository"` with the **absolute path** to your project folder where you ran `git-contextor init`.

3.  Restart VS Code for the changes to take effect.

Now, when you use `@workspace` in Copilot Chat, it will use Git Contextor's understanding of your codebase to provide more accurate and context-aware answers.

### n8n Workflow
```javascript
// Use the HTTP Request node in n8n
POST http://localhost:3333/api/search
{
  "query": "payment processing code",
  "maxTokens": 2048
}
```

## 🌟 What Developers Are Saying

> "Git Contextor feels like having a senior developer who has memorized the entire codebase, available 24/7. It has fundamentally changed how I explore and understand large projects."

> "Onboarding new developers used to take weeks. Now, they can ask Git Contextor questions about the architecture and get meaningful answers in seconds. It has slashed our ramp-up time."

> "I cut my 'code archaeology' time in half. Instead of manually tracing function calls, I can just ask 'where is the database logic for user sessions?' and get an immediate, accurate answer."

## 🛠️ Advanced Configuration

### Embedding Providers
```json
{
  "embedding": {
    "provider": "gemini",        // gemini, openai, or local
    "model": "text-embedding-004",
    "apiKey": "your-key-here",
    "dimensions": 768
  }
}
```

### Smart Chunking
```json
{
  "chunking": {
    "strategy": "function",      // function-aware chunking
    "maxChunkSize": 1024,
    "overlap": 0.25,            // 25% overlap between chunks
    "includeComments": true
  }
}
```

### File Filtering
```json
{
  "indexing": {
    "includeExtensions": [".js", ".py", ".java", ".go"],
    "excludePatterns": ["node_modules/**", "*.test.js"]
  }
}
```

## 💬 Advanced AI Capabilities

Go beyond simple search. Have a deep conversation with your codebase and securely share its context with collaborators.

- **`git-contextor chat`**: Ask complex questions and get AI-generated answers.
- **`git-contextor share`**: Create temporary, secure links for external AI-powered code reviews.
- **Auto-Summary**: Git Contextor automatically creates an AI-powered overview of your repository. This gives the AI a "thinking step" to understand the big picture before diving into code details.

[➡️ Learn more about Advanced AI Features in the documentation](docs/features/context-generation.md)

## 🔌 Integrations

- **VS Code**: Smart context for AI assistants
- **n8n**: Automated workflows with code context  
- **Slack Bots**: Answer code questions instantly
- **Documentation**: Auto-generate contextual docs
- **Code Reviews**: Understand changes faster
- **Onboarding**: Help new developers understand codebases

## 📖 Documentation

### 📋 Getting Started
- **[User Guide](docs/GUIDE.md)** - Complete setup and usage guide
- **[CLI Reference](docs/CLI_REFERENCE.md)** - All command-line options
- **[Usage Scenarios](docs/USAGE_SCENARIOS.md)** - Real-world examples and workflows

### 🔧 Configuration & Advanced Topics
- **[Advanced Configuration](docs/ADVANCED_CONFIGURATION.md)** - Performance tuning and customization
- **[Troubleshooting](docs/TROUBLESHOOTING.md)** - Common issues and solutions
- **[Features Overview](docs/FEATURES.md)** - Complete feature list

### 🛠️ API & Integration
- **[REST API Reference](docs/API_REFERENCE.md)** - Complete API documentation
- **[Integration Guide](docs/INTEGRATION.md)** - How to integrate with external tools
- **[OpenAPI Spec](docs/openapi.json)** - Machine-readable API specification

### 🔌 Platform-Specific Guides
- **[VS Code Integration](docs/integrations/vscode.md)** - VS Code setup and usage
- **[n8n Integration](docs/integrations/n8n.md)** - Workflow automation
- **[LangChain Integration](docs/integrations/langchain.md)** - Python AI framework
- **[Node-RED Integration](docs/integrations/node-red.md)** - Visual programming
- **[Model Context Protocol](docs/integrations/mcp.md)** - AI tool integration
- **[Programmatic Usage](docs/integrations/programmatic.md)** - Custom applications

### 🎯 Feature Deep Dives
- **[Context Generation](docs/features/context-generation.md)** - How AI context is created
- **[Sharing & Chat](docs/features/sharing-and-chat.md)** - Collaboration features

## 📊 Performance

| Repository Size | Index Time | Search Speed | Memory Usage |
|----------------|------------|--------------|--------------|
| Small (< 100 files) | 30 seconds | < 100ms | 50MB |
| Medium (1K files) | 5 minutes | < 200ms | 200MB |
| Large (10K files) | 30 minutes | < 500ms | 1GB |

## 🐳 Docker Support (Optional)

For production use or persistent storage between sessions, you can use Qdrant as the vector database.

```yaml
# docker-compose.yml
version: '3.8'
services:
  qdrant:
    image: qdrant/qdrant
    ports:
      - "6333:6333"
      - "6334:6334"
    volumes:
      - ./qdrant_data:/qdrant/storage
```

## 🔒 Privacy & Security

- **Local Processing**: Your code never leaves your machine
- **Encrypted Storage**: Vector embeddings are encrypted at rest
- **API Keys**: Securely stored in local config only
- **No Telemetry**: Zero data collection or tracking

## 🚧 Roadmap

- [ ] **Multi-language Support** (Rust, Kotlin, Swift)
- [ ] **IDE Extensions** (IntelliJ, Vim, Emacs)
- [ ] **Team Collaboration** (Shared knowledge bases)
- [ ] **Code Generation** (Context-aware code suggestions)
- [ ] **Documentation Sync** (Auto-update docs from code)

## 🤝 Contributing

We love contributors! 

```bash
git clone https://github.com/stromdao/git-contextor
cd git-contextor
npm install
npm run dev
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## 📄 License

MIT © [STROMDAO GmbH](https://stromdao.de)

## 🌟 Star History

[![Star History Chart](https://api.star-history.com/svg?repos=stromdao/git-contextor&type=Date)](https://star-history.com/#stromdao/git-contextor&Date)

---

<div align="center">

**Made with ❤️ by developers, for developers**

</div>
