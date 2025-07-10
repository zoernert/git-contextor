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
            const response = await fetch(`/shared/${shareId}/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-share-key': apiKey
                },
                body: JSON.stringify({ query })
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
                    const filePath = item.metadata?.filePath || 'Unknown file';
                    const score = item.score?.toFixed(3) || 'N/A';
                    const lineInfo = item.metadata?.start_line ? ` (L${item.metadata.start_line}-${item.metadata.end_line})` : '';

                    header.innerHTML = `<span class="file-path">${filePath}${lineInfo}</span><span class="score">Score: ${score}</span>`;

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

    // Initial fetch if key is pre-filled
    if (apiKeyInput.value) {
        fetchShareInfo();
    }
});
