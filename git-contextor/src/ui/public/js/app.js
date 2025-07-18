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
        totalChunks: document.getElementById('total-chunks'),
        watcherStatus: document.getElementById('watcher-status'),
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
    const chatContextContainer = document.getElementById('chat-context-container');
    const chatContextCount = document.getElementById('chat-context-count');
    const toggleContextBtn = document.getElementById('toggle-context-btn');
    const chatContextDetails = document.getElementById('chat-context-details');

    // File Browser elements
    const fileTreePanel = document.getElementById('file-tree-panel');
    const fileViewerPanel = document.getElementById('file-viewer-panel');
    const fileViewerFilename = document.getElementById('file-viewer-filename');
    const fileViewerContent = document.getElementById('file-viewer-content');
    const fileAskAiBtn = document.getElementById('file-ask-ai-btn');

    // Global state for file-focused chat
    let fileChatContext = null;

    // Sharing elements
    const shareForm = document.getElementById('share-form');
    const shareDescription = document.getElementById('share-description');
    const shareDuration = document.getElementById('share-duration');
    const shareCreateResult = document.getElementById('share-create-result');
    const activeSharesList = document.getElementById('active-shares-list');
    const refreshSharesButton = document.getElementById('refresh-shares-btn');
        
    // Summary elements
    const summaryContent = document.getElementById('summary-content');
    const updateSummaryBtn = document.getElementById('update-summary-btn');
    
    // Tunnel elements
    const tunnelToggleBtn = document.getElementById('tunnel-toggle-btn');
    const tunnelServiceSelect = document.getElementById('tunnel-service');
    const tunnelStatusContainer = document.getElementById('tunnel-status-container');
    const tunnelStatusSpan = document.getElementById('tunnel-status');
    const tunnelUrlSpan = document.getElementById('tunnel-url');
    const tunnelPasswordContainer = document.getElementById('tunnel-password-container');
    const tunnelPasswordSpan = document.getElementById('tunnel-password');
    const tunnelHint = document.getElementById('tunnel-hint');
    const watcherToggle = document.getElementById('watcher-toggle');
    
    // Managed tunneling elements
    const managedTunnelOptions = document.getElementById('managed-tunnel-options');
    const tunnelSubdomain = document.getElementById('tunnel-subdomain');
    const tunnelDescription = document.getElementById('tunnel-description');
    const managedTunnelAuthStatus = document.getElementById('managed-tunnel-auth-status');
    const managedTunnelLoginBtn = document.getElementById('managed-tunnel-login-btn');
    
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

            const watcherStatus = data.watcher?.status || 'unknown';
            const watcherClass = watcherStatus === 'enabled' ? 'status-running' : 'status-stopped';
            statusElements.watcherStatus.textContent = watcherStatus;
            statusElements.watcherStatus.className = `status-badge ${watcherClass}`;
            if (watcherToggle) {
                watcherToggle.checked = (watcherStatus === 'enabled');
            }

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
            const pathLink = `<a href="#" class="file-link" data-path="${log.path}">${log.path}</a>`;
            li.innerHTML = `[${new Date(log.timestamp).toLocaleTimeString()}] <strong>${eventText}:</strong> ${pathLink}`;
        }
        activityLog.prepend(li);
    }

    async function performSearch(event) {
        event.preventDefault();
        const query = searchQuery.value;
        const maxTokens = parseInt(maxTokensInput.value, 10);
        if (!query) return;

        searchResults.innerHTML = '<p class="loading">Searching...</p>';
        searchResultsContainer.style.display = 'block';
        apiSnippetContainer.style.display = 'none';

        try {
            const response = await fetch(`${API_BASE_URL}/search`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
                body: JSON.stringify({ query: query, maxTokens: maxTokens })
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || `HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            searchResults.innerHTML = ''; // Clear loading message

            if (!result.results || result.results.length === 0) {
                searchResults.innerHTML = '<p>No relevant context found.</p>';
            } else {
                result.results.forEach(item => {
                    const card = document.createElement('div');
                    card.className = 'search-result-card';

                    const header = document.createElement('div');
                    header.className = 'result-card-header';
                    const filePath = item.filePath || 'Unknown file';
                    const score = item.score?.toFixed(3) || 'N/A';
                    header.innerHTML = `
                        <span class="file-path">${filePath}</span>
                        <div class="result-actions">
                            <span class="score">Score: ${score}</span>
                            <button class="button-secondary view-file-btn" data-path="${filePath}">View File</button>
                        </div>`;

                    const content = document.createElement('pre');
                    const code = document.createElement('code');
                    
                    const extension = filePath.split('.').pop();
                    const langMap = { 'js': 'javascript', 'ts': 'typescript', 'py': 'python', 'java': 'java', 'go': 'go', 'html': 'xml', 'css': 'css', 'json': 'json', 'md': 'markdown' };
                    const lang = langMap[extension] || 'plaintext';
                    code.className = `language-${lang}`;
                    code.textContent = item.content || 'No content';
                    
                    content.appendChild(code);
                    card.appendChild(header);
                    card.appendChild(content);
                    searchResults.appendChild(card);
                    
                    // Apply highlighting to the newly added element
                    if (window.hljs) {
                        hljs.highlightElement(code);
                    }
                });
            }
            
            generateApiSnippets(query, maxTokens, apiKey);
            apiSnippetContainer.style.display = 'block';

        } catch (error) {
            console.error('Error during search:', error);
            searchResults.innerHTML = `<p class="error">Error: ${error.message}</p>`;
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

        // Reset context display for new query
        chatContextContainer.style.display = 'none';
        chatContextDetails.style.display = 'none';
        toggleContextBtn.textContent = 'Show';

        try {
            const body = { query: query };
            if (fileChatContext) {
                body.options = { filePath: fileChatContext };
                fileChatContext = null; // Reset after use
                chatQuery.value = ''; // Clear input after submitting file-context question
            }

            const response = await fetch(`${API_BASE_URL}/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
                body: JSON.stringify(body)
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.response || err.error || `HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            if (window.marked) {
                chatResults.innerHTML = marked.parse(result.response || 'No response from AI.');
            } else {
                chatResults.textContent = result.response || 'No response from AI.';
            }

            // Render context chunks if available
            if (result.context_chunks && Array.isArray(result.context_chunks) && result.context_chunks.length > 0) {
                chatContextContainer.style.display = 'block';
                chatContextCount.textContent = result.context_chunks.length;
                chatContextDetails.innerHTML = ''; // Clear previous context

                result.context_chunks.forEach(item => {
                    const card = document.createElement('div');
                    card.className = 'search-result-card'; // Reuse search result style

                    const header = document.createElement('div');
                    header.className = 'result-card-header';
                    const filePath = item.metadata?.filePath || item.filePath || 'Unknown file';
                    const score = item.score?.toFixed(3) || 'N/A';
                    const lineInfo = item.metadata?.start_line ? ` (L${item.metadata.start_line}-${item.metadata.end_line})` : '';

                    header.innerHTML = `
                        <span class="file-path">${filePath}${lineInfo}</span>
                        <div class="result-actions">
                             <span class="score">Score: ${score}</span>
                             <button class="button-secondary view-file-btn" data-path="${filePath}">View File</button>
                        </div>`;

                    const contentEl = document.createElement('pre');
                    const codeEl = document.createElement('code');
                    
                    const extension = filePath.split('.').pop();
                    const langMap = { 'js': 'javascript', 'ts': 'typescript', 'py': 'python', 'java': 'java', 'go': 'go', 'html': 'xml', 'css': 'css', 'json': 'json', 'md': 'markdown' };
                    const lang = langMap[extension] || 'plaintext';
                    codeEl.className = `language-${lang}`;
                    codeEl.textContent = item.content || 'No content';
                    
                    contentEl.appendChild(codeEl);
                    card.appendChild(header);
                    card.appendChild(contentEl);
                    chatContextDetails.appendChild(card);
                    
                    if (window.hljs) {
                        hljs.highlightElement(codeEl);
                    }
                });
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
            let urlLine, keyLine, expiresLine;

            if (result.public_url) {
                urlLine = `Public URL: ${result.public_url}`;
            } else {
                urlLine = `Local URL: ${window.location.origin}${result.access_url}`;
            }
            keyLine = `API Key: ${result.api_key}`;
            expiresLine = `Expires: ${new Date(result.expires_at).toLocaleString()}`;

            const resultText = `${urlLine}\n${keyLine}\n${expiresLine}`;
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

    async function fetchAndDisplaySummary() {
        if (!summaryContent) return;
        summaryContent.innerHTML = '<p>Loading summary...</p>';
        try {
            const response = await fetch(`${API_BASE_URL}/collection/summary`, {
                headers: { 'x-api-key': apiKey }
            });
            if (response.ok) {
                const text = await response.text();
                if (window.marked && text) {
                    summaryContent.innerHTML = marked.parse(text);
                } else {
                    summaryContent.textContent = text || 'Summary is empty or not yet generated.';
                }
            } else {
                summaryContent.innerHTML = '<p>Could not load summary. Generate one using the "Update Summary" button.</p>';
            }
        } catch (error) {
            console.error('Error loading summary:', error);
            summaryContent.innerHTML = '<p class="error">Error loading summary.</p>';
        }
    }

    async function triggerSummaryUpdate() {
        if (!updateSummaryBtn) return;
        updateSummaryBtn.disabled = true;
        updateSummaryBtn.textContent = 'Starting...';
        summaryContent.innerHTML = '<p>Summary generation initiated. This can take several minutes...</p>';
        
        try {
            const response = await fetch(`${API_BASE_URL}/collection/summarize`, {
                method: 'POST',
                headers: { 'x-api-key': apiKey }
            });

            if (response.status === 202) {
                summaryContent.innerHTML += '<p>Process started successfully. The new summary will appear here once ready. You can refresh the page or wait.</p>';
                // Refresh view after 20s to show the new summary
                setTimeout(fetchAndDisplaySummary, 20000);
            } else {
                const errorData = await response.json();
                summaryContent.innerHTML = `<p class="error">Error starting update: ${errorData.error || response.statusText}</p>`;
            }
        } catch (error) {
            console.error('Error triggering summary update:', error);
            summaryContent.innerHTML = `<p class="error">An error occurred while trying to start the update.</p>`;
        } finally {
            updateSummaryBtn.disabled = false;
            updateSummaryBtn.textContent = 'Update Summary';
        }
    }

    chatForm.addEventListener('submit', performChat);

    toggleContextBtn.addEventListener('click', () => {
        const isHidden = chatContextDetails.style.display === 'none';
        chatContextDetails.style.display = isHidden ? 'block' : 'none';
        toggleContextBtn.textContent = isHidden ? 'Hide' : 'Show';
    });

    shareForm.addEventListener('submit', createShare);
    refreshSharesButton.addEventListener('click', fetchShares);
    if (updateSummaryBtn) {
        updateSummaryBtn.addEventListener('click', triggerSummaryUpdate);
    }
    tunnelToggleBtn.addEventListener('click', toggleTunnel);
    
    // Managed tunneling event listeners
    tunnelServiceSelect.addEventListener('change', (e) => {
        if (e.target.value === 'managed') {
            managedTunnelOptions.style.display = 'block';
            checkManagedTunnelAuth();
        } else {
            managedTunnelOptions.style.display = 'none';
        }
    });
    
    if (managedTunnelLoginBtn) {
        managedTunnelLoginBtn.addEventListener('click', () => {
            // Redirect to account management or show login modal
            alert('Please use the CLI to authenticate: git-contextor account login');
        });
    }

    async function toggleWatcher(event) {
        const isEnabled = event.target.checked;
        if (!confirm(`This will save the new setting. A manual service restart is required for it to take effect. Continue?`)) {
            event.target.checked = !isEnabled; // Revert checkbox
            return;
        }

        try {
            watcherToggle.disabled = true;
            const response = await fetch(`${API_BASE_URL}/config/monitoring`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
                body: JSON.stringify({ enabled: isEnabled })
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || `HTTP ${response.status}`);
            }
            
            const result = await response.json();
            alert(result.message);

        } catch (error) {
            alert(`Failed to update settings: ${error.message}`);
            event.target.checked = !isEnabled; // Revert on failure
        } finally {
            watcherToggle.disabled = false;
        }
    }

    if(watcherToggle) {
        watcherToggle.addEventListener('change', toggleWatcher);
    }

    // --- Tunnel Functions ---
    async function checkManagedTunnelAuth() {
        try {
            const response = await fetch(`${API_BASE_URL}/config`, { 
                headers: { 'x-api-key': apiKey } 
            });
            if (!response.ok) throw new Error('Failed to fetch config');
            
            const config = await response.json();
            const hasApiKey = config.tunneling?.managed?.apiKey;
            
            if (hasApiKey) {
                managedTunnelAuthStatus.textContent = 'Authenticated';
                managedTunnelAuthStatus.style.color = 'green';
                managedTunnelLoginBtn.style.display = 'none';
            } else {
                managedTunnelAuthStatus.textContent = 'Not authenticated';
                managedTunnelAuthStatus.style.color = 'red';
                managedTunnelLoginBtn.style.display = 'inline-block';
            }
        } catch (error) {
            console.error('Error checking managed tunnel auth:', error);
            managedTunnelAuthStatus.textContent = 'Error checking authentication';
            managedTunnelAuthStatus.style.color = 'red';
        }
    }
    
    async function getTunnelStatus() {
        try {
            const response = await fetch(`${API_BASE_URL}/tunnel`, { headers: { 'x-api-key': apiKey } });
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
            tunnelHint.style.display = 'none';

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
                // Show/hide managed tunnel options based on service
                if (data.service === 'managed') {
                    managedTunnelOptions.style.display = 'block';
                    checkManagedTunnelAuth();
                } else {
                    managedTunnelOptions.style.display = 'none';
                }
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
                tunnelHint.style.display = 'none';
            } else if (data.status === 'running') {
                tunnelToggleBtn.textContent = 'Stop Tunnel';
                tunnelToggleBtn.disabled = false;
                tunnelToggleBtn.classList.add('danger');
                tunnelUrlSpan.innerHTML = data.url ? `<a href="${data.url}" target="_blank">${data.url}</a>` : 'Acquiring URL...';
                if (data.service === 'localtunnel') {
                    tunnelHint.style.display = 'block';
                } else {
                    tunnelHint.style.display = 'none';
                }
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
                const requestBody = { service };
                
                // Add managed tunnel specific options
                if (service === 'managed') {
                    if (tunnelSubdomain.value) {
                        requestBody.subdomain = tunnelSubdomain.value;
                    }
                    if (tunnelDescription.value) {
                        requestBody.description = tunnelDescription.value;
                    }
                }
                
                const response = await fetch(`${API_BASE_URL}/tunnel`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
                    body: JSON.stringify(requestBody)
                });
                if (!response.ok) {
                    const err = await response.json();
                    throw new Error(err.error || `HTTP ${response.status}`);
                }
            } else {
                // Stop the tunnel
                await fetch(`${API_BASE_URL}/tunnel`, {
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
    fetchAndDisplaySummary();
    setInterval(fetchStatus, 5000); // Poll general status
    setInterval(getTunnelStatus, 3000); // Poll tunnel status frequently

    // --- View Navigation ---
    const viewNav = document.getElementById('view-nav');
    const views = {
        '#dashboard': document.getElementById('view-dashboard'),
        '#activity': document.getElementById('view-activity'),
        '#sharing': document.getElementById('view-sharing'),
        '#files': document.getElementById('view-files')
    };

    function switchView(hash) {
        const targetHash = hash || '#dashboard';
        const [viewId, ...params] = targetHash.split('::');

        Object.entries(views).forEach(([viewHash, viewElement]) => {
            if (!viewElement) return; // In case an element is not found
            if (viewHash === viewId) {
                viewElement.classList.remove('hidden');
            } else {
                viewElement.classList.add('hidden');
            }
        });

        viewNav.querySelectorAll('a').forEach(a => {
            a.classList.remove('active');
            if (a.getAttribute('href') === viewId) {
                a.classList.add('active');
            }
        });

        if (viewId === '#files') {
            if (fileTreePanel && !fileTreePanel.dataset.initialized) {
                fetchFileTree();
            }
            if (params.length > 0) {
                const filePath = decodeURIComponent(params.join('::'));
                fetchAndShowFile(filePath);

                // Highlight the file in the tree
                setTimeout(() => { // Allow tree to render first
                    document.querySelectorAll('.file-tree-node.selected').forEach(el => el.classList.remove('selected'));
                    const fileNode = document.querySelector(`.file-tree-node a[data-path="${filePath}"]`);
                    if(fileNode) {
                        const parentNode = fileNode.closest('.file-tree-node');
                        if (parentNode) parentNode.classList.add('selected');
                        
                        let parent = parentNode.parentElement.closest('.file-tree-node.type-directory');
                        while(parent) {
                            parent.classList.add('open');
                            parent = parent.parentElement.closest('.file-tree-node.type-directory');
                        }
                    }
                }, 100);
            }
        }
    }

    viewNav.addEventListener('click', (e) => {
        if (e.target.tagName === 'A') {
            const hash = e.target.getAttribute('href');
            if (window.location.hash !== hash) {
                 window.location.hash = hash;
            } else {
                // If clicking the same hash, manually trigger the switch
                switchView(hash);
            }
        }
    });

    window.addEventListener('hashchange', () => {
        switchView(window.location.hash);
    });

    // Initial view setup
    setupFileBrowserListeners();
    switchView(window.location.hash);
}

function initConfigPage(API_BASE_URL) {
    const configForm = document.getElementById('config-form');
    const configTextarea = document.getElementById('config-textarea');
    const configStatus = document.getElementById('config-status');
    const configError = document.getElementById('config-error');
    const apiKey = sessionStorage.getItem('gctx_apiKey');

    // Initialize tunnel configuration
    initTunnelConfig(API_BASE_URL, apiKey);

    async function fetchConfig() {
        if (!configForm) return; // Exit if elements are not on the page
        configStatus.textContent = 'Loading...';
        configError.style.display = 'none';
        try {
            const response = await fetch(`${API_BASE_URL}/config`, { headers: { 'x-api-key': apiKey } });
            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || `HTTP ${response.status}`);
            }
            const config = await response.json();
            // Remove sensitive or uneditable fields before displaying
            if (config.services) {
                delete config.services.apiKey; // Don't show the main API key
            }
            configTextarea.value = JSON.stringify(config, null, 2);
            configStatus.textContent = 'Loaded successfully.';
        } catch (error) {
            console.error('Error fetching config:', error);
            configError.textContent = `Error loading configuration: ${error.message}`;
            configError.style.display = 'block';
            configStatus.textContent = 'Error.';
        }
    }

    async function saveConfig(event) {
        event.preventDefault();
        configStatus.textContent = 'Saving...';
        configError.style.display = 'none';
        const button = configForm.querySelector('button');
        button.disabled = true;

        let newConfig;
        try {
            newConfig = JSON.parse(configTextarea.value);
        } catch (jsonError) {
            configError.textContent = `Invalid JSON: ${jsonError.message}`;
            configError.style.display = 'block';
            configStatus.textContent = 'Error.';
            button.disabled = false;
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/config`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
                body: JSON.stringify(newConfig)
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || `HTTP ${response.status}`);
            }

            const result = await response.json();
            configStatus.textContent = result.message;

        } catch (error) {
            console.error('Error saving config:', error);
            configError.textContent = `Error saving configuration: ${error.message}`;
            configStatus.textContent = 'Error.';
        } finally {
            button.disabled = false;
        }
    }
    
    if (configForm) {
        configForm.addEventListener('submit', saveConfig);
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

    if (configForm) {
        fetchConfig();
    }
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

function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast show';
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 500);
    }, 3000);
}

function setupFileBrowserListeners() {
    const chatQuery = document.getElementById('chat-query');
    const fileAskAiBtn = document.getElementById('file-ask-ai-btn');

    if (fileAskAiBtn) {
        fileAskAiBtn.addEventListener('click', () => {
            const filePath = fileAskAiBtn.dataset.filePath;
            if (filePath) {
                // This global variable is defined in initDashboard
                fileChatContext = filePath; 
                window.location.hash = '#dashboard';
                setTimeout(() => {
                    chatQuery.value = `Regarding the file ${filePath}, `;
                    chatQuery.focus();
                    showToast(`Context set to ${filePath}. Ask your question now.`);
                }, 100);
            }
        });
    }
    
    document.body.addEventListener('click', e => {
        const fileLink = e.target.closest('.file-link, .view-file-btn');
        if (fileLink) {
            e.preventDefault();
            const targetPath = fileLink.dataset.path;
            if (targetPath) {
                window.location.hash = `#files::${encodeURIComponent(targetPath)}`;
            }
            return;
        }

        const fileTreeNode = e.target.closest('.file-tree-node a');
        if(fileTreeNode) {
            e.preventDefault();
            const node = fileTreeNode.parentElement;
            if (node.classList.contains('type-file')) {
                window.location.hash = fileTreeNode.getAttribute('href');
            } else if (node.classList.contains('type-directory')) {
                node.classList.toggle('open');
            }
        }
    });
}

async function fetchFileTree() {
    const fileTreePanel = document.getElementById('file-tree-panel');
    if (!fileTreePanel) return;
    fileTreePanel.dataset.initialized = 'true';
    const apiKey = sessionStorage.getItem('gctx_apiKey');
    try {
        const response = await fetch(`/api/files/tree`, { headers: { 'x-api-key': apiKey } });
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const tree = await response.json();
        
        fileTreePanel.innerHTML = '';
        const treeRoot = document.createElement('ul');
        treeRoot.className = 'file-tree';
        renderFileTree(tree, treeRoot, 0);
        fileTreePanel.appendChild(treeRoot);
    } catch (error) {
        fileTreePanel.innerHTML = '<p class="error">Could not load file tree. Are the API file routes configured in the server?</p>';
        console.error('Error fetching file tree:', error);
    }
}

function renderFileTree(nodes, container, depth) {
    // Sort nodes: directories first, then alphabetically
    nodes.sort((a, b) => {
        if (a.type === b.type) return a.name.localeCompare(b.name);
        return a.type === 'directory' ? -1 : 1;
    });

    nodes.forEach(node => {
        const li = document.createElement('li');
        li.className = `file-tree-node type-${node.type}`;
        
        const link = document.createElement('a');
        const hrefPath = encodeURIComponent(node.path);
        link.href = node.type === 'directory' ? `#` : `#files::${hrefPath}`;
        link.dataset.path = node.path;
        
        const icon = document.createElement('span');
        icon.className = 'icon';
        
        link.appendChild(icon);
        link.appendChild(document.createTextNode(" " + node.name));
        li.style.paddingLeft = `${depth * 15}px`;
        li.appendChild(link);
        
        if (node.type === 'directory' && node.children?.length > 0) {
            const childrenUl = document.createElement('ul');
            childrenUl.className = 'file-tree-subtree';
            renderFileTree(node.children, childrenUl, depth + 1);
            li.appendChild(childrenUl);
        }
        container.appendChild(li);
    });
}

async function fetchAndShowFile(filePath) {
    const fileViewerPanel = document.getElementById('file-viewer-panel');
    const fileViewerFilename = document.getElementById('file-viewer-filename');
    const fileViewerContent = document.getElementById('file-viewer-content');
    const fileAskAiBtn = document.getElementById('file-ask-ai-btn');

    if (!fileViewerPanel) return;
    fileViewerPanel.style.display = 'flex';
    fileViewerFilename.textContent = 'Loading...';
    fileViewerContent.innerHTML = '<div class="loading">Loading file content...</div>';
    const apiKey = sessionStorage.getItem('gctx_apiKey');

    try {
        const response = await fetch(`/api/files/content?path=${encodeURIComponent(filePath)}`, { headers: { 'x-api-key': apiKey } });
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();

        fileViewerFilename.textContent = filePath;
        if(window.marked) {
            fileViewerContent.innerHTML = window.marked.parse(data.content);
        } else {
             fileViewerContent.innerHTML = `<pre><code>${data.content.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</code></pre>`;
        }
        fileAskAiBtn.dataset.filePath = filePath;

        // Highlight all code blocks
        fileViewerContent.querySelectorAll('pre code').forEach((block) => {
            if(window.hljs) hljs.highlightElement(block);
        });
    } catch (error) {
        fileViewerFilename.textContent = `Error: ${filePath}`;
        fileViewerContent.innerHTML = `<p class="error">Could not load file: ${error.message}</p>`;
        console.error(`Error fetching file ${filePath}:`, error);
    }
}

function initTunnelConfig(API_BASE_URL, apiKey) {
    const tunnelForm = document.getElementById('tunnel-form');
    const tunnelProvider = document.getElementById('tunnel-provider');
    const correntlyApiKey = document.getElementById('corrently-api-key');
    const tunnelDescription = document.getElementById('tunnel-description');
    const testConnectionButton = document.getElementById('test-tunnel-connection');
    const tunnelTestStatus = document.getElementById('tunnel-test-status');
    const tunnelStatus = document.getElementById('tunnel-status');
    const tunnelError = document.getElementById('tunnel-error');

    if (!tunnelForm) return; // Exit if elements are not on the page

    // Load current tunnel configuration
    loadTunnelConfig();
    // Show Corrently help text if provider is selected
    document.getElementById('tunnel-provider').addEventListener('change', () => {
        const provider = document.getElementById('tunnel-provider').value;
        if (provider === 'corrently') {
            document.getElementById('corrently-config').querySelector('.help-text').style.display = 'block';
        } else {
            document.getElementById('corrently-config').querySelector('.help-text').style.display = 'none';
        }
    });

    async function loadTunnelConfig() {
        try {
            const response = await fetch(`${API_BASE_URL}/config`, { headers: { 'x-api-key': apiKey } });
            if (!response.ok) throw new Error('Failed to load configuration');
            
            const config = await response.json();
            
            if (config.tunneling) {
                tunnelProvider.value = config.tunneling.provider || 'corrently';
                
                if (config.tunneling.corrently) {
                    correntlyApiKey.value = config.tunneling.corrently.apiKey || '';
                    tunnelDescription.value = config.tunneling.corrently.description || 'Git Contextor Share';
                }
            }
            
            showProviderConfig();
        } catch (error) {
            console.error('Error loading tunnel config:', error);
            tunnelError.textContent = `Error loading tunnel configuration: ${error.message}`;
            tunnelError.style.display = 'block';
        }
    }

    function showProviderConfig() {
        const correntlyConfig = document.getElementById('corrently-config');
        const provider = tunnelProvider.value;
        
        // Show/hide provider-specific configuration
        if (provider === 'corrently') {
            correntlyConfig.style.display = 'block';
        } else {
            correntlyConfig.style.display = 'none';
        }
    }

    // Event listeners
    tunnelProvider.addEventListener('change', showProviderConfig);

    testConnectionButton.addEventListener('click', async () => {
        if (!correntlyApiKey.value) {
            tunnelTestStatus.textContent = 'Please enter an API key first. You can get one from https://tunnel.corrently.cloud/ (see guide above).';
            tunnelTestStatus.className = 'status-message error';
            return;
        }

        tunnelTestStatus.textContent = 'Testing connection...';
        tunnelTestStatus.className = 'status-message';
        testConnectionButton.disabled = true;

        try {
            const response = await fetch(`${API_BASE_URL}/tunnel/test`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'x-api-key': apiKey 
                },
                body: JSON.stringify({
                    provider: 'corrently',
                    apiKey: correntlyApiKey.value
                })
            });

            const result = await response.json();
            
            if (response.ok) {
                tunnelTestStatus.textContent = `✅ Connection successful! User: ${result.user || 'Unknown'}`;
                tunnelTestStatus.className = 'status-message success';
            } else {
                tunnelTestStatus.textContent = `❌ Connection failed: ${result.error}`;
                tunnelTestStatus.className = 'status-message error';
            }
        } catch (error) {
            tunnelTestStatus.textContent = `❌ Connection failed: ${error.message}`;
            tunnelTestStatus.className = 'status-message error';
        } finally {
            testConnectionButton.disabled = false;
        }
    });

    tunnelForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        
        tunnelStatus.textContent = 'Saving...';
        tunnelError.style.display = 'none';
        
        const saveButton = tunnelForm.querySelector('button[type="submit"]');
        saveButton.disabled = true;

        try {
            // Get current config
            const configResponse = await fetch(`${API_BASE_URL}/config`, { headers: { 'x-api-key': apiKey } });
            if (!configResponse.ok) throw new Error('Failed to load current configuration');
            
            const config = await configResponse.json();
            
            // Update tunnel configuration
            config.tunneling = {
                provider: tunnelProvider.value,
                [tunnelProvider.value]: {
                    ...(config.tunneling?.[tunnelProvider.value] || {}),
                    apiKey: correntlyApiKey.value,
                    description: tunnelDescription.value,
                    serverUrl: 'https://tunnel.corrently.cloud'
                }
            };

            // Save updated config
            const response = await fetch(`${API_BASE_URL}/config`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'x-api-key': apiKey 
                },
                body: JSON.stringify(config)
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || `HTTP ${response.status}`);
            }

            const result = await response.json();
            tunnelStatus.textContent = '✅ Tunnel configuration saved successfully!';
            tunnelStatus.className = 'status-message success';
            
            // Refresh the main config textarea if it exists
            if (configTextarea) {
                configTextarea.value = JSON.stringify(config, null, 2);
            }

        } catch (error) {
            console.error('Error saving tunnel config:', error);
            tunnelError.textContent = `Error saving tunnel configuration: ${error.message}`;
            tunnelError.style.display = 'block';
            tunnelStatus.textContent = 'Error saving configuration';
            tunnelStatus.className = 'status-message error';
        } finally {
            saveButton.disabled = false;
        }
    });
}
