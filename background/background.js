// DP Mail AI Assist — Background Script
// Handles message passing between popup, options, response panel, and Thunderbird APIs

// Listen for messages from popup / response panel
messenger.runtime.onMessage.addListener(async (message, sender) => {
    switch (message.action) {
        case 'getMessageData':
            return await getMessageData(message.tabId);

        case 'getComposeData':
            return await getComposeData(message.tabId);

        case 'processAction':
            return await processAction(message);

        case 'testConnection':
            return await LLMClient.testConnection(message.settings);

        case 'getAttachmentList':
            return await AttachmentReader.getAttachmentList(message.messageId);

        case 'streamAction':
            return await handleStreamAction(message, sender);

        default:
            return { error: 'Unknown action: ' + message.action };
    }
});

/**
 * Get email data from the currently displayed message
 */
async function getMessageData(tabId) {
    try {
        const msgDisplay = await messenger.messageDisplay.getDisplayedMessage(tabId);
        if (!msgDisplay) {
            return { error: 'No message is currently displayed.' };
        }

        const fullMsg = await messenger.messages.getFull(msgDisplay.id);
        const headers = fullMsg.headers || {};

        // Extract body text
        let bodyText = '';
        bodyText = extractBodyFromParts(fullMsg.parts);

        // Get attachment list
        const attachments = await messenger.messages.listAttachments(msgDisplay.id);
        const attachmentInfo = attachments.map(att => ({
            name: att.name,
            contentType: att.contentType,
            size: att.size,
            partName: att.partName
        }));

        return {
            messageId: msgDisplay.id,
            subject: msgDisplay.subject || '(no subject)',
            from: msgDisplay.author || '',
            to: (headers.to || []).join(', '),
            date: msgDisplay.date ? new Date(msgDisplay.date).toLocaleString() : '',
            body: bodyText,
            attachments: attachmentInfo,
            hasAttachments: attachments.length > 0
        };
    } catch (err) {
        console.error('getMessageData error:', err);
        return { error: err.message };
    }
}

/**
 * Recursively extract text body from message parts
 */
function extractBodyFromParts(parts, preferHTML = false) {
    if (!parts || parts.length === 0) return '';

    let textBody = '';
    let htmlBody = '';

    for (const part of parts) {
        if (part.contentType === 'text/plain' && part.body) {
            textBody = part.body;
        } else if (part.contentType === 'text/html' && part.body) {
            htmlBody = part.body;
        }

        // Recurse into multipart containers
        if (part.parts && part.parts.length > 0) {
            const nested = extractBodyFromParts(part.parts, preferHTML);
            if (nested) {
                if (!textBody && !htmlBody) {
                    textBody = nested;
                }
            }
        }
    }

    if (textBody) return textBody;
    if (htmlBody) {
        // Strip HTML to plain text
        try {
            const parser = new DOMParser();
            const doc = parser.parseFromString(htmlBody, 'text/html');
            doc.querySelectorAll('script, style, noscript').forEach(el => el.remove());
            return doc.body.textContent.trim();
        } catch {
            return htmlBody.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
        }
    }

    return '';
}

/**
 * Get compose window data
 */
async function getComposeData(tabId) {
    try {
        const details = await messenger.compose.getComposeDetails(tabId);
        let body = '';

        if (details.isPlainText) {
            body = details.plainTextBody || '';
        } else {
            // Convert HTML to plain text
            const html = details.body || '';
            try {
                const parser = new DOMParser();
                const doc = parser.parseFromString(html, 'text/html');
                body = doc.body.textContent.trim();
            } catch {
                body = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
            }
        }

        return {
            subject: details.subject || '',
            to: details.to ? details.to.join(', ') : '',
            body: body,
            isPlainText: details.isPlainText
        };
    } catch (err) {
        console.error('getComposeData error:', err);
        return { error: err.message };
    }
}

/**
 * Process an AI action (non-streaming)
 */
async function processAction(message) {
    const { actionId, tabId, customInput } = message;
    const settings = await Utils.loadSettings();

    if (!settings.apiKey && !settings.apiBaseUrl.includes('localhost') && !settings.apiBaseUrl.includes('127.0.0.1')) {
        return { error: 'API key is required for non-local endpoints. Please configure in settings.' };
    }

    const prompt = DEFAULT_PROMPTS[actionId];
    if (!prompt) {
        return { error: 'Unknown action: ' + actionId };
    }

    try {
        let data;
        let attachmentData = null;
        let imageDataUrls = [];

        if (prompt.context === 'compose') {
            data = await getComposeData(tabId);
        } else {
            data = await getMessageData(tabId);

            // Process attachments if needed
            if (['summarizeAttachments', 'summarizeAll', 'customPrompt'].includes(actionId) && data.messageId) {
                attachmentData = await AttachmentReader.processAllAttachments(data.messageId);
                imageDataUrls = attachmentData.imageDataUrls || [];
            }
        }

        if (data.error) return data;

        // Build the prompt text
        let userPrompt = prompt.template
            .replace('{subject}', data.subject || '')
            .replace('{from}', data.from || '')
            .replace('{to}', data.to || '')
            .replace('{date}', data.date || '')
            .replace('{body}', data.body || '')
            .replace('{composeBody}', data.body || '')
            .replace('{customInput}', customInput || '');

        if (attachmentData) {
            userPrompt = userPrompt
                .replace('{attachments}', attachmentData.summary || 'No attachments.')
                .replace('{attachments_section}',
                    attachmentData.summary ? `**Attachments:**\n${attachmentData.summary}` : '');
        } else {
            userPrompt = userPrompt
                .replace('{attachments}', 'No attachments.')
                .replace('{attachments_section}', '');
        }

        const messages = LLMClient.buildMessages(prompt.system, userPrompt, imageDataUrls);
        const result = await LLMClient.complete(messages, settings);

        return {
            content: result.content,
            usage: result.usage,
            model: result.model
        };
    } catch (err) {
        console.error('processAction error:', err);
        return { error: err.message };
    }
}

/**
 * Handle streaming action — opens a response tab and streams to it
 */
async function handleStreamAction(message, sender) {
    const { actionId, tabId, customInput } = message;
    const settings = await Utils.loadSettings();

    const prompt = DEFAULT_PROMPTS[actionId];
    if (!prompt) return { error: 'Unknown action' };

    try {
        let data;
        let attachmentData = null;
        let imageDataUrls = [];

        if (prompt.context === 'compose') {
            data = await getComposeData(tabId);
        } else {
            data = await getMessageData(tabId);

            if (['summarizeAttachments', 'summarizeAll', 'customPrompt'].includes(actionId) && data.messageId) {
                attachmentData = await AttachmentReader.processAllAttachments(data.messageId);
                imageDataUrls = attachmentData.imageDataUrls || [];
            }
        }

        if (data.error) return data;

        let userPrompt = prompt.template
            .replace('{subject}', data.subject || '')
            .replace('{from}', data.from || '')
            .replace('{to}', data.to || '')
            .replace('{date}', data.date || '')
            .replace('{body}', data.body || '')
            .replace('{composeBody}', data.body || '')
            .replace('{customInput}', customInput || '');

        if (attachmentData) {
            userPrompt = userPrompt
                .replace('{attachments}', attachmentData.summary || 'No attachments.')
                .replace('{attachments_section}',
                    attachmentData.summary ? `**Attachments:**\n${attachmentData.summary}` : '');
        } else {
            userPrompt = userPrompt
                .replace('{attachments}', 'No attachments.')
                .replace('{attachments_section}', '');
        }

        // Return the prepared data for the response panel to stream
        return {
            ready: true,
            messages: LLMClient.buildMessages(prompt.system, userPrompt, imageDataUrls),
            settings: settings,
            actionLabel: prompt.label,
            subject: data.subject
        };
    } catch (err) {
        return { error: err.message };
    }
}

console.log('DP Mail AI Assist — Background script loaded');
