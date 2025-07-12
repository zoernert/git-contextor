# Context Generation and Collection Summary

A key challenge in using Large Language Models (LLMs) with codebases is providing the right context. An LLM's understanding is only as good as the information it receives. Git Contextor employs several strategies to create the most relevant, token-efficient context, with the **Collection Summary** being one of its most powerful features.

## What is the Collection Summary?

Think of the Collection Summary as a high-level, AI-generated "table of contents" for your entire repository. It's a virtual document that doesn't exist as a physical file in your project but is stored within the vector database.

When generated, it gets a special, reserved path: `gitcontextor://system/collection-summary.md`.

This summary provides the AI with an initial bird's-eye view of your project's architecture, key components, and dominant technologies before it even looks at the specific code snippets related to a query. This leads to more insightful and accurate responses.

## How It Works: The Magic Behind It

The summary generation is an on-demand process that combines vector clustering with LLM-based summarization.

1.  **Fetch All Data**: Git Contextor retrieves all indexed code and text chunks from the vector store (Qdrant or in-memory).
2.  **Cluster Similar Chunks**: It uses the **k-means clustering** algorithm to group these chunks. Each cluster represents a distinct topic, feature, or theme within your codebase (e.g., "authentication logic," "database models," "frontend state management").
3.  **LLM Summarization**: For each cluster, Git Contextor sends a small sample of representative chunks to your configured LLM. It prompts the AI to act as an expert architect and produce a concise summary for that specific cluster, including a headline and key concepts.
4.  **Index the Summary**: The final, combined summary (in Markdown format) is indexed back into the vector store as a single, high-priority document.

## How to Generate the Summary

The summary generation is triggered via an API call. This is an asynchronous process that can take a few minutes, depending on the size of your repository and the speed of your LLM.

You can trigger it using a `curl` command:

```bash
# Replace <your-api-key> with the key from your .gitcontextor/config.json
curl -X POST -H "Authorization: Bearer <your-api-key>" http://localhost:3333/api/collection/summarize
```

The API will respond immediately with a `202 Accepted` status, indicating that the process has started in the background.

## How to Use the Summary

To leverage the summary in your queries, simply add the `include_summary: true` flag to your API requests to the `/api/chat` or `/api/search` endpoints.

**Example Chat Request:**

```json
{
  "query": "Explain the overall architecture of this project.",
  "include_summary": true
}
```

When this flag is set, Git Contextor automatically retrieves the Collection Summary and places it at the very beginning of the context sent to the LLM, ensuring the AI gets the big picture first.
