# Contributing to Git Contextor

First off, thank you for considering contributing to Git Contextor! 🎉

## 🚀 Quick Start for Contributors

```bash
# 1. Fork and clone the repository
git clone https://github.com/your-username/git-contextor.git
cd git-contextor

# 2. Install dependencies
npm install

# 3. Start Qdrant for development
docker run -p 6333:6333 qdrant/qdrant

# 4. Run in development mode
npm run dev

# 5. Run tests
npm test
```

## 🛠️ Development Setup

### Prerequisites
- Node.js ≥ 18.0.0
- Docker (for Qdrant)
- Git

### Environment Setup
1. Copy `.env.example` to `.env` and configure your API keys
2. The development server will run on port 3000
3. Qdrant should be accessible on port 6333

## 📝 How to Contribute

### Reporting Bugs
- Use GitHub Issues with the "bug" label
- Include steps to reproduce
- Provide your OS, Node.js version, and any error messages
- Include a minimal code example if possible

### Suggesting Features
- Use GitHub Issues with the "enhancement" label
- Describe the problem you're trying to solve
- Explain how your suggestion would work
- Consider if this could be implemented as a plugin

### Code Contributions

1. **Find an Issue**: Look for issues labeled "good first issue" or "help wanted"
2. **Create a Branch**: `git checkout -b feature/your-feature-name`
3. **Make Changes**: Follow our coding standards (see below)
4. **Add Tests**: Ensure your changes are tested
5. **Update Docs**: Update relevant documentation
6. **Submit PR**: Create a pull request with a clear description

## 🎯 Areas We Need Help With

### High Priority
- **VS Code Extension**: Build an official extension
- **More Language Support**: Add Tree-sitter parsers for Rust, Kotlin, Swift
- **Performance Optimization**: Improve indexing speed for large repositories
- **Documentation**: Expand integration examples

### Medium Priority  
- **IntelliJ Plugin**: Support for JetBrains IDEs
- **Enhanced Chunking**: Smarter code splitting algorithms
- **Cloud Deployment**: Docker and Kubernetes examples
- **Testing**: Expand test coverage

### Low Priority
- **UI Improvements**: Better dashboard design
- **Advanced Search**: Query syntax and filters
- **Analytics**: Usage metrics and insights

## 🧪 Testing

```bash
# Run all tests
npm test

# Run specific test suites
npm test -- --testPathPattern=unit
npm test -- --testPathPattern=integration

# Run tests with coverage
npm test -- --coverage

# Run linting
npm run lint
```

### Test Structure
- `test/unit/`: Unit tests for individual components
- `test/integration/`: Integration tests for API endpoints
- `test/e2e/`: End-to-end tests for CLI commands

## 🎨 Coding Standards

### JavaScript Style
- Use ES6+ features
- Prefer `const` over `let`, avoid `var`
- Use async/await over Promises
- Follow the existing ESLint configuration

### Code Organization
- Keep functions small and focused
- Use descriptive variable and function names
- Add JSDoc comments for public APIs
- Group related functionality in modules

### Commit Messages
Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add support for Rust language parsing
fix: handle empty files in chunking process
docs: update API documentation for search endpoint
test: add unit tests for ConfigManager
refactor: simplify token counting logic
```

### Documentation
- Update README.md for user-facing changes
- Update API.md for API changes
- Add integration examples for new features
- Include inline code comments for complex logic

## 🔧 Architecture Overview

```
git-contextor/
├── src/
│   ├── cli/           # Command-line interface
│   ├── core/          # Core business logic
│   ├── api/           # REST API server
│   ├── ui/            # Web dashboard
│   └── utils/         # Utility functions
├── test/              # Test suites
├── docs/              # Documentation
└── docker/            # Docker configuration
```

### Key Components
- **ConfigManager**: Handles configuration loading/saving
- **Indexer**: Processes files and creates chunks
- **VectorStore**: Manages Qdrant interactions
- **FileWatcher**: Monitors file changes
- **ContextOptimizer**: Optimizes search results for LLMs

## 🚢 Release Process

1. Update version in `package.json`
2. Update `CHANGELOG.md`
3. Create a GitHub release with release notes
4. Publish to npm: `npm publish`

## 🤝 Community

- **Discord**: Join our [Discord server](https://discord.gg/git-contextor)
- **Twitter**: Follow [@stromdao](https://twitter.com/stromdao)
- **Issues**: Check [GitHub Issues](https://github.com/stromdao/git-contextor/issues)

## 📜 License

By contributing to Git Contextor, you agree that your contributions will be licensed under the MIT License.

## 🙏 Recognition

Contributors will be:
- Added to the Contributors section in README.md
- Mentioned in release notes
- Invited to the contributors Discord channel

Thank you for making Git Contextor better! 🚀