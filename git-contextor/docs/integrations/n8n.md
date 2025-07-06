# Integrating Git Contextor with n8n

n8n is a powerful workflow automation tool that can be used to connect Git Contextor with various other services. This guide will show you how to set up a simple workflow to use Git Contextor's semantic search capabilities within n8n.

## Prerequisites

- Git Contextor running and accessible via its API.
- An n8n instance (cloud or self-hosted).
- Your Git Contextor API key.

## Steps

### 1. Create a New Workflow in n8n

Start by creating a new, empty workflow in your n8n dashboard.

### 2. Add an HTTP Request Node

The core of the integration is making an API call to the Git Contextor `/api/search` endpoint.

- Add an **HTTP Request** node to your workflow.
- **Method**: `POST`
- **URL**: `http://localhost:3000/api/search` (or your Git Contextor's server address).
- **Authentication**: `Header Auth`
- In the **Name** field for the header, enter `x-api-key`.
- In the **Value** field, paste your Git Contextor API key.
- **Body Content Type**: `JSON`
- **Body**:
  ```json
  {
    "query": "your semantic search query here"
  }
  ```
  You can use an expression to pass data from a previous node into the `query` field, for example: `{{ $json.question }}`.

### 3. Test the Node

Execute the node to ensure it successfully connects to Git Contextor and returns a search result. You should see the context string in the node's output.

### 4. Connect to Other Services

Now you can use the output from the HTTP Request node in other n8n nodes. For example, you could:
- Send the context to an LLM like OpenAI to generate a summary.
- Post the result to a Slack channel.
- Create a ticket in a project management tool like Jira.

## Example Workflow

A simple workflow might look like this:

`Manual Trigger` -> `HTTP Request (to Git Contextor)` -> `Set (to format the output)` -> `Slack (to post the result)`

This demonstrates how to leverage Git Contextor's semantic search within your automated n8n workflows.
