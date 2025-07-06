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

1.  **Prerequisites:**
    - Node.js (>=16.0.0)
    - Docker (for running the Qdrant vector database)

2.  **Installation:**
    ```bash
    git clone https://github.com/your-username/git-contextor.git
    cd git-contextor
    npm install
    ```

3.  **Start the Vector Database:**
    ```bash
    docker-compose -f docker/docker-compose.yml up -d
    ```

4.  **Initialize in your project:**
    Navigate to the root directory of the git repository you want to index.
    ```bash
    # From your project's root directory
    /path/to/git-contextor/bin/git-contextor.js init
    ```
    This creates a `.gitcontextor` directory in your project.

5.  **Start the Service:**
    ```bash
    /path/to/git-contextor/bin/git-contextor.js start
    ```
    This will start the API server and begin the initial indexing of your repository.

6.  **Use the Web UI:**
    Open your browser and navigate to `http://localhost:3000` to see the dashboard.

7.  **Query via CLI:**
    ```bash
    /path/to/git-contextor/bin/git-contextor.js query "how to implement authentication"
    ```

## CLI Commands

- `init`: Initializes Git Contextor in the current directory.
- `start`: Starts the API server and file watcher. Use `-d` to run as a daemon.
- `stop`: Stops the running service.
- `status`: Shows the current status of the service.
- `reindex`: Triggers a full re-indexing of the repository.
- `query <text>`: Performs a semantic search.
- `config`: View or update the configuration.

## Development

- Run `npm run dev` to start the service with `nodemon` for automatic restarts on file changes.
- Tests can be run with `npm test`.
