// DP Mail AI Assist — OpenAI-Compatible LLM Client

const LLMClient = {
    /**
     * Send a chat completion request (non-streaming)
     */
    async complete(messages, settings, options = {}) {
        const url = `${settings.apiBaseUrl.replace(/\/+$/, '')}/chat/completions`;
        const body = {
            model: settings.modelName,
            messages: messages,
            max_tokens: options.maxTokens || settings.maxTokens,
            temperature: options.temperature ?? settings.temperature,
            stream: false
        };

        const headers = {
            'Content-Type': 'application/json'
        };
        if (settings.apiKey) {
            headers['Authorization'] = `Bearer ${settings.apiKey}`;
        }

        const response = await fetch(url, {
            method: 'POST',
            headers,
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`API Error (${response.status}): ${errorText}`);
        }

        const data = await response.json();
        return {
            content: data.choices[0]?.message?.content || '',
            usage: data.usage || null,
            model: data.model || settings.modelName
        };
    },

    /**
     * Send a chat completion request with streaming (SSE)
     * Calls onChunk(text) for each token and onDone(fullText, usage) when complete
     */
    async streamComplete(messages, settings, { onChunk, onDone, onError, signal }) {
        const url = `${settings.apiBaseUrl.replace(/\/+$/, '')}/chat/completions`;
        const body = {
            model: settings.modelName,
            messages: messages,
            max_tokens: settings.maxTokens,
            temperature: settings.temperature,
            stream: true,
            stream_options: { include_usage: true }
        };

        const headers = {
            'Content-Type': 'application/json'
        };
        if (settings.apiKey) {
            headers['Authorization'] = `Bearer ${settings.apiKey}`;
        }

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers,
                body: JSON.stringify(body),
                signal
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`API Error (${response.status}): ${errorText}`);
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let fullText = '';
            let usage = null;
            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop(); // Keep incomplete line in buffer

                for (const line of lines) {
                    const trimmed = line.trim();
                    if (!trimmed || !trimmed.startsWith('data: ')) continue;

                    const data = trimmed.slice(6);
                    if (data === '[DONE]') continue;

                    try {
                        const parsed = JSON.parse(data);
                        const delta = parsed.choices?.[0]?.delta?.content;
                        if (delta) {
                            fullText += delta;
                            if (onChunk) onChunk(delta);
                        }
                        if (parsed.usage) {
                            usage = parsed.usage;
                        }
                    } catch (e) {
                        // Skip malformed JSON chunks
                    }
                }
            }

            if (onDone) onDone(fullText, usage);
            return { content: fullText, usage };
        } catch (err) {
            if (err.name === 'AbortError') {
                if (onDone) onDone('', null);
                return { content: '', usage: null, aborted: true };
            }
            if (onError) onError(err);
            throw err;
        }
    },

    /**
     * Build messages array with vision support for images
     */
    buildMessages(systemPrompt, userPrompt, imageDataUrls = []) {
        const messages = [];

        if (systemPrompt) {
            messages.push({ role: 'system', content: systemPrompt });
        }

        if (imageDataUrls.length > 0) {
            // Multimodal message with images
            const content = [
                { type: 'text', text: userPrompt }
            ];
            for (const dataUrl of imageDataUrls) {
                content.push({
                    type: 'image_url',
                    image_url: { url: dataUrl, detail: 'auto' }
                });
            }
            messages.push({ role: 'user', content });
        } else {
            messages.push({ role: 'user', content: userPrompt });
        }

        return messages;
    },

    /**
     * Test API connection by hitting the models endpoint
     */
    async testConnection(settings) {
        const url = `${settings.apiBaseUrl.replace(/\/+$/, '')}/models`;
        const headers = {};
        if (settings.apiKey) {
            headers['Authorization'] = `Bearer ${settings.apiKey}`;
        }

        try {
            const response = await fetch(url, { headers });
            if (!response.ok) {
                return { success: false, error: `HTTP ${response.status}: ${response.statusText}` };
            }
            const data = await response.json();
            const models = data.data?.map(m => m.id) || [];
            return { success: true, models };
        } catch (err) {
            return { success: false, error: err.message };
        }
    }
};
