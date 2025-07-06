# Git Contextor - User Guide

Welcome to Git Contextor! This guide will walk you through setting up, configuring, and using the tool.

## 1. What is Git Contextor?

Git Contextor is a developer tool that runs as a local service, continuously monitoring a Git repository. It analyzes your code, breaks it down into meaningful, language-specific chunks, and converts these chunks into numerical vectors (embeddings). These vectors are stored in a vector database (Qdrant).

The primary purpose is to provide a semantic search API. Instead of searching for keywords, you can ask a question or provide a description, and Git Contextor will find the most relevant code sections that best capture the contextual meaning of your query.

## 2. Getting Started

### Initialization
Navigate to your project directory and run:
```bash
npx git-contextor init
```
This command creates a `.gitcontextor` directory in your project, containing the `config.json` configuration file.

### Configuration
Open the newly created `.gitcontextor/config.json`. The most important step is to configure your embedding provider. Git Contextor supports `gemini` (Google), `openai`, and `local` (via Transformers.js, no API key required).

**Example for Gemini:**
```json
"embedding": {
  "provider": "gemini",
  "model": "text-embedding-004",
  "apiKey": "YOUR_GEMINI_API_KEY_HERE",
  "dimensions": 768
}
```
Make sure to insert your API key.

### Starting the Service
Run the following command to start the service:
```bash
npx git-contextor start
```
On first launch, Git Contextor checks if it can connect to the Qdrant vector database. If not, it will ask if you want to start Qdrant via Docker.

Once the service is running, it will begin the initial indexing of your entire repository.

## 3. Using the Web UI

Open [http://localhost:3000](http://localhost:3000) (or the port you configured) in your browser.

### Dashboard
The dashboard provides a status overview, including the repository name, indexing status, and a live activity feed showing file changes in real-time.

Here you can also use the semantic search:
1.  Enter your search query into the search box (e.g., "how to implement user authentication").
2.  Adjust the max tokens if needed.
3.  Click "Search".

The results are displayed as an optimized context string, ready to be copied directly into an LLM prompt. Below that, you will find API snippets to perform the same search programmatically.

### Metrics & Configuration
- **Metrics:** Visualizes performance data like the number of indexed chunks and memory usage.
- **Configuration:** Displays a portion of the current configuration and provides "danger zone" actions like re-indexing the entire repository or deleting all data from the vector store.

## 4. Using the CLI

- `git-contextor status`: Displays the current status of the service.
- `git-contextor query "Your query"`: Performs a semantic search from the command line.
- `git-contextor reindex`: Triggers a full re-index.
- `git-contextor config --show`: Displays the entire `config.json`.
- `git-contextor config --<key> <value>`: Updates a configuration value (e.g., `--embedding-provider local`).
- `git-contextor stop`: Stops the service (specifically the daemon).

## 5. API Usage

Git Contextor provides a REST API. All endpoints (except Health, UI-Config, and Docs) require an `x-api-key` header. You can find your key in `config.json`.

- `GET /api/status`: Retrieves the service status.
- `POST /api/search`: Performs a semantic search.
- `POST /api/reindex`: Starts the re-indexing process.

For detailed information on endpoints, requests, and responses, please visit the **API** page in the documentation UI.
