
# Git Contextor

[![NPM Version](https://img.shields.io/npm/v/git-contextor.svg?style=flat)](https://www.npmjs.com/package/git-contextor)
[![Build Status](https://img.shields.io/github/actions/workflow/status/stromdao/git-contextor/main.yml?branch=main)](https://github.com/stromdao/git-contextor/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Git Contextor automatically indexes your Git repository, creating a powerful, real-time, context-aware knowledge base. It's designed to supercharge AI developer tools by effortlessly providing them with the full context of your project.

## ✨ Why Git Contextor?

In the age of AI-driven development, providing the right context is the key to useful results. Manually copying and pasting code snippets is inefficient and limits the AI's understanding. Git Contextor solves this problem by:

-   **Automating Context:** It indexes your entire codebase and keeps it in sync.
-   **Deep Insights:** Allows tools to understand repository structure, dependencies, and code semantics.
-   **Unlocking New Capabilities:** Powers advanced features like repository-wide Q&A, intelligent code generation, and automated refactoring suggestions.

## 🚀 Key Features

-   **🤖 Automatic Indexing:** Scans your Git-tracked files and indexes them in a vector database.
-   **⏱️ Real-time Sync:** Watches for file changes (`add`, `change`, `delete`) and updates the index instantly.
-   **🔌 Pluggable Embeddings:** Supports local embeddings (via `Xenova/transformers.js`) for privacy and offline use, as well as OpenAI for powerful models.
-   **⚡️ Fast & Efficient:** Built on Node.js and uses the high-performance [Qdrant](https://qdrant.tech/) vector database.
-   **📡 REST API:** A simple API to query for context-relevant information.
-   **💻 User-Friendly CLI:** Manage the service with simple commands: `init`, `start`, `stop`, `status`.

## 🏁 Getting Started

### Prerequisites

-   [Node.js](https://nodejs.org/) (v18 or higher)
-   [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)
-   [Docker](https://www.docker.com/) (to run the Qdrant vector database)

### 1. Install Git Contextor

Install the CLI tool globally from npm (Note: package name is an assumption).

```bash
npm install -g git-contextor
```

### 2. Start Qdrant

Git Contextor requires a running Qdrant instance. You can easily start one using Docker:

```bash
docker run -p 6333:6333 -p 6334:6334 qdrant/qdrant
```
This starts Qdrant and exposes its gRPC and HTTP ports.

### 3. Initialize in Your Repository

Navigate to your project's root directory and run `init`.

```bash
cd /path/to/your/repo
git-contextor init
```

This creates a `.gitcontextor` directory with a `config.json` file. Here you can customize settings like the embedding provider or files to ignore.

### 4. Start the Service

Start the indexing and monitoring daemon process.

```bash
git-contextor start
```

Git Contextor will now start the initial indexing of your repository. You can check the progress with the `status` command.

```bash
git-contextor status
```

## ⚙️ Configuration

The main configuration is located at `.gitcontextor/config.json`. Key options include:
-   `embedding.provider`: Switch between `local` and `openai`.
-   `embedding.model`: Specify the model to use.
-   `indexing.includeExtensions`: Define which file types should be indexed.

## 🤝 Contributing

Contributions are welcome! Feel free to open an issue or submit a pull request.

1.  Fork the repository.
2.  Create your feature branch (`git checkout -b feature/AmazingFeature`).
3.  Commit your changes (`git commit -m 'Add some AmazingFeature'`).
4.  Push to the branch (`git push origin feature/AmazingFeature`).
5.  Open a Pull Request.

## 📄 License

This project is licensed under the MIT License.

## 🏢 Maintainer / Imprint

<details>
<summary>Contact Information</summary>
<addr>
STROMDAO GmbH  <br/>
Gerhard Weiser Ring 29  <br/>
69256 Mauer  <br/>
Germany  <br/>
<br/>
+49 6226 968 009 0  <br/>
<br/>
dev@stromdao.com  <br/>
<br/>
Commercial Register: HRB 728691 (Amtsgericht Mannheim)<br/>
<br/>
https://stromdao.de/<br/>
</addr>
</details>
