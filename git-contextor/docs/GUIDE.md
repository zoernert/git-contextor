# Git Contextor - Benutzerhandbuch

Willkommen bei Git Contextor! Dieses Handbuch führt Sie durch die Einrichtung, Konfiguration und Nutzung des Tools.

## 1. Was ist Git Contextor?

Git Contextor ist ein Entwicklerwerkzeug, das als lokaler Dienst läuft und ein Git-Repository kontinuierlich überwacht. Es analysiert Ihren Code, zerlegt ihn in sinnvolle, sprachspezifische Blöcke (Chunks) und wandelt diese in numerische Vektoren (Embeddings) um. Diese Vektoren werden in einer Vektordatenbank (Qdrant) gespeichert.

Der Hauptzweck besteht darin, eine API für die semantische Suche bereitzustellen. Anstatt nach Schlüsselwörtern zu suchen, können Sie eine Frage oder Beschreibung eingeben, und Git Contextor findet die relevantesten Code-Abschnitte, die die kontextuelle Bedeutung Ihrer Anfrage am besten erfassen.

## 2. Erste Schritte

### Initialisierung
Navigieren Sie in Ihr Projektverzeichnis und führen Sie aus:
```bash
npx git-contextor init
```
Dieser Befehl erstellt ein `.gitcontextor`-Verzeichnis in Ihrem Projekt, das die Konfigurationsdatei `config.json` enthält.

### Konfiguration
Öffnen Sie die neu erstellte `.gitcontextor/config.json`. Der wichtigste Schritt ist die Konfiguration Ihres Embedding-Providers. Git Contextor unterstützt `gemini` (Google), `openai` und `local` (über Transformers.js, keine API erforderlich).

**Beispiel für Gemini:**
```json
"embedding": {
  "provider": "gemini",
  "model": "text-embedding-004",
  "apiKey": "IHR_GEMINI_API_SCHLÜSSEL_HIER",
  "dimensions": 768
}
```
Stellen Sie sicher, dass Sie Ihren API-Schlüssel einfügen.

### Starten des Dienstes
Führen Sie den folgenden Befehl aus, um den Dienst zu starten:
```bash
npx git-contextor start
```
Beim ersten Start prüft Git Contextor, ob eine Verbindung zur Vektordatenbank Qdrant hergestellt werden kann. Wenn nicht, werden Sie gefragt, ob Sie Qdrant über Docker starten möchten.

Sobald der Dienst läuft, beginnt er mit der initialen Indizierung Ihres gesamten Repositorys.

## 3. Die Web-UI verwenden

Öffnen Sie [http://localhost:3000](http://localhost:3000) (oder den von Ihnen konfigurierten Port) in Ihrem Browser.

### Dashboard
Das Dashboard bietet eine Statusübersicht, einschließlich des Repository-Namens, des Indizierungsstatus und eines Live-Aktivitäts-Feeds, der Dateiänderungen in Echtzeit anzeigt.

Hier können Sie auch die semantische Suche nutzen:
1.  Geben Sie Ihre Suchanfrage in das Suchfeld ein (z. B. "wie implementiere ich die Benutzerauthentifizierung").
2.  Passen Sie bei Bedarf die maximalen Token an.
3.  Klicken Sie auf "Suchen".

Die Ergebnisse werden als optimierter Kontext-String angezeigt, der direkt in eine LLM-Eingabeaufforderung kopiert werden kann. Darunter finden Sie API-Snippets, um die gleiche Suche programmatisch durchzuführen.

### Metriken & Konfiguration
- **Metriken:** Visualisiert Leistungsdaten wie die Anzahl der indizierten Chunks und die Speichernutzung.
- **Konfiguration:** Zeigt einen Teil der aktuellen Konfiguration an und bietet "Gefahrenzonen"-Aktionen wie die Neuindizierung des gesamten Repositorys oder das Löschen aller Daten aus dem Vektor-Store.

## 4. Die CLI verwenden

- `git-contextor status`: Zeigt den aktuellen Status des Dienstes an.
- `git-contextor query "Ihre Anfrage"`: Führt eine semantische Suche von der Kommandozeile aus durch.
- `git-contextor reindex`: Löst eine vollständige Neuindizierung aus.
- `git-contextor config --show`: Zeigt die gesamte `config.json` an.
- `git-contextor config --<key> <value>`: Aktualisiert einen Konfigurationswert (z.B. `--embedding-provider local`).
- `git-contextor stop`: Stoppt den Dienst (insbesondere den Daemon).

## 5. API-Nutzung

Git Contextor stellt eine REST-API bereit. Alle Endpunkte (außer Health, UI-Config und Docs) erfordern einen `x-api-key`-Header. Ihren Schlüssel finden Sie in `config.json`.

- `GET /api/status`: Ruft den Dienststatus ab.
- `POST /api/search`: Führt eine semantische Suche durch.
- `POST /api/reindex`: Startet die Neuindizierung.

Detaillierte Informationen zu Endpunkten, Anfragen und Antworten finden Sie auf der Seite **API** in der Dokumentations-UI.
