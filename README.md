
# Git Contextor

[![NPM-Version](https://img.shields.io/npm/v/git-contextor.svg?style=flat)](https://www.npmjs.com/package/git-contextor)
[![Build-Status](https://img.shields.io/github/actions/workflow/status/stromdao/git-contextor/main.yml?branch=main)](https://github.com/stromdao/git-contextor/actions)
[![Lizenz: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Git Contextor indiziert automatisch Ihr Git-Repository und erstellt eine leistungsstarke, echtzeitfähige und kontextsensitive Wissensdatenbank. Es wurde entwickelt, um KI-Entwicklerwerkzeuge zu beschleunigen, indem es ihnen mühelos den vollständigen Kontext Ihres Projekts zur Verfügung stellt.

## ✨ Warum Git Contextor?

Im Zeitalter der KI-gestützten Entwicklung ist die Bereitstellung des richtigen Kontexts der Schlüssel zu nützlichen Ergebnissen. Das manuelle Kopieren und Einfügen von Code-Schnipseln ist ineffizient und schränkt das Verständnis der KI ein. Git Contextor löst dieses Problem durch:

-   **Automatisierung des Kontexts:** Es indiziert Ihre gesamte Codebasis und hält sie synchron.
-   **Tiefgreifende Einblicke:** Ermöglicht Werkzeugen, die Repository-Struktur, Abhängigkeiten und die Semantik des Codes zu verstehen.
-   **Erschließung neuer Möglichkeiten:** Basiert erweiterte Funktionen wie Fragen und Antworten über das gesamte Repository, intelligente Codegenerierung und automatisierte Refactoring-Vorschläge.

## 🚀 Hauptmerkmale

-   **🤖 Automatische Indizierung:** Scannt Ihre von Git verfolgten Dateien und indiziert sie in einer Vektor-Datenbank.
-   **⏱️ Echtzeit-Synchronisierung:** Überwacht Dateiänderungen (`add`, `change`, `delete`) und aktualisiert den Index sofort.
-   **🔌 Austauschbare Embeddings:** Unterstützt lokale Embeddings (über `Xenova/transformers.js`) für Datenschutz und Offline-Nutzung sowie OpenAI für leistungsstarke Modelle.
-   **⚡️ Schnell & Effizient:** Basiert auf Node.js und verwendet die hochleistungsfähige [Qdrant](https://qdrant.tech/) Vektor-Datenbank.
-   **📡 REST-API:** Eine einfache API zur Abfrage von kontextrelevanten Informationen.
-   **💻 Benutzerfreundliches CLI:** Verwalten Sie den Dienst mit einfachen Befehlen: `init`, `start`, `stop`, `status`.

## 🏁 Erste Schritte

### Voraussetzungen

-   [Node.js](https://nodejs.org/) (v18 oder höher)
-   [npm](https://www.npmjs.com/) oder [yarn](https://yarnpkg.com/)
-   [Docker](https://www.docker.com/) (zum Ausführen der Qdrant Vektor-Datenbank)

### 1. Git Contextor installieren

Installieren Sie das CLI-Tool global von npm (Hinweis: Paketname ist eine Annahme).

```bash
npm install -g git-contextor
```

### 2. Qdrant starten

Git Contextor benötigt eine laufende Qdrant-Instanz. Sie können eine einfach mit Docker starten:

```bash
docker run -p 6333:6333 -p 6334:6334 qdrant/qdrant
```
Dies startet Qdrant und macht seine gRPC- und HTTP-Ports verfügbar.

### 3. In Ihrem Repository initialisieren

Navigieren Sie zum Stammverzeichnis Ihres Projekts und führen Sie `init` aus.

```bash
cd /pfad/zu/ihrem/repo
git-contextor init
```

Dies erstellt ein `.gitcontextor`-Verzeichnis mit einer `config.json`-Datei. Hier können Sie Einstellungen anpassen, wie den Embedding-Anbieter oder zu ignorierende Dateien.

### 4. Dienst starten

Starten Sie den Indizierungs- und Überwachungs-Daemon-Prozess.

```bash
git-contextor start
```

Git Contextor beginnt nun mit der initialen Indizierung Ihres Repositorys. Sie können den Fortschritt mit dem `status`-Befehl überprüfen.

```bash
git-contextor status
```

## ⚙️ Konfiguration

Die Hauptkonfiguration befindet sich unter `.gitcontextor/config.json`. Wichtige Optionen sind:
-   `embedding.provider`: Wechseln Sie zwischen `local` und `openai`.
-   `embedding.model`: Geben Sie das zu verwendende Modell an.
-   `indexing.includeExtensions`: Definieren Sie, welche Dateitypen indiziert werden sollen.

## 🤝 Mitwirken

Beiträge sind willkommen! Zögern Sie nicht, ein Issue zu eröffnen oder einen Pull Request einzureichen.

1.  Forken Sie das Repository.
2.  Erstellen Sie Ihren Feature-Branch (`git checkout -b feature/TollesFeature`).
3.  Committen Sie Ihre Änderungen (`git commit -m 'Füge ein tolles Feature hinzu'`).
4.  Pushen Sie zum Branch (`git push origin feature/TollesFeature`).
5.  Öffnen Sie einen Pull Request.

## 📄 Lizenz

Dieses Projekt ist unter der MIT-Lizenz lizenziert.

## 🏢 Betreiber / Impressum

<details>
<summary>Kontaktinformationen</summary>
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
Handelsregister: HRB 728691 (Amtsgericht Mannheim)<br/>
<br/>
https://stromdao.de/<br/>
</addr>
</details>
