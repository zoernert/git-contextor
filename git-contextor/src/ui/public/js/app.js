document.addEventListener('DOMContentLoaded', () => {
    const API_BASE_URL = 'http://localhost:3000'; // Assuming default API port

    const page = window.location.pathname;

    if (page === '/' || page.endsWith('index.html')) {
        initDashboard(API_BASE_URL);
    } else if (page.endsWith('config.html')) {
        initConfigPage(API_BASE_URL);
    }
});

function initDashboard(API_BASE_URL) {
    const statusElements = {
        repoName: document.getElementById('repo-name'),
        repoPath: document.getElementById('repo-path'),
        serviceStatus: document.getElementById('service-status'),
        indexedFiles: document.getElementById('indexed-files'),
        totalChunks: document.getElementById('total-chunks'),
    };
    const activityLog = document.getElementById('activity-log');
    const searchForm = document.getElementById('search-form');
    const searchQuery = document.getElementById('search-query');
    const searchResults = document.getElementById('search-results');
    
    let activityLogCleared = false;

    async function fetchStatus() {
        try {
            const response = await fetch(`${API_BASE_URL}/status`);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const data = await response.json();

            statusElements.repoName.textContent = data.repository?.name || 'N/A';
            statusElements.repoPath.textContent = data.repository?.path || 'N/A';
            
            const status = data.status || 'unknown';
            statusElements.serviceStatus.textContent = status;
            statusElements.serviceStatus.className = `status-badge status-${status.toLowerCase()}`;

            statusElements.indexedFiles.textContent = data.indexer?.indexedFiles ?? 'N/A';
            statusElements.totalChunks.textContent = data.indexer?.totalChunks ?? 'N/A';
            
            if (data.fileWatcher?.latestActivity && data.fileWatcher.latestActivity.length > 0) {
                if (!activityLogCleared) {
                    activityLog.innerHTML = '';
                    activityLogCleared = true;
                }
                data.fileWatcher.latestActivity.forEach(log => addActivityLog(log));
            }

        } catch (error) {
            console.error('Error fetching status:', error);
            Object.values(statusElements).forEach(el => el.textContent = 'Error');
            addActivityLog('Could not connect to server.');
        }
    }

    function addActivityLog(message) {
        const li = document.createElement('li');
        li.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
        activityLog.prepend(li);
        if (activityLog.children.length > 50) {
           activityLog.removeChild(activityLog.lastChild);
        }
    }

    async function performSearch(event) {
        event.preventDefault();
        const query = searchQuery.value;
        if (!query) return;

        searchResults.textContent = 'Searching...';

        try {
            const response = await fetch(`${API_BASE_URL}/search`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    // API key might be needed
                },
                body: JSON.stringify({ query: query })
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || `HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            searchResults.textContent = JSON.stringify(result.context, null, 2);

        } catch (error) {
            console.error('Error during search:', error);
            searchResults.textContent = `Error: ${error.message}`;
        }
    }

    searchForm.addEventListener('submit', performSearch);
    
    fetchStatus();
    setInterval(fetchStatus, 5000); // Poll every 5 seconds
}


function initConfigPage(API_BASE_URL) {
    const configDisplay = document.getElementById('config-display');

    async function fetchConfig() {
        try {
            // NOTE: The API doesn't have a /config endpoint in the spec.
            // Using /status and showing the repository part of the config.
            // A dedicated /config endpoint would be better.
            const response = await fetch(`${API_BASE_URL}/status`);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const data = await response.json();

            // The full config isn't usually exposed for security.
            // We'll display safe parts from the status endpoint.
            const displayConfig = {
                repository: data.repository,
                service_status: data.status,
                indexing_status: data.indexer,
            };

            configDisplay.textContent = JSON.stringify(displayConfig, null, 2);

        } catch (error) {
            console.error('Error fetching config:', error);
            configDisplay.textContent = 'Error loading configuration.';
        }
    }

    fetchConfig();
}
