document.addEventListener('DOMContentLoaded', async () => {
    // This script will run on all pages to fetch config first.
    try {
        const response = await fetch('/api/uiconfig');
        if (!response.ok) throw new Error('Failed to get API Key');
        const uiconfig = await response.json();
        sessionStorage.setItem('gctx_apiKey', uiconfig.apiKey);
    } catch (e) {
        document.body.innerHTML = '<h1>Error: Could not connect to Git Contextor server. Is it running?</h1>';
        console.error('Failed to fetch UI config:', e);
        return;
    }

    const API_BASE_URL = '/api';
    const page = window.location.pathname;

    if (page === '/' || page.endsWith('index.html')) {
        initDashboard(API_BASE_URL);
    } else if (page.endsWith('config.html')) {
        initConfigPage(API_BASE_URL);
    } else if (page.endsWith('docs.html')) {
        initDocsPage(API_BASE_URL);
    }
    // The charts page is handled by its own script, which can now use the API key
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
    const maxTokensInput = document.getElementById('max-tokens');
    const searchResultsContainer = document.getElementById('search-results-container');
    const searchResults = document.getElementById('search-results');
    const apiSnippetContainer = document.getElementById('api-snippet-container');
    const snippetTabs = document.querySelector('#api-snippet-container .tabs');
    const apiKey = sessionStorage.getItem('gctx_apiKey');

    // Chat elements
    const chatForm = document.getElementById('chat-form');
    const chatQuery = document.getElementById('chat-query');
    const chatResultsContainer = document.getElementById('chat-results-container');
    const chatResults = document.getElementById('chat-results');

    // Sharing elements
    const shareForm = document.getElementById('share-form');
    const shareDescription = document.getElementById('share-description');
    const shareDuration = document.getElementById('share-duration');
    const shareCreateResult = document.getElementById('share-create-result');
    const activeSharesList = document.getElementById('active-shares-list');
    const refreshSharesButton = document.getElementById('refresh-shares-btn');
    
    // Tunnel elements
    const tunnelToggleBtn = document.getElementById('tunnel-toggle-btn');
    const tunnelServiceSelect = document.getElementById('tunnel-service');
    const tunnelStatusContainer = document.getElementById('tunnel-status-container');
    const tunnelStatusSpan = document.getElementById('tunnel-status');
    const tunnelUrlSpan = document.getElementById('tunnel-url');
    const tunnelPasswordContainer = document.getElementById('tunnel-password-container');
    const tunnelPasswordSpan = document.getElementById('tunnel-password');
    
    async function fetchStatus() {
        try {
            const response = await fetch(`${API_BASE_URL}/status`, { headers: { 'x-api-key': apiKey } });
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
        const maxTokens = parseInt(maxTokensInput.value, 10);
        if (!query) return;

        searchResults.textContent = 'Searching...';
        searchResultsContainer.style.display = 'block';
        apiSnippetContainer.style.display = 'none';

        try {
            const response = await fetch(`${API_BASE_URL}/search`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': apiKey
                },
                body: JSON.stringify({ query: query, maxTokens: maxTokens })
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || `HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            searchResults.textContent = result.optimizedContext || 'No relevant context found.';
            
            generateApiSnippets(query, maxTokens, apiKey);
            apiSnippetContainer.style.display = 'block';

        } catch (error) {
            console.error('Error during search:', error);
            searchResults.textContent = `Error: ${error.message}`;
            apiSnippetContainer.style.display = 'none';
        }
    }

    function generateApiSnippets(query, maxTokens, apiKey) {
        const url = `${window.location.origin}${API_BASE_URL}/search`;
        const payload = { query, maxTokens };
        const payloadString = JSON.stringify(payload, null, 2);
        const curlPayload = payloadString.replace(/'/g, "'\\''");

        const curlSnippet = `curl -X POST '${url}' \\\n-H 'Content-Type: application/json' \\\n-H 'x-api-key: ${apiKey}' \\\n-d '${curlPayload}'`;
        
        const nodeSnippet = `const url = '${url}';
const options = {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'x-api-key': '${apiKey}'
    },
    body: JSON.stringify(${payloadString})
};
fetch(url, options)
    .then(res => res.json())
    .then(json => console.log(json))
    .catch(err => console.error('error:' + err));`;

        const pythonSnippet = `import requests
import json

url = '${url}'
api_key = '${apiKey}'

headers = {
    'Content-Type': 'application/json',
    'x-api-key': api_key
}

payload = ${payloadString}

response = requests.post(url, headers=headers, data=json.dumps(payload))

if response.status_code == 200:
    print(response.json())
else:
    print(f"Error: {response.status_code}", response.text)`;
    
        document.getElementById('snippet-curl').textContent = curlSnippet;
        document.getElementById('snippet-node').textContent = nodeSnippet;
        document.getElementById('snippet-python').textContent = pythonSnippet;
    }

    snippetTabs.addEventListener('click', (e) => {
        if (!e.target.matches('.tab-button')) return;

        const lang = e.target.dataset.lang;

        snippetTabs.querySelector('.active').classList.remove('active');
        e.target.classList.add('active');

        const activeSnippet = document.querySelector('#snippet-content .snippet.active');
        if (activeSnippet) {
            activeSnippet.classList.remove('active');
        }
        document.getElementById(`snippet-${lang}`).classList.add('active');
    });

    searchForm.addEventListener('submit', performSearch);
    
    // --- Chat Functions ---
    async function performChat(event) {
        event.preventDefault();
        const query = chatQuery.value;
        if (!query) return;

        chatResults.innerHTML = '<p class="loading">Thinking...</p>';
        chatResultsContainer.style.display = 'block';
        chatForm.querySelector('button').disabled = true;

        try {
            const response = await fetch(`${API_BASE_URL}/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
                body: JSON.stringify({ query: query })
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || `HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            if (window.marked) {
                chatResults.innerHTML = marked.parse(result.response || 'No response from AI.');
            } else {
                chatResults.textContent = result.response || 'No response from AI.';
            }

        } catch (error) {
            console.error('Error during chat:', error);
            chatResults.innerHTML = `<p class="error">Error: ${error.message}</p>`;
        } finally {
            chatForm.querySelector('button').disabled = false;
        }
    }

    // --- Sharing Functions ---
    async function createShare(event) {
        event.preventDefault();
        const description = shareDescription.value;
        const duration = shareDuration.value;
        
        shareForm.querySelector('button').disabled = true;
        shareCreateResult.style.display = 'none';

        try {
            const response = await fetch(`${API_BASE_URL}/share`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
                body: JSON.stringify({ description, duration: duration })
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || `HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            const resultText = `Share URL: ${window.location.origin}${result.access_url}\nAPI Key: ${result.api_key}\nExpires: ${new Date(result.expires_at).toLocaleString()}`;
            shareCreateResult.querySelector('pre').textContent = resultText;
            shareCreateResult.style.display = 'block';

            await fetchShares(); // Refresh the list

        } catch (error) {
            console.error('Error creating share:', error);
            shareCreateResult.querySelector('pre').textContent = `Error: ${error.message}`;
            shareCreateResult.style.display = 'block';
        } finally {
            shareForm.querySelector('button').disabled = false;
        }
    }

    async function fetchShares() {
        activeSharesList.innerHTML = '<li>Loading...</li>';
        try {
            const response = await fetch(`${API_BASE_URL}/share`, { headers: { 'x-api-key': apiKey } });
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const data = await response.json();

            activeSharesList.innerHTML = '';
            if (data.shares && data.shares.length > 0) {
                data.shares.forEach(share => {
                    const li = document.createElement('li');
                    li.innerHTML = `<strong>${share.description || 'No Description'}</strong> (ID: ${share.id.substring(0, 8)}...)<br>
                    Expires: ${new Date(share.expires_at).toLocaleString()}<br>
                    Usage: ${share.access_count} / ${share.max_queries}`;
                    activeSharesList.appendChild(li);
                });
            } else {
                activeSharesList.innerHTML = '<li>No active shares.</li>';
            }
        } catch (error) {
            console.error('Error fetching shares:', error);
            activeSharesList.innerHTML = `<li>Error loading shares.</li>`;
        }
    }

    chatForm.addEventListener('submit', performChat);
    shareForm.addEventListener('submit', createShare);
    refreshSharesButton.addEventListener('click', fetchShares);
    tunnelToggleBtn.addEventListener('click', toggleTunnel);

    // --- Tunnel Functions ---
    async function getTunnelStatus() {
        try {
            const response = await fetch(`${API_BASE_URL}/share/tunnel`, { headers: { 'x-api-key': apiKey } });
            if (!response.ok) {
                if (response.status === 404) { // Endpoint might not exist if API is old/down
                    updateTunnelUI({ status: 'stopped', url: null, service: null });
                    return;
                }
                throw new Error(`HTTP ${response.status}`);
            }
            const data = await response.json();
            updateTunnelUI(data);
        } catch (error) {
            console.error('Error fetching tunnel status:', error);
        }
    }

    function updateTunnelUI(data) {
        tunnelStatusSpan.textContent = data.status;
        tunnelToggleBtn.classList.remove('danger');
        
        if (data.status === 'stopped' || data.status === 'error') {
            tunnelToggleBtn.textContent = 'Start Tunnel';
            tunnelToggleBtn.disabled = false;
            tunnelServiceSelect.disabled = false;
            tunnelStatusContainer.style.display = 'none';
            tunnelPasswordContainer.style.display = 'none'; // Ensure hidden

            if (data.status === 'error') {
                tunnelStatusSpan.textContent = 'Error - check server logs for details.';
                tunnelStatusContainer.style.display = 'block';
                tunnelUrlSpan.textContent = 'N/A';
            }
        } else { // 'starting' or 'running'
            tunnelStatusContainer.style.display = 'block';
            tunnelServiceSelect.disabled = true;
            if (data.service) {
                tunnelServiceSelect.value = data.service;
            }

            // Show password if available
            if (data.password) {
                tunnelPasswordSpan.textContent = data.password;
                tunnelPasswordContainer.style.display = 'block';
            } else {
                tunnelPasswordContainer.style.display = 'none';
            }

            if (data.status === 'starting') {
                tunnelToggleBtn.textContent = 'Starting...';
                tunnelToggleBtn.disabled = true;
                tunnelUrlSpan.textContent = 'Waiting for URL...';
            } else if (data.status === 'running') {
                tunnelToggleBtn.textContent = 'Stop Tunnel';
                tunnelToggleBtn.disabled = false;
                tunnelToggleBtn.classList.add('danger');
                tunnelUrlSpan.innerHTML = data.url ? `<a href="${data.url}" target="_blank">${data.url}</a>` : 'Acquiring URL...';
            }
        }
    }

    async function toggleTunnel() {
        const currentStatus = tunnelStatusSpan.textContent;
        tunnelToggleBtn.disabled = true;

        try {
            if (currentStatus === 'stopped' || currentStatus.startsWith('Error')) {
                // Start the tunnel
                const service = tunnelServiceSelect.value;
                const response = await fetch(`${API_BASE_URL}/share/tunnel`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
                    body: JSON.stringify({ service })
                });
                if (!response.ok) {
                    const err = await response.json();
                    throw new Error(err.error || `HTTP ${response.status}`);
                }
            } else {
                // Stop the tunnel
                await fetch(`${API_BASE_URL}/share/tunnel`, {
                    method: 'DELETE',
                    headers: { 'x-api-key': apiKey }
                });
            }
        } catch (error) {
            alert(`Tunnel operation failed: ${error.message}`);
        } finally {
            // Let the interval update the UI, but give it a head start
            setTimeout(getTunnelStatus, 500);
        }
    }
    
    fetchStatus();
    fetchShares();
    getTunnelStatus();
    setInterval(fetchStatus, 5000); // Poll general status
    setInterval(getTunnelStatus, 3000); // Poll tunnel status frequently
}


function initConfigPage(API_BASE_URL) {
    const configDisplay = document.getElementById('config-display');
    const apiKey = sessionStorage.getItem('gctx_apiKey');

    async function fetchConfig() {
        try {
            // We need a proper /config endpoint to show the full config.
            // For now, we get some info from /status.
            const response = await fetch(`${API_BASE_URL}/status`, { headers: { 'x-api-key': apiKey } });
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

    const reindexButton = document.getElementById('reindex-button');
    const deleteCollectionButton = document.getElementById('delete-collection-button');

    if (reindexButton) {
        reindexButton.addEventListener('click', async () => {
            if (!confirm('Are you sure you want to trigger a full repository re-index? This may take some time.')) {
                return;
            }
            try {
                const response = await fetch(`${API_BASE_URL}/reindex`, {
                    method: 'POST',
                    headers: { 'x-api-key': apiKey, 'Content-Type': 'application/json' },
                    body: JSON.stringify({})
                });
                const result = await response.json();
                alert(result.message);
            } catch (error) {
                console.error('Re-index failed:', error);
                alert('Re-index failed. See console for details.');
            }
        });
    }

    if (deleteCollectionButton) {
        deleteCollectionButton.addEventListener('click', async () => {
            if (!confirm('DANGER: This will delete all data from the vector store and cannot be undone. Are you absolutely sure?')) {
                return;
            }
            try {
                const response = await fetch(`${API_BASE_URL}/reindex`, {
                    method: 'DELETE',
                    headers: { 'x-api-key': apiKey }
                });
                const result = await response.json();
                alert(result.message);
                window.location.reload();
            } catch (error) {
                console.error('Delete collection failed:', error);
                alert('Delete collection failed. See console for details.');
            }
        });
    }

    fetchConfig();
}

function initDocsPage(API_BASE_URL) {
    const navEl = document.getElementById('docs-nav');
    const contentEl = document.getElementById('docs-content');
    // API key is not strictly needed for public docs endpoint, but good practice to have available
    const apiKey = sessionStorage.getItem('gctx_apiKey');

    async function loadDoc(filename) {
        try {
            contentEl.innerHTML = '<p>Loading...</p>';
            const response = await fetch(`${API_BASE_URL}/docs/${filename}`);
            if (!response.ok) throw new Error(`Failed to load doc: ${response.statusText}`);
            const markdown = await response.text();
            contentEl.innerHTML = marked.parse(markdown);

            // Update active link in the navigation
            document.querySelectorAll('#docs-nav a').forEach(a => {
                if (a.dataset.filename === filename) {
                    a.classList.add('active');
                } else {
                    a.classList.remove('active');
                }
            });

        } catch (error) {
            console.error('Error loading documentation:', error);
            contentEl.innerHTML = `<p>Error loading document: ${error.message}</p>`;
        }
    }

    async function init() {
        try {
            navEl.innerHTML = '<p>Loading nav...</p>';
            const response = await fetch(`${API_BASE_URL}/docs`);
            if (!response.ok) throw new Error(`Failed to load doc list: ${response.statusText}`);
            const files = await response.json();
            
            navEl.innerHTML = '';
            // Sort to have GUIDE and API first
            files.sort((a, b) => {
                if (a.filename === 'GUIDE.md') return -1;
                if (b.filename === 'GUIDE.md') return 1;
                if (a.filename === 'API.md') return -1;
                if (b.filename === 'API.md') return 1;
                return a.name.localeCompare(b.name);
            });
            
            files.forEach(file => {
                const link = document.createElement('a');
                link.href = '#';
                link.textContent = file.name;
                link.dataset.filename = file.filename;
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    loadDoc(file.filename);
                });
                navEl.appendChild(link);
            });

            // Load the first document by default
            if (files.length > 0) {
                loadDoc(files[0].filename);
            } else {
                contentEl.innerHTML = '<p>No documentation files found.</p>';
            }

        } catch (error) {
            console.error('Error initializing docs page:', error);
            navEl.innerHTML = `<p>Error</p>`;
            contentEl.innerHTML = `<p>Could not load documentation: ${error.message}</p>`;
        }
    }

    init();
}
