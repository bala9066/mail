// DP Mail AI Assist — Popup Script

document.addEventListener('DOMContentLoaded', async () => {
    const displayActions = document.getElementById('display-actions');
    const composeActions = document.getElementById('compose-actions');
    const customPromptArea = document.getElementById('custom-prompt-area');
    const customPromptInput = document.getElementById('custom-prompt-input');
    const loadingOverlay = document.getElementById('loading-overlay');
    const statusIndicator = document.getElementById('status-indicator');
    const statusText = document.getElementById('status-text');
    const attachmentInfo = document.getElementById('attachment-info');
    const attachmentCount = document.getElementById('attachment-count');

    // Determine context: message display or compose
    let currentTab;
    try {
        const tabs = await messenger.tabs.query({ active: true, currentWindow: true });
        currentTab = tabs[0];
    } catch (e) {
        console.error('Failed to get current tab:', e);
    }

    const isCompose = currentTab?.type === 'messageCompose';

    if (isCompose) {
        displayActions.style.display = 'none';
        composeActions.style.display = 'block';
    } else {
        displayActions.style.display = 'block';
        composeActions.style.display = 'none';

        // Check for attachments
        try {
            const msgData = await messenger.runtime.sendMessage({
                action: 'getMessageData',
                tabId: currentTab.id
            });

            if (msgData && !msgData.error && msgData.hasAttachments) {
                attachmentInfo.style.display = 'flex';
                attachmentCount.textContent = `${msgData.attachments.length} attachment(s) found`;
            }
        } catch (e) {
            console.error('Failed to check attachments:', e);
        }
    }

    // Check API connection
    checkConnection();

    // Settings button
    document.getElementById('btn-settings').addEventListener('click', () => {
        messenger.runtime.openOptionsPage();
        window.close();
    });

    // Action buttons
    document.querySelectorAll('.action-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const actionId = btn.dataset.action;

            if (actionId === 'customPrompt') {
                customPromptArea.style.display = 'block';
                customPromptInput.focus();
                return;
            }

            await executeAction(actionId);
        });
    });

    // Custom prompt
    document.getElementById('btn-cancel-custom').addEventListener('click', () => {
        customPromptArea.style.display = 'none';
        customPromptInput.value = '';
    });

    document.getElementById('btn-send-custom').addEventListener('click', async () => {
        const input = customPromptInput.value.trim();
        if (!input) return;
        await executeAction('customPrompt', input);
    });

    // Execute an action
    async function executeAction(actionId, customInput = '') {
        loadingOverlay.style.display = 'flex';

        try {
            // Request background to prepare the action
            const result = await messenger.runtime.sendMessage({
                action: 'streamAction',
                actionId: actionId,
                tabId: currentTab.id,
                customInput: customInput
            });

            if (result.error) {
                alert('Error: ' + result.error);
                loadingOverlay.style.display = 'none';
                return;
            }

            if (result.ready) {
                // Open response page in a new tab and pass data
                const responseUrl = messenger.runtime.getURL('pages/response.html');
                
                // Store the data for the response page to pick up
                await messenger.storage.local.set({
                    _pendingResponse: {
                        messages: result.messages,
                        settings: result.settings,
                        actionLabel: result.actionLabel,
                        subject: result.subject,
                        timestamp: Date.now()
                    }
                });

                await messenger.tabs.create({ url: responseUrl });
                window.close();
            }
        } catch (err) {
            console.error('Action failed:', err);
            alert('Failed: ' + err.message);
            loadingOverlay.style.display = 'none';
        }
    }

    // Check connection status
    async function checkConnection() {
        try {
            const settings = await messenger.storage.local.get({
                apiBaseUrl: 'https://api.openai.com/v1',
                apiKey: ''
            });

            if (!settings.apiKey && !settings.apiBaseUrl.includes('localhost') && !settings.apiBaseUrl.includes('127.0.0.1')) {
                statusIndicator.classList.add('error');
                statusText.textContent = 'API key not configured';
                return;
            }

            statusIndicator.classList.add('connected');
            statusText.textContent = 'Ready — ' + settings.apiBaseUrl.replace(/^https?:\/\//, '').replace(/\/v1\/?$/, '');
        } catch (e) {
            statusIndicator.classList.add('error');
            statusText.textContent = 'Configuration error';
        }
    }
});
