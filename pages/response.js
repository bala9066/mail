// DP Mail AI Assist — Response Page Script
// Handles streaming display of AI responses

document.addEventListener('DOMContentLoaded', async () => {
    const responseContent = document.getElementById('response-content');
    const responseLoading = document.getElementById('response-loading');
    const actionTitle = document.getElementById('action-title');
    const emailSubject = document.getElementById('email-subject');
    const btnCopy = document.getElementById('btn-copy');
    const btnStop = document.getElementById('btn-stop');
    const responseFooter = document.getElementById('response-footer');
    const tokenInfo = document.getElementById('token-info');
    const modelInfo = document.getElementById('model-info');

    let abortController = null;
    let fullResponseText = '';

    try {
        // Get pending response data from storage
        const stored = await messenger.storage.local.get('_pendingResponse');
        const data = stored._pendingResponse;

        if (!data || Date.now() - data.timestamp > 60000) {
            showError('No pending response data found. Please try again from the popup.');
            return;
        }

        // Clear pending data
        await messenger.storage.local.remove('_pendingResponse');

        // Update header
        actionTitle.textContent = data.actionLabel || 'AI Response';
        emailSubject.textContent = data.subject || '';

        // Check if streaming is enabled
        if (data.settings.streamResponses) {
            await streamResponse(data.messages, data.settings);
        } else {
            await nonStreamResponse(data.messages, data.settings);
        }

    } catch (err) {
        console.error('Response page error:', err);
        showError(err.message);
    }

    // Stream response
    async function streamResponse(messages, settings) {
        responseLoading.style.display = 'none';
        responseContent.classList.add('streaming-cursor');
        btnStop.style.display = 'inline-flex';

        abortController = new AbortController();

        try {
            const result = await LLMClient.streamComplete(messages, settings, {
                onChunk: (text) => {
                    fullResponseText += text;
                    renderContent(fullResponseText);
                },
                onDone: (text, usage) => {
                    responseContent.classList.remove('streaming-cursor');
                    btnStop.style.display = 'none';
                    showFooter(usage, settings.modelName);
                },
                onError: (err) => {
                    responseContent.classList.remove('streaming-cursor');
                    btnStop.style.display = 'none';
                    showError(err.message);
                },
                signal: abortController.signal
            });
        } catch (err) {
            if (err.name !== 'AbortError') {
                showError(err.message);
            }
            responseContent.classList.remove('streaming-cursor');
            btnStop.style.display = 'none';
        }
    }

    // Non-streaming response
    async function nonStreamResponse(messages, settings) {
        try {
            const result = await LLMClient.complete(messages, settings);
            responseLoading.style.display = 'none';
            fullResponseText = result.content;
            renderContent(fullResponseText);
            showFooter(result.usage, result.model);
        } catch (err) {
            showError(err.message);
        }
    }

    // Render content with basic markdown support
    function renderContent(text) {
        // Simple markdown rendering — content is escaped first for safety
        let html = escapeHtml(text);

        // Bold: **text**
        html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

        // Italic: *text*
        html = html.replace(/(?<!\*)\*(?!\*)(.*?)(?<!\*)\*(?!\*)/g, '<em>$1</em>');

        // Headers: ### text
        html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
        html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
        html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');

        // Inline code: `code`
        html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

        // Code blocks: ```code```
        html = html.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');

        // Bullet lists: - item
        html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
        html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');

        // Numbered lists: 1. item
        html = html.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');

        // Blockquotes: > text
        html = html.replace(/^&gt; (.+)$/gm, '<blockquote>$1</blockquote>');

        // Use DOMParser for safe insertion (content already escaped above)
        const parser = new DOMParser();
        const doc = parser.parseFromString('<div>' + html + '</div>', 'text/html');
        responseContent.textContent = '';
        while (doc.body.firstChild.firstChild) {
            responseContent.appendChild(doc.body.firstChild.firstChild);
        }

        // Auto-scroll to bottom during streaming
        responseContent.scrollTop = responseContent.scrollHeight;
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function showError(message) {
        responseLoading.style.display = 'none';
        responseContent.textContent = '';
        const errorDiv = document.createElement('div');
        errorDiv.className = 'response-error';
        const h3 = document.createElement('h3');
        h3.textContent = '⚠️ Error';
        const p = document.createElement('p');
        p.textContent = message;
        errorDiv.appendChild(h3);
        errorDiv.appendChild(p);
        responseContent.appendChild(errorDiv);
    }

    function showFooter(usage, model) {
        responseFooter.style.display = 'flex';
        if (usage) {
            const prompt = usage.prompt_tokens || 0;
            const completion = usage.completion_tokens || 0;
            const total = usage.total_tokens || (prompt + completion);
            tokenInfo.textContent = `📊 Tokens: ${total} (${prompt} in → ${completion} out)`;
        } else {
            tokenInfo.textContent = '';
        }
        modelInfo.textContent = `🤖 ${model || 'Unknown model'}`;
    }

    // Copy button
    btnCopy.addEventListener('click', () => {
        navigator.clipboard.writeText(fullResponseText).then(() => {
            btnCopy.textContent = '✅ Copied!';
            setTimeout(() => { btnCopy.textContent = '📋 Copy'; }, 2000);
        });
    });

    // Stop button
    btnStop.addEventListener('click', () => {
        if (abortController) {
            abortController.abort();
            responseContent.classList.remove('streaming-cursor');
            btnStop.style.display = 'none';
        }
    });
});
