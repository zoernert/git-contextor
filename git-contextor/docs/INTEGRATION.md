# Integration von Git Contextor mit anderen Werkzeugen

Git Contextor ist als flexibler Dienst konzipiert, der in verschiedene Arbeitsabläufe und Anwendungen integriert werden kann. Dieses Handbuch bietet einen Überblick, wie Sie Git Contextor mit anderen gängigen Werkzeugen verbinden können.

**API-Grundlagen:**
- **URL:** `http://localhost:3000/api` (Port ist konfigurierbar)
- **Authentifizierung:** Alle API-Endpunkte (außer `/health`, `/api/uiconfig`, `/api/docs`) erfordern einen `x-api-key`-Header. Sie finden Ihren Schlüssel in der Datei `.gitcontextor/config.json`.

---

## Integrationsanleitungen

Wählen Sie eine Anleitung unten für detaillierte Anweisungen zur Integration von Git Contextor in Ihr bevorzugtes Werkzeug oder Ihren Workflow.

*   **Programmatischer Zugriff (Node.js & Python)**
    *   Erfahren Sie, wie Sie direkte API-Aufrufe von Ihren Skripten aus durchführen.

*   **LangChain (Python)**
    *   Erstellen Sie einen benutzerdefinierten LangChain `Retriever`, um Git Contextor als Kontextquelle für Ihre RAG (Retrieval-Augmented Generation) Chains zu verwenden.

*   **n8n**
    *   Verwenden Sie den `HTTP Request`-Knoten in n8n, um Git Contextor einfach in Ihre Automatisierungs-Workflows zu integrieren.

*   **Node-RED**
    *   Verbinden Sie Git Contextor mit Ihren Node-RED-Flows über den `http request`-Knoten.

*   **Monitoring mit Kibana**
    *   Leiten Sie Protokolle an einen ELK-Stack (Elasticsearch, Logstash, Kibana) weiter, um den Anwendungsstatus, Fehler und Aktivitäten in Echtzeit zu überwachen.
