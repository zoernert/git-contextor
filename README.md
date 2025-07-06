# Git Contextor

Git Contextor is a developer tool designed to create and manage contextually-aware code embeddings for large language models (LLMs). It runs as a local service, monitoring a git repository for changes, and provides a semantic search API to retrieve the most relevant code snippets for a given query.

## Features

- **Real-time File Monitoring:** Uses `chokidar` to watch for file changes and automatically updates the index.
- **Git-Aware:** Respects `.gitignore` and only indexes files tracked by git.
- **Language-Aware Chunking:** Uses `tree-sitter` to intelligently chunk code based on function and class boundaries for better semantic meaning.
- **Multiple Embedding Providers:** Supports local embeddings via `@xenova/transformers`, as well as OpenAI and Google Gemini.
- **Vector Storage:** Utilizes a local Qdrant instance for efficient vector storage and search.
- **REST API:** A secure, key-protected REST API for searching, checking status, and re-indexing.
- **Web Interface:** A simple dashboard to monitor service status, view live file activity, and perform semantic searches.
- **CLI-First:** A comprehensive command-line interface to initialize, manage, and query the service.

## Quick Start

1.  **Run in your project directory:**
    ```bash
    npx git-contextor init
    ```
    This creates a `.gitcontextor` configuration directory. _(If git-contextor is not on npm, use `node /path/to/git-contextor/bin/git-contextor.js init`)_

2.  **Configure your API Key:**
    After initialization, edit the new `.gitcontextor/config.json` file. Find the `embedding` section and add your API key:
    ```json
    "embedding": {
      "provider": "gemini", // or "openai", "local"
      "model": "text-embedding-004",
      "apiKey": "YOUR_API_KEY_HERE", // <-- ADD YOUR KEY HERE
      "dimensions": 768
    },
    ```

3.  **Start the service:**
    ```bash
    npx git-contextor start
    ```
    The tool will check for the Qdrant vector database and offer to start it via Docker if it's not found.

4.  **Use the tool:**
    - **Web UI:** Open [http://localhost:3000](http://localhost:3000) to search your repository.
    - **CLI:** `npx git-contextor query "your search query"`

## CLI Commands

- `init`: Initializes Git Contextor in the current directory.
- `start`: Starts the API server and file watcher. Use `-d` to run as a daemon. Use `--keep-collection` to prevent the Qdrant collection from being deleted on exit.
- `stop`: Stops the running service.
- `status`: Shows the current status of the service.
- `reindex`: Triggers a full re-indexing of the repository.
- `query <text>`: Performs a semantic search.
- `config`: View or update the configuration.

## Development

- Run `npm run dev` to start the service with `nodemon` for automatic restarts on file changes.
- Tests can be run with `npm test`.
