# Integrating Git Contextor with Other Tools

Git Contextor is designed to be a flexible service that can be integrated into various workflows and applications. This guide provides an overview of how to connect it with other popular tools.

**API Basics:**
- **URL:** `http://localhost:3000/api` (port is configurable)
- **Authentication:** All API endpoints (except `/health`, `/api/uiconfig`, `/api/docs`) require an `x-api-key` header. You can find your key in the `.gitcontextor/config.json` file.

---

## Integration Guides

Select a guide below for detailed instructions on how to integrate Git Contextor with your preferred tool or workflow.

*   [**Programmatic Access (Node.js & Python)**](./integrations/programmatic.md)
    *   Learn how to make direct API calls from your scripts.

*   [**LangChain (Python)**](./integrations/langchain.md)
    *   Create a custom LangChain `Retriever` to use Git Contextor as a context source for your RAG (Retrieval-Augmented Generation) chains.

*   [**n8n**](./integrations/n8n.md)
    *   Use the `HTTP Request` node in n8n to easily incorporate Git Contextor into your automation workflows.

*   [**Node-RED**](./integrations/node-red.md)
    *   Connect Git Contextor to your Node-RED flows using the `http request` node.

*   [**Monitoring with Kibana**](./integrations/kibana.md)
    *   Forward logs to an ELK Stack (Elasticsearch, Logstash, Kibana) to monitor application status, errors, and activity in real-time.
