# Changelog

All notable changes to Git Contextor will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-01-XX

### Added
- 🎉 Initial release of Git Contextor
- 🧠 Semantic code search with vector embeddings
- 🔄 Real-time file watching and indexing
- 🌐 REST API for external integrations
- 📊 Web dashboard for monitoring and search
- 🔌 Support for OpenAI, Google Gemini, and local embeddings
- 🐳 Docker Compose setup for Qdrant
- 📝 Comprehensive documentation and integration guides
- 🛠️ CLI tool with init, start, stop, status, config, query, reindex commands
- 🔒 API key authentication for secure access
- 📁 Git-aware file tracking (respects .gitignore)
- 🌳 Tree-sitter powered intelligent code chunking
- 📄 PDF support for documentation indexing
- ⚡ Token-optimized context generation for LLMs
- 🎯 File type filtering and exclude patterns
- 📈 Performance metrics and monitoring
- 🔄 Configurable chunking strategies
- 🏃‍♂️ Daemon mode for background operation

### Supported File Types
- JavaScript/TypeScript (.js, .jsx, .ts, .tsx)
- Python (.py)
- Java (.java)
- C/C++ (.c, .cpp)
- C# (.cs)
- PHP (.php)
- Ruby (.rb)
- Go (.go)
- Rust (.rs)
- Kotlin (.kt)
- Scala (.scala)
- Swift (.swift)
- Dart (.dart)
- R (.r)
- HTML/CSS (.html, .css, .scss, .sass)
- Configuration files (.json, .yaml, .yml, .toml, .xml)
- Documentation (.md, .txt)
- SQL (.sql)
- PDF documents (.pdf)

### Integrations
- VS Code tasks integration
- n8n workflow automation
- Node-RED compatibility
- Python/Node.js API clients
- curl command examples

## [Unreleased]

### Planned
- Multi-language Tree-sitter support (Rust, Kotlin, Swift)
- VS Code extension
- IntelliJ IDEA plugin
- Team collaboration features
- Enhanced documentation generation
- Performance optimizations
- Advanced filtering options
- Custom embedding model support# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-07-06

This is the initial public release of Git Contextor.

### Added
- Core indexing engine for Git repositories using a vector database.
- Real-time file watcher to keep the index synchronized.
- Pluggable embedding providers: local (Transformers.js), OpenAI, and Gemini.
- Semantic search functionality exposed via a REST API and CLI (`query` command).
- CLI for managing the service (`init`, `start`, 'stop', `status`, `config`).
- Marketing-focused `README.md` with quick start guide and feature showcase.
- Web-based dashboard for monitoring and interaction.
- Initial support for code chunking by function definitions.
- Post-install script to guide users and check for common environment issues.

### Changed
- Refactored core services for better stability and separation of concerns.
- Improved startup validation to check for Git repository, permissions, and API keys.

### Fixed
- Improved stability with global error handling and Node.js version checks.
- Made vector upserting more robust by handling individual chunk failures.
- Enhanced CLI feedback during the startup process.
- Implemented a more reliable health check endpoint.
