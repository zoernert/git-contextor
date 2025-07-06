# Git Contextor REST API

This document outlines the REST API endpoints provided by Git Contextor.

**Base URL:** `http://localhost:3000` (configurable)
**Authentication:** All endpoints require an API key passed in the `x-api-key` header.

---

### Health Check

- **Endpoint:** `/health`
- **Method:** `GET`
- **Description:** Checks if the API server is running and responsive.
- **Success Response (200 OK):**
  ```json
  {
    "status": "ok",
    "timestamp": "2023-10-27T10:00:00.000Z"
  }
  ```

---

### Service Status

- **Endpoint:** `/api/status`
- **Method:** `GET`
- **Description:** Retrieves the current status of all Git Contextor services, including the indexer and repository information.
- **Success Response (200 OK):**
  ```json
  {
    "status": "running",
    "repository": {
      "name": "my-project",
      "path": "/path/to/my-project"
    },
    "indexer": {
      "status": "idle",
      "totalFiles": 150,
      "totalChunks": 2500,
      "lastActivity": "2023-10-27T09:55:00.000Z"
    },
    "fileWatcher": {
      "latestActivity": []
    }
  }
  ```

---

### Metrics

- **Endpoint:** `/api/metrics`
- **Method:** `GET`
- **Description:** Provides detailed performance and usage metrics.
- **Success Response (200 OK):**
  ```json
  {
    "timestamp": "2023-10-27T10:01:00.000Z",
    "indexer": {
      "totalFiles": 150,
      "totalChunks": 2500,
      "errorCount": 5
    },
    "vectorStore": {
      "totalVectors": 2500,
      "avgDimensions": 1536
    },
    "system": {
      "memoryUsageMb": "128.50",
      "cpuUsage": 0
    }
  }
  ```

---

### Semantic Search

- **Endpoint:** `/api/search`
- **Method:** `POST`
- **Description:** Performs a semantic search for contextually relevant code chunks.
- **Request Body:**
  ```json
  {
    "query": "how to implement user authentication",
    "maxTokens": 4096,
    "filter": {
      "fileTypes": ["js", "py"]
    },
    "llmType": "gemini-1.5-flash-latest"
  }
  ```
- **Success Response (200 OK):**
  ```json
  {
    "query": "how to implement user authentication",
    "optimizedContext": "...",
    "results": [
      {
        "filePath": "src/auth/jwt.js",
        "score": 0.92,
        "chunk": "..."
      }
    ],
    "tokenCount": 1024
  }
  ```

---

### Reindex Repository

- **Endpoint:** `/api/reindex`
- **Method:** `POST`
- **Description:** Triggers a re-indexing process for the entire repository or a specific file. This is an asynchronous operation.
- **Request Body (Optional for full reindex):**
  ```json
  {
    "file": "src/components/main.js"
  }
  ```
- **Success Response (202 Accepted for full reindex):**
  ```json
  {
    "message": "Full repository reindex started."
  }
  ```
- **Success Response (200 OK for single file):**
  ```json
  {
    "message": "Successfully reindexed file: src/components/main.js"
  }
  ```
