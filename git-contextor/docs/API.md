# Git Contextor REST API

This document outlines the REST API endpoints provided by Git Contextor.

**Base URL:** `http://localhost:3000` (The port is configurable)
**Authentication:** All endpoints require an API key passed in the `x-api-key` header.

---
## General

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
## Context & Search

### Semantic Search

- **Endpoint:** `/api/search`
- **Method:** `POST`
- **Description:** Performs a semantic search for contextually relevant code chunks.
- **Request Body:**
  ```json
  {
    "query": "how to implement user authentication",
    "maxTokens": 4096
  }
  ```
- **Success Response (200 OK):**
  ```json
  {
    "query": "how to implement user authentication",
    "optimizedContext": "--- File: src/auth/jwt.js (Score: 0.92) ---\n...",
    "results": [
      {
        "filePath": "src/auth/jwt.js",
        "score": 0.92,
        "content": "...",
        "startLine": 10,
        "endLine": 25
      }
    ],
    "tokenCount": 1024
  }
  ```

### AI Chat

- **Endpoint:** `/api/chat`
- **Method:** `POST`
- **Description:** Sends a query to the AI, using repository context to generate an answer.
- **Request Body:**
  ```json
  {
    "query": "Explain the auth flow",
    "include_summary": true
  }
  ```
- **Success Response (200 OK):**
  ```json
  {
    "query": "Explain the auth flow",
    "response": "The authentication flow starts with a user providing credentials...",
    "context": [
      {
        "filePath": "src/auth/jwt.js",
        "score": 0.91,
        "content": "..."
      }
    ]
  }
  ```

---
## Indexing & Management

### Reindex Repository

- **Endpoint:** `/api/reindex`
- **Method:** `POST`
- **Description:** Triggers a full re-indexing of the entire repository. This is an asynchronous operation.
- **Request Body:** Empty.
- **Success Response (202 Accepted):**
  ```json
  {
    "message": "Full repository reindex started."
  }
  ```

### Get or Create Collection Summary

- **Endpoint:** `/api/collection/summary`
- **Method:** `GET`
- **Description:** Retrieves the AI-generated collection summary. If it doesn't exist, it will be generated on-demand before responding.
- **Success Response (200 OK):**
  - **Content-Type:** `text/plain`
  - **Body:** A Markdown-formatted string containing the summary.
    ```markdown
    # Collection Summary

    ## Cluster 1: Authentication & User Management
    Key technologies: JWT, bcrypt, Express.js
    ...
    ```

### Trigger Summary Generation

- **Endpoint:** `/api/collection/summarize`
- **Method:** `POST`
- **Description:** Manually triggers the generation of a new collection summary. This is an asynchronous operation.
- **Request Body (Optional):**
  ```json
  {
    "numClusters": 15
  }
  ```
- **Success Response (202 Accepted):**
  ```json
  {
    "message": "Collection summary generation started. This may take a few minutes."
  }
  ```
