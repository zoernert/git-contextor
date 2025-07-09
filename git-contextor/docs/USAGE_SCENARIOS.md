# Git Contextor Usage Scenarios

Git Contextor is a versatile tool designed to bridge the gap between your codebase and natural language understanding. It creates a powerful, local AI assistant that understands the context of your project. Here are some common scenarios demonstrating how to leverage its capabilities.

## Use Case 1: Solo Developer - Rapid Codebase Comprehension

As a solo developer, you often jump between projects or need to quickly get up to speed on a legacy codebase. Git Contextor can act as your personal project expert.

**Steps:**

1.  **Initialize:** Navigate to your project's root directory and run `git-contextor init`. This creates the necessary configuration files.
2.  **Start the Service:** Run `git-contextor start`. This will launch the background service and the web dashboard.
3.  **Automatic Indexing:** The tool will automatically start indexing all supported files in your repository (source code, Markdown, PDFs, and Office documents). You can monitor the progress in the "Live Activity Feed" on the dashboard.
4.  **Explore with AI:**
    *   **Semantic Search:** Use the "Semantic Search" feature to find relevant code snippets based on natural language queries like "function to handle user authentication" instead of just keyword matching.
    *   **AI Chat:** Ask the "AI Chat" complex questions about the codebase, such as "Explain the database schema for the orders table" or "What's the main purpose of the `BillingService` class?". The AI will use the indexed content as its context to provide accurate answers.

This setup gives you a powerful, private, and offline-capable assistant that helps you navigate and understand your code faster.

## Use Case 2: The Lightweight Knowledge Hub for Remote Collaboration

This is a key feature of Git Contextor: providing secure, temporary, and controlled access to a project's knowledge base for external collaborators, like contractors or partners, without heavy platform overhead.

**The Problem:**
You need to collaborate with an external developer. They need to understand your project's architecture, review specific parts of the code, and read related technical documents (e.g., Word docs, PDFs). However, you don't want to grant them full access to your Git repository, VPN, or other internal systems.

**The Solution:**
Use Git Contextor's built-in tunneling and sharing features to expose a secure, queryable API endpoint for your knowledge base.

**Quick Recipe:**

1.  **Start Git Contextor:** In your project directory, run `git-contextor init` and then `git-contextor start`. Ensure all relevant source code and documents (e.g., `.docx`, `.xlsx`, `.pdf`) are present in the directory for indexing.

2.  **Open the Dashboard:** Navigate to the web UI, typically `http://localhost:3000`.

3.  **Start a Public Tunnel:**
    *   Find the **Repository Sharing** section.
    *   In the **Public Tunnel** card, click **"Start Tunnel"**.
    *   A public URL (e.g., `https://some-random-name.loca.lt`) will be generated. This is the public entry point to your local Git Contextor instance.

4.  **Create a Secure Share:**
    *   In the **Create a New Share** card, provide a description (e.g., "External contractor review").
    *   Select a duration (e.g., "24 Hours"). This automatically revokes access after the time expires.
    *   Click **"Create Share"**.

5.  **Share the Credentials:**
    *   The system will generate a unique **API Key** (e.g., `gctx_...`).
    *   Securely send the **Public URL** from Step 3 and the **API Key** from Step 4 to your collaborator.

**What the Collaborator Does:**
Your collaborator now has everything they need to interact with the project's knowledge base via a simple API, without needing any special software other than a tool like `curl` or a simple script.

They can perform semantic searches, for example:

```bash
curl -X POST 'https://your-public-tunnel-url.loca.lt/api/search' \
-H 'Content-Type: application/json' \
-H 'x-api-key: YOUR_SHARED_API_KEY' \
-d '{
  "query": "How is payment processing handled?"
}'
```

**Benefits of this approach:**

*   **Secure:** Access is temporary and controlled by an API key. No direct access to your source code or systems is granted.
*   **Simple:** No need for collaborators to set up complex development environments, VPNs, or get onboarded onto a large platform.
*   **Efficient:** They can quickly find information and understand context, making their work more effective from day one.
*   **Comprehensive:** Works across your entire knowledge base, not just source code, by including Office documents and PDFs in the context.
