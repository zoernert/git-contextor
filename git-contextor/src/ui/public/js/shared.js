document.addEventListener('DOMContentLoaded', () => {
    const shareId = window.location.pathname.split('/')[2];
    
    const shareDescriptionEl = document.getElementById('share-description');
    const shareExpiresEl = document.getElementById('share-expires');
    const chatForm = document.getElementById('shared-chat-form');
    const apiKeyInput = document.getElementById('share-api-key');
    const queryInput = document.getElementById('chat-query');
    const resultsContainer = document.getElementById('chat-results-container');
    const resultsEl = document.getElementById('chat-results');
    const chatContextContainer = document.getElementById('chat-context-container');
    const chatContextCount = document.getElementById('chat-context-count');
    const toggleContextBtn = document.getElementById('toggle-context-btn');
    const chatContextDetails = document.getElementById('chat-context-details');
    const apiUsageContainer = document.getElementById('api-usage');
    const snippetInfoCurl = document.getElementById('snippet-info-curl');
    const snippetChatCurl = document.getElementById('snippet-chat-curl');
    const sharedContent = document.getElementById('shared-content');

    // View navigation
    const viewNav = document.getElementById('view-nav');
    const views = {
        '#chat': document.getElementById('view-chat'),
        '#files': document.getElementById('view-files'),
        '#usage': document.getElementById('view-usage'),
    };
    
    // File Browser elements
    const fileTreePanel = document.getElementById('file-tree-panel');
    const fileViewerPanel = document.getElementById('file-viewer-panel');
    const fileViewerFilename = document.getElementById('file-viewer-filename');
    const fileViewerContent = document.getElementById('file-viewer-content');
    const fileAskAiBtn = document.getElementById('file-ask-ai-btn');

    // Global state
    let fileChatContext = null;

    // Store API key in sessionStorage to persist across reloads for convenience
    apiKeyInput.value = sessionStorage.getItem(`gctx_share_key_${shareId}`) || '';
    apiKeyInput.addEventListener('input', () => {
        sessionStorage.setItem(`gctx_share_key_${shareId}`, apiKeyInput.value);
    });

    async function fetchShareInfo() {
        const apiKey = apiKeyInput.value;
        if (!apiKey) {
            shareDescriptionEl.textContent = 'Enter API key to view details.';
            shareExpiresEl.textContent = '';
            updateApiUsage(null, null); // Hide API usage details
            sharedContent.style.display = 'none';
            return;
        }

        try {
            const response = await fetch(`/shared/${shareId}/info`, {
                headers: { 'x-share-key': apiKey }
            });
            
            if (!response.ok) {
                const err = await response.json();
                sharedContent.style.display = 'none';
                throw new Error(err.error || `HTTP ${response.status}`);
            }
            
            const data = await response.json();
            shareDescriptionEl.textContent = data.description;
            shareExpiresEl.textContent = new Date(data.expires_at).toLocaleString();
            updateApiUsage(shareId, apiKey);
            sharedContent.style.display = 'block';
        } catch (error) {
            shareDescriptionEl.textContent = `Error: ${error.message}`;
            shareExpiresEl.textContent = 'Could not load details.';
            updateApiUsage(null, null); // Hide API usage details on error
            sharedContent.style.display = 'none';
        }
    }

    apiKeyInput.addEventListener('blur', fetchShareInfo);

    async function performChat(e) {
        e.preventDefault();
        const apiKey = apiKeyInput.value;
        const query = queryInput.value;

        if (!apiKey || !query) {
            alert('Please provide both an API key and a question.');
            return;
        }

        resultsContainer.style.display = 'block';
        resultsEl.innerHTML = '<p class="loading">Thinking...</p>';
        chatForm.querySelector('button').disabled = true;

        // Reset context display for new query
        chatContextContainer.style.display = 'none';
        chatContextDetails.style.display = 'none';
        toggleContextBtn.textContent = 'Show';

        try {
            const body = { query };
            if (fileChatContext) {
                body.options = { filePath: fileChatContext };
                fileChatContext = null; // Reset after use
                queryInput.value = ''; // Clear input after submitting file-context question
            }

            const response = await fetch(`/shared/${shareId}/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-share-key': apiKey
                },
                body: JSON.stringify(body)
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || `HTTP ${response.status}`);
            }

            const data = await response.json();
            if (window.marked) {
                resultsEl.innerHTML = marked.parse(data.response || 'No response from AI.');
            } else {
                resultsEl.textContent = data.response || 'No response from AI.';
            }

            // Render context chunks if available
            if (data.context_chunks && Array.isArray(data.context_chunks) && data.context_chunks.length > 0) {
                chatContextContainer.style.display = 'block';
                chatContextCount.textContent = data.context_chunks.length;
                chatContextDetails.innerHTML = ''; // Clear previous context

                data.context_chunks.forEach(item => {
                    const card = document.createElement('div');
                    card.className = 'search-result-card';

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
                        </div>
                    `;

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
            resultsEl.innerHTML = `<p class="error">Error: ${error.message}</p>`;
        } finally {
            chatForm.querySelector('button').disabled = false;
        }
    }

    chatForm.addEventListener('submit', performChat);

    toggleContextBtn.addEventListener('click', () => {
        const isHidden = chatContextDetails.style.display === 'none';
        chatContextDetails.style.display = isHidden ? 'block' : 'none';
        toggleContextBtn.textContent = isHidden ? 'Hide' : 'Show';
    });

    function updateApiUsage(shareId, apiKey) {
        if (!apiKey || !shareId) {
            apiUsageContainer.style.display = 'none';
            return;
        }
    
        const baseUrl = window.location.origin;
        const infoUrl = `${baseUrl}/shared/${shareId}/info`;
        const chatUrl = `${baseUrl}/shared/${shareId}/chat`;
    
        const infoSnippet = `curl "${infoUrl}" \\\n  -H "x-share-key: ${apiKey}"`;
        snippetInfoCurl.textContent = infoSnippet;
    
        const chatSnippet = `curl -X POST "${chatUrl}" \\\n  -H "Content-Type: application/json" \\\n  -H "x-share-key: ${apiKey}" \\\n  -d '{"query": "What is the main authentication pattern?"}'`;
        snippetChatCurl.textContent = chatSnippet;
    
        apiUsageContainer.style.display = 'block';
    }

    // --- View Navigation & File Browser Logic (adapted from app.js) ---
    
    function switchView(hash) {
        const targetHash = hash || '#chat';
        const [viewId, ...params] = targetHash.split('::');

        Object.entries(views).forEach(([viewHash, viewElement]) => {
            if (!viewElement) return;
            viewElement.classList.toggle('hidden', viewHash !== viewId);
        });

        viewNav.querySelectorAll('a').forEach(a => {
            a.classList.toggle('active', a.getAttribute('href') === viewId);
        });

        if (viewId === '#files') {
            if (apiKeyInput.value && fileTreePanel && !fileTreePanel.dataset.initialized) {
                fetchFileTree();
            }
            if (params.length > 0) {
                const filePath = decodeURIComponent(params.join('::'));
                fetchAndShowFile(filePath);
            }
        }
    }

    async function fetchWithAuth(url) {
        const apiKey = apiKeyInput.value;
        if (!apiKey) throw new Error('API Key is missing.');
        return fetch(url, { headers: { 'x-share-key': apiKey } });
    }

    async function fetchFileTree() {
        if (!fileTreePanel) return;
        fileTreePanel.dataset.initialized = 'true';
        try {
            const response = await fetchWithAuth(`/shared/${shareId}/files/tree`);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const tree = await response.json();
            fileTreePanel.innerHTML = '';
            const treeRoot = document.createElement('ul');
            treeRoot.className = 'file-tree';
            renderFileTree(tree, treeRoot, 0);
            fileTreePanel.appendChild(treeRoot);
        } catch (error) {
            fileTreePanel.innerHTML = `<p class="error">Could not load file tree: ${error.message}</p>`;
        }
    }

    function renderFileTree(nodes, container, depth) {
        nodes.sort((a,b) => (a.type === 'directory' ? -1 : 1) - (b.type === 'directory' ? -1 : 1) || a.name.localeCompare(b.name));
        nodes.forEach(node => {
            const li = document.createElement('li');
            li.className = `file-tree-node type-${node.type}`;
            const link = document.createElement('a');
            link.href = node.type === 'directory' ? '#' : `#files::${encodeURIComponent(node.path)}`;
            link.dataset.path = node.path;
            link.innerHTML = `<span class="icon"></span> ${node.name}`;
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
        if (!fileViewerPanel) return;
        fileViewerPanel.style.display = 'flex';
        fileViewerFilename.textContent = 'Loading...';
        fileViewerContent.innerHTML = '<div class="loading">Loading...</div>';
        try {
            const response = await fetchWithAuth(`/shared/${shareId}/files/content?path=${encodeURIComponent(filePath)}`);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const data = await response.json();
            fileViewerFilename.textContent = filePath;
            
            if (window.marked) {
                fileViewerContent.innerHTML = window.marked.parse(data.content);
            } else {
                fileViewerContent.innerHTML = `<pre><code>${data.content.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</code></pre>`;
            }

            fileAskAiBtn.dataset.filePath = filePath;

            fileViewerContent.querySelectorAll('pre code').forEach(block => {
                if (window.hljs) {
                    hljs.highlightElement(block);
                }
            });

        } catch (error) {
            fileViewerFilename.textContent = `Error: ${filePath}`;
            fileViewerContent.innerHTML = `<p class="error">Could not load file: ${error.message}</p>`;
        }
    }
    
    // Setup listeners
    viewNav.addEventListener('click', e => {
        if (e.target.tagName === 'A') {
            e.preventDefault();
            const hash = e.target.getAttribute('href');
            if (window.location.hash !== hash) {
                window.location.hash = hash;
            } else {
                switchView(hash);
            }
        }
    });

    document.body.addEventListener('click', e => {
        const viewFileBtn = e.target.closest('.view-file-btn');
        if (viewFileBtn) {
            e.preventDefault();
            window.location.hash = `#files::${encodeURIComponent(viewFileBtn.dataset.path)}`;
            return;
        }

        const fileTreeNode = e.target.closest('.file-tree-node a');
        if (fileTreeNode) {
            e.preventDefault();
            const node = fileTreeNode.parentElement;
            if (node.classList.contains('type-file')) {
                window.location.hash = fileTreeNode.getAttribute('href');
            } else if (node.classList.contains('type-directory')) {
                node.classList.toggle('open');
            }
        }
    });

    fileAskAiBtn.addEventListener('click', () => {
        const filePath = fileAskAiBtn.dataset.filePath;
        if (filePath) {
            fileChatContext = filePath;
            window.location.hash = '#chat';
            setTimeout(() => {
                queryInput.value = `Regarding the file ${filePath}, `;
                queryInput.focus();
            }, 100);
        }
    });

    window.addEventListener('hashchange', () => switchView(window.location.hash));

    // Initial fetch if key is pre-filled
    if (apiKeyInput.value) {
        fetchShareInfo();
    }
    switchView(window.location.hash);
});
