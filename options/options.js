// DP Mail AI Assist — Options Page Script

document.addEventListener('DOMContentLoaded', async () => {
    // Elements
    const apiBaseUrl = document.getElementById('api-base-url');
    const apiKey = document.getElementById('api-key');
    const modelName = document.getElementById('model-name');
    const maxTokens = document.getElementById('max-tokens');
    const temperature = document.getElementById('temperature');
    const tempValue = document.getElementById('temp-value');
    const streamResponses = document.getElementById('stream-responses');
    const testStatus = document.getElementById('test-status');
    const saveStatus = document.getElementById('save-status');
    const modelsList = document.getElementById('models-list');

    // Load saved settings
    const settings = await messenger.storage.local.get({
        apiBaseUrl: 'https://api.openai.com/v1',
        apiKey: '',
        modelName: 'gpt-4o-mini',
        maxTokens: 4096,
        temperature: 0.7,
        streamResponses: true
    });

    apiBaseUrl.value = settings.apiBaseUrl;
    apiKey.value = settings.apiKey;
    modelName.value = settings.modelName;
    maxTokens.value = settings.maxTokens;
    temperature.value = settings.temperature;
    tempValue.textContent = settings.temperature;
    streamResponses.checked = settings.streamResponses;

    // Temperature slider
    temperature.addEventListener('input', () => {
        tempValue.textContent = temperature.value;
    });

    // Toggle API key visibility
    document.getElementById('toggle-key').addEventListener('click', () => {
        apiKey.type = apiKey.type === 'password' ? 'text' : 'password';
    });

    // Test connection
    document.getElementById('btn-test').addEventListener('click', async () => {
        showStatus(testStatus, 'Testing connection...', 'warning');
        
        try {
            const result = await messenger.runtime.sendMessage({
                action: 'testConnection',
                settings: {
                    apiBaseUrl: apiBaseUrl.value,
                    apiKey: apiKey.value
                }
            });

            if (result.success) {
                showStatus(testStatus, `✅ Connected! Found ${result.models.length} model(s)`, 'success');
            } else {
                showStatus(testStatus, `❌ Failed: ${result.error}`, 'error');
            }
        } catch (err) {
            showStatus(testStatus, `❌ Error: ${err.message}`, 'error');
        }
    });

    // Fetch models
    document.getElementById('btn-fetch-models').addEventListener('click', async () => {
        try {
            const result = await messenger.runtime.sendMessage({
                action: 'testConnection',
                settings: {
                    apiBaseUrl: apiBaseUrl.value,
                    apiKey: apiKey.value
                }
            });

            if (result.success && result.models.length > 0) {
                modelsList.innerHTML = '';
                modelsList.style.display = 'block';

                result.models.slice(0, 50).forEach(model => {
                    const item = document.createElement('div');
                    item.className = 'model-item';
                    item.textContent = model;
                    item.addEventListener('click', () => {
                        modelName.value = model;
                        modelsList.style.display = 'none';
                    });
                    modelsList.appendChild(item);
                });
            } else {
                showStatus(testStatus, result.error || 'No models found', 'error');
            }
        } catch (err) {
            showStatus(testStatus, `Error: ${err.message}`, 'error');
        }
    });

    // Save settings
    document.getElementById('btn-save').addEventListener('click', async () => {
        const newSettings = {
            apiBaseUrl: apiBaseUrl.value.trim() || 'https://api.openai.com/v1',
            apiKey: apiKey.value.trim(),
            modelName: modelName.value.trim() || 'gpt-4o-mini',
            maxTokens: parseInt(maxTokens.value) || 4096,
            temperature: parseFloat(temperature.value) || 0.7,
            streamResponses: streamResponses.checked
        };

        try {
            await messenger.storage.local.set(newSettings);
            showStatus(saveStatus, '✅ Settings saved!', 'success');
            setTimeout(() => hideStatus(saveStatus), 3000);
        } catch (err) {
            showStatus(saveStatus, `❌ Failed: ${err.message}`, 'error');
        }
    });

    // Status helpers
    function showStatus(el, text, type) {
        el.textContent = text;
        el.className = `status-message visible ${type}`;
    }

    function hideStatus(el) {
        el.className = 'status-message';
    }
});
