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

The chat feature is powered by a separate `llm` section in your `.gitcontextor/config.json`. This allows you to use a local model for embeddings while still using a powerful cloud-based model (like GPT-4) for chat.

You can add or edit this section in the UI under `Configuration`.

```json
"llm": {
  "provider": "openai",
  "model": "gpt-4-turbo",
  "apiKey": "sk-..."
}
```

-   `provider`: The service to use for generating responses (e.g., `openai`, `gemini`).
-   `model`: The specific model to use.
-   `apiKey`: Your API key for the selected provider.

For backward compatibility, if the `llm` section is not present, Git Contextor will fall back to using the `embedding` configuration.

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

To make the share accessible to someone outside your network, create a tunnel. Git Contextor now uses **tunnel.corrently.cloud** as the default tunnel service, which provides enterprise-grade, secure tunneling.

```bash
# Create a share and immediately open a public tunnel with tunnel.corrently.cloud
git-contextor share create --duration 1h --tunnel

# 🚇 Creating tunnel...
# 🌍 Public URL: https://tunnel.corrently.cloud/tunnel/git-contextor-12345
```

**Setting up tunnel.corrently.cloud:**

1. Get your API key from tunnel.corrently.cloud
2. Set it as an environment variable:
   ```bash
   export CORRENTLY_TUNNEL_API_KEY=your_api_key_here
   ```
3. Test the connection:
   ```bash
   git-contextor tunnel test
   ```

**Alternative tunnel services:**

You can also use other tunnel services if needed:

```bash
# Use localtunnel (no API key required)
git-contextor share create --duration 1h --tunnel localtunnel

# Use ngrok (requires ngrok installation)
git-contextor share create --duration 1h --tunnel ngrok
```
Provide your collaborator with the **full share URL** and the **API key**. The full share URL is the public tunnel URL combined with the share path (e.g., `https://tunnel.corrently.cloud/tunnel/git-contextor-12345/shared/2a9b...`).

**Important Security Note:** The main tunnel URL (e.g., `https://tunnel.corrently.cloud/tunnel/git-contextor-12345`) only displays a public landing page. Your Git Contextor admin dashboard and private APIs are **not** exposed to the internet. Only the specific `/shared/{shareId}` endpoints are accessible publicly with the correct share key.

#### 3. List Active Shares

```bash
git-contextor share list
```
This shows all non-expired shares, their IDs, descriptions, and usage counts.

#### 4. External Access

The external user can now access the shared context via its full URL. They get the same powerful AI chat experience as the main user, with their access restricted to the defined scope of the share. They can use the simple web UI provided at that URL or query the API endpoints programmatically, for example with `curl`.

```bash
# External user queries the public URL
curl -X POST "https://tunnel.corrently.cloud/tunnel/git-contextor-12345/shared/2a9b.../chat" \
  -H "x-share-key: 8f3c..." \
  -H "Content-Type: application/json" \
  -d '{"query": "What is the main authentication pattern used here?"}'
```

The response will be a JSON object containing the AI's answer, scoped to the permissions of the share. The collaborator gets a full conversational response, not just raw code context.
