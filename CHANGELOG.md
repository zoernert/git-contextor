# Changelog

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.8] - 2025-07-07

### Fixed
- The AI chat feature now correctly uses the user-configured model from the `llm.model` setting in `config.json` instead of a hardcoded default.
- Improved the fallback logic to provide a more detailed reason when a conversational AI response cannot be generated.

## [1.0.7] - 2025-07-07

### Fixed
- Resolved a critical startup error (`Cannot read properties of undefined (reading 'getStatus')`) caused by an incorrect object being passed to the status API route.
- The file watcher status in the UI now correctly displays "enabled" or "disabled" instead of "unknown".

## [1.0.6] - 2025-07-07

### Fixed
- The service no longer stops unexpectedly when saving configuration from the UI. The "restart" feature has been removed in favor of a more stable approach where the user is prompted to restart the service manually. This avoids issues when not running under a process manager like nodemon or pm2.

## [1.0.5] - 2025-07-07

### Fixed
- Corrected the file watcher status display in the web UI. It no longer shows as "unknown" and now properly reflects whether monitoring is enabled or disabled after a restart.

## [1.0.4] - 2025-07-07

### Added
- Enabled full conversational AI capabilities for shared repository access, providing the same experience as the main chat feature.
- Introduced a dedicated `llm` section in the configuration for specifying the language model provider and API key, separate from the `embedding` configuration. The system falls back to the `embedding` config for backward compatibility.

### Changed
- The `/api/chat` and `/shared/{id}/chat` endpoints now prioritize the `llm` configuration.

## [1.0.3] - 2025-07-07

### Changed
- The tool no longer requires being inside a Git repository to function. Git-specific features (like using `.gitignore` for exclusions) are now optional and are only enabled if a Git repository is detected.

## [1.0.2] - 2025-07-07

### Changed
- Improved user experience for sharing by automatically displaying the full public tunnel URL in both the web UI and CLI when a share is created while a tunnel is active.

## [1.0.1] - 2025-07-07

### Security
- Hardened the public tunnel feature to prevent exposure of the admin dashboard. The tunnel root now displays a static landing page, and all admin APIs and UI components are restricted to localhost access only, ensuring private assets are never publicly exposed.

## [1.0.0] - 2025-07-06

This is the initial public release of Git Contextor.

### Added
- Conversational AI with your codebase via the `chat` command.
- Secure, time-limited repository AI sharing with the `share` command.
- Built-in tunneling support (`localtunnel`, `ngrok`) for easy external collaboration.
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
