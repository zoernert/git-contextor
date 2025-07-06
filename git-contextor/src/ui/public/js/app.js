document.addEventListener('DOMContentLoaded', () => {
    // API calls are proxied through the UI server, so use relative paths.
    const API_BASE_URL = '/api';

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

            statusElements.indexedFiles.textContent = data.indexer?.totalFiles ?? 'N/A';
            statusElements.totalChunks.textContent = data.indexer?.totalChunks ?? 'N/A';
            
            // Update activity log
            activityLog.innerHTML = ''; // Clear the log
            const activities = data.fileWatcher?.latestActivity || [];
            if (activities.length === 0) {
                addActivityLog('Waiting for events...');
            } else {
                // The API returns newest first. To display newest on top with prepend,
                // we must process them from oldest to newest.
                activities.reverse().forEach(log => addActivityLog(log));
            }

        } catch (error) {
            console.error('Error fetching status:', error);
            Object.values(statusElements).forEach(el => el.textContent = 'Error');
            addActivityLog('Could not connect to server.');
        }
    }

    function addActivityLog(log) {
        const li = document.createElement('li');
        if (typeof log === 'string') {
            li.textContent = `[${new Date().toLocaleTimeString()}] ${log}`;
        } else {
            const eventText = log.event.charAt(0).toUpperCase() + log.event.slice(1);
            li.innerHTML = `[${new Date(log.timestamp).toLocaleTimeString()}] <strong>${eventText}:</strong> ${log.path}`;
        }
        activityLog.prepend(li);
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
            // A dedicated /config endpoint would be better, but for now we derive from /status
            const response = await fetch(`${API_BASE_URL}/status`);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const data = await response.json();

            // Display safe parts from the status endpoint
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
