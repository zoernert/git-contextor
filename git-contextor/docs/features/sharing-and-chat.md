# Conversational AI and Secure Sharing

Git Contextor goes beyond simple search. It brings a conversational AI to your command line and allows you to securely share your project's context with others, turning your local codebase into an AI service.

## 💬 AI Chat (`chat`)

Directly "talk" to your project from the command line. Ask complex questions about architecture, implementation details, or logic, and get AI-generated answers based on the most relevant code context.

### How it Works

1.  You run `git-contextor chat "your question"`.
2.  Git Contextor performs a semantic search to find the most relevant code chunks related to your question.
3.  These chunks are packed into an optimized context.
4.  The context and your question are sent to a powerful language model (like GPT-4 or Gemini) to generate a helpful, human-like answer.
5.  The response is streamed back to your terminal.

### Usage

```bash
# Ask a general question
git-contextor chat "How is user authentication handled in this project?"

# Focus on a specific aspect of the code
git-contextor chat "Summarize the database schema for the 'users' table" --context architecture

# Ask about security patterns
git-contextor chat "Are there any rate-limiting mechanisms implemented?" --context security
```

### Configuration

The chat feature uses the embedding provider configured in your `.gitcontextor/config.json`. To get conversational AI responses, you must configure a provider with an API key (e.g., `openai` or `gemini`). If no provider is configured, it will fall back to returning the raw context.

```bash
# Configure OpenAI
git-contextor config --embedding-provider openai --api-key "sk-..."

# Configure Gemini
git-contextor config --embedding-provider gemini --api-key "..."
```

## 🚀 Secure Sharing (`share`)

Securely share temporary, scoped access to your repository's AI capabilities with external collaborators, without exposing your source code. This is perfect for code reviews, external audits, or collaborative debugging.

### Features

-   **Temporary Access**: Shares automatically expire after a configurable duration.
-   **Scoped Permissions**: Limit access to certain contexts (e.g., only 'architecture').
-   **Usage Limits**: Set a maximum number of queries per share.
-   **Secure Keys**: Each share gets a unique, revocable API key.
-   **Tunneling**: Instantly create a public URL for your local service using tools like `localtunnel`, `ngrok`, or `serveo.net`.

### Usage

#### 1. Create a Share

```bash
# Create a share that expires in 7 days
git-contextor share create --duration 7d --description "External code review for auth module"

# The command will output a Share ID, a unique API Key, and an expiration date.
# ✅ Repository share created!
# Share ID: 2a9b...
# API Key: 8f3c...
# Expires: 2025-07-13T10:00:00.000Z
# Local URL: http://localhost:3333/shared/2a9b...
```

#### 2. Create a Public Tunnel

To make the share accessible to someone outside your network, create a tunnel.

```bash
# Create a share and immediately open a public tunnel with localtunnel
git-contextor share create --duration 1h --tunnel localtunnel

# 🚇 Creating tunnel...
# 🌍 Public URL: https://some-random-name.loca.lt
```
Provide your collaborator with the **full share URL** and the **API key**. The full share URL is the public tunnel URL combined with the share path (e.g., `https://some-random-name.loca.lt/shared/2a9b...`).

**Important Security Note:** The main tunnel URL (e.g., `https://some-random-name.loca.lt`) only displays a public landing page. Your Git Contextor admin dashboard and private APIs are **not** exposed to the internet. Only the specific `/shared/{shareId}` endpoints are accessible publicly with the correct share key.

#### 3. List Active Shares

```bash
git-contextor share list
```
This shows all non-expired shares, their IDs, descriptions, and usage counts.

#### 4. External Access

The external user can now access the shared context via its full URL. They can use the simple web UI provided at that URL or query the API endpoints programmatically, for example with `curl`.

```bash
# External user queries the public URL
curl -X POST "https://some-random-name.loca.lt/shared/2a9b.../chat" \
  -H "x-share-key: 8f3c..." \
  -H "Content-Type: application/json" \
  -d '{"query": "What is the main authentication pattern used here?"}'
```

The response will be a JSON object containing the AI's answer, scoped to the permissions of the share.
