# Changelog

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.2] - 2025-07-12

### Added
- **Native MCP Server**: Implemented a native Model Context Protocol (MCP) server. This allows seamless integration with VS Code's Copilot Chat and other MCP-compatible tools, enabling them to use Git Contextor's deep repository understanding for context.
- **Autonomous MCP Mode**: The `git-contextor mcp` command is now fully autonomous. It automatically starts all necessary background services (indexing, file watching, auto-summary) without requiring a separate `git-contextor start` process, greatly improving the user experience for VS Code integration.

### Changed
- The WebSocket transport layer for the MCP server was removed to simplify the implementation, as VS Code uses the standard I/O (stdio) transport.
- Refactored the chat logic from the API layer into the `ContextOptimizer` service for better code structure and to resolve cyclic dependencies.
- Updated the `README.md` to document the new, preferred method for VS Code integration using the MCP server.

### Fixed
- A bug was fixed where the context chunks used in an AI chat response were not correctly passed to the frontend, preventing them from being displayed in the UI. This was addressed during the chat logic refactoring.

## [1.2.1] - 2025-07-11

### Added
- Automatische Aktualisierungen der Sammlungsübersicht werden jetzt ausgelöst, wenn der Indexer länger als 20 Sekunden inaktiv ist.

### Changed
- Die Sammlungsübersicht im Dashboard wird zur besseren Lesbarkeit jetzt als HTML anstatt als reiner Text gerendert.
- Die API-Dokumentation (`API.md`) wurde aktualisiert, um neue Endpunkte aufzunehmen und Beschreibungen zu präzisieren.

### Fixed
- Die Erstellung der Sammlungsübersicht verwendet jetzt korrekt die flexible Chat-LLM-Konfiguration, was Fehler behebt, wenn keine globale `llm`-Konfiguration vorhanden ist.
- Das Panel für die Zusammenfassung in der Dashboard-Benutzeroberfläche wurde korrigiert, um eine korrekte Anzeige sicherzustellen.
- Mehrere Probleme beim Laden von LLM-Konfigurationen wurden behoben, insbesondere für den `gemini`-Anbieter, und es wird sichergestellt, dass die `chat`-Konfiguration korrekt priorisiert wird.
- Ein Fehler bei der API-Schlüssel-Authentifizierung wurde durch die Bereitstellung des korrekten Konfigurationsobjekts an die Middleware behoben.

## [1.2.0] - 2025-07-11

### Added
- **File Browser**: A new "File Browser" has been added to both the main dashboard and the shared access pages. This allows users to navigate the repository's file tree, view file contents directly in the UI, and initiate AI chats with the full content of a specific file as context.
- **Contextual AI Chat**: When viewing a file in the browser, users can now click "Ask AI about this file" to start a chat session where the entire content of that file is prioritized in the AI's context window.
- **Enhanced Shared Sessions**: The user interface for shared sessions has been completely overhauled to mirror the main dashboard, including tabbed navigation for Chat, File Browser, and API Usage.

### Fixed
- A server crash that occurred when accessing the file browser on a shared page has been resolved.
- The shared session page now correctly hides all interactive elements until a valid Share API Key has been entered and verified.
- Navigation between views (Chat, File Browser) on the shared session page is now fully functional.

## [1.1.4] - 2025-07-10

### Fixed
- Ein Absturz wurde behoben, der auftrat, wenn das Tool außerhalb eines Git-Repositorys ausgeführt wurde. Die Dateierkennung greift nun korrekt auf einen Scan des Dateisystems zurück, anstatt zu versuchen, Git-Befehle auszuführen.

## [1.1.2] - 2025-07-10

### Added
- Unterstützung für die Indizierung von Office-Dokumenten (`.docx`, `.xlsx`, `.pptx`) hinzugefügt.
- Ein `USAGE_SCENARIOS.md`-Dokument wurde hinzugefügt, das gängige Anwendungsfälle und die Zusammenarbeit über die Sharing-Funktion erläutert.

### Fixed
- Die Unterstützung für `.pptx`-Dateien wurde aufgrund einer fehlerhaften Abhängigkeit in der Verarbeitungsbibliothek (`@f-pri/pptx-to-text`) entfernt.
- Die Bibliothek `mammoth` wurde durch `docx-parser` für die Verarbeitung von `.docx`-Dateien ersetzt, um ein Problem mit defekten Abhängigkeiten zu beheben.
- Der "Suchen"-Button in der Web-Oberfläche löst nun die Suchaktion korrekt aus, ohne die Seite neu zu laden.
- Die Suchergebnisse in der Benutzeroberfläche zeigen nun den Inhalt der gefundenen Chunks korrekt an.

## [1.1.1] - 2025-07-08

### Added
- Das System verwendet nun automatisch einen In-Memory-Vektor-Speicher, falls keine Qdrant-URL konfiguriert ist. Dies ermöglicht eine sofortige Nutzung ohne externe Abhängigkeiten.

### Fixed
- Die Anzeige von Kontext-Chunks in der Benutzeroberfläche wurde korrigiert, sodass Dateiname und Inhalt wieder zuverlässig dargestellt werden.

## [1.1.0] - 2025-07-08

### Added
- The `init` command now automatically configures providers if `GEMINI_API_KEY` or `OPENAI_API_KEY` are present in the environment, skipping interactive prompts.

### Changed
- Improved CLI feedback for the `chat` command, providing clearer instructions if the service is not running or if no context was found.

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
