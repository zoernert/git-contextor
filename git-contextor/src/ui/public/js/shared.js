document.addEventListener('DOMContentLoaded', () => {
    const shareId = window.location.pathname.split('/')[2];
    
    const shareDescriptionEl = document.getElementById('share-description');
    const shareExpiresEl = document.getElementById('share-expires');
    const chatForm = document.getElementById('shared-chat-form');
    const apiKeyInput = document.getElementById('share-api-key');
    const queryInput = document.getElementById('chat-query');
    const resultsContainer = document.getElementById('chat-results-container');
    const resultsEl = document.getElementById('chat-results');

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
            return;
        }

        try {
            const response = await fetch(`/shared/${shareId}/info`, {
                headers: { 'x-share-key': apiKey }
            });
            
            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || `HTTP ${response.status}`);
            }
            
            const data = await response.json();
            shareDescriptionEl.textContent = data.description;
            shareExpiresEl.textContent = new Date(data.expires_at).toLocaleString();
        } catch (error) {
            shareDescriptionEl.textContent = `Error: ${error.message}`;
            shareExpiresEl.textContent = 'Could not load details.';
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

        } catch (error) {
            resultsEl.innerHTML = `<p class="error">Error: ${error.message}</p>`;
        } finally {
            chatForm.querySelector('button').disabled = false;
        }
    }

    chatForm.addEventListener('submit', performChat);

    // Initial fetch if key is pre-filled
    if (apiKeyInput.value) {
        fetchShareInfo();
    }
});
