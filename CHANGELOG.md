# Changelog

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - YYYY-MM-DD

This is the initial public release of Git Contextor.

### Added
- Core indexing engine for Git repositories using a vector database.
- Real-time file watcher to keep the index synchronized.
- Web-based dashboard for monitoring, search, and configuration.
- Pluggable embedding providers: local (Transformers.js), OpenAI, and Gemini.
- Semantic search functionality exposed via a REST API and CLI (`query` command).
- CLI for managing the service (`init`, `start`, 'stop', `status`, `config`).
- Initial support for code chunking by function definitions.
- Post-install script to guide users and check for common environment issues.

### Changed
- Refactored core services for better stability and separation of concerns.
- Improved startup validation to check for Git repository, permissions, and API keys.
- Default API/UI port changed to `3333` to avoid conflicts with common development servers.

### Fixed
- Improved stability with global error handling and Node.js version checks.
- Made vector upserting more robust by handling individual chunk failures.
- Enhanced CLI feedback during the startup process.
- Unique file count metric temporarily disabled due to performance concerns in large repositories.
- Collection names are now generated with a repository path hash to prevent conflicts.
