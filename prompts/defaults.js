// DP Mail AI Assist — Default Prompt Templates
const DEFAULT_PROMPTS = {
    // === Message Display Actions ===
    summarizeEmail: {
        id: 'summarize-email',
        label: '📝 Summarize Email',
        context: 'display',
        system: 'You are an expert email summarizer. Provide concise, structured summaries.',
        template: `Please summarize the following email concisely. Include:
- **Key Points**: Main topics discussed
- **Action Items**: Any tasks or requests mentioned
- **Decisions**: Any decisions made
- **Deadlines**: Any dates or deadlines mentioned

**Subject:** {subject}
**From:** {from}
**Date:** {date}

**Email Body:**
{body}`
    },

    summarizeAttachments: {
        id: 'summarize-attachments',
        label: '📎 Summarize Attachments',
        context: 'display',
        system: 'You are an expert document analyst. Summarize the content of attached files clearly and concisely.',
        template: `Please summarize the content of the following email attachments.
For each attachment, provide:
- **File Name** and type
- **Key Content**: Main points or data
- **Relevance**: How it relates to the email

**Email Subject:** {subject}

**Attachments:**
{attachments}`
    },

    summarizeAll: {
        id: 'summarize-all',
        label: '📬 Summarize All',
        context: 'display',
        system: 'You are an expert email and document analyst. Provide a unified summary of the email and all attachments.',
        template: `Please provide a comprehensive summary of this email and all its attachments.

**Subject:** {subject}
**From:** {from}
**Date:** {date}

**Email Body:**
{body}

**Attachments:**
{attachments}

Provide a unified summary that connects the email content with the attachment contents.`
    },

    draftReply: {
        id: 'draft-reply',
        label: '✍️ Draft Reply',
        context: 'display',
        system: 'You are a professional email writer. Draft clear, polite, and effective email replies.',
        template: `Please draft a professional reply to the following email.

**Subject:** {subject}
**From:** {from}
**Date:** {date}

**Email Body:**
{body}

Draft a reply that:
- Acknowledges the key points
- Addresses any questions asked
- Is professional and concise`
    },

    customPrompt: {
        id: 'custom-prompt',
        label: '🔍 Custom Prompt',
        context: 'display',
        system: 'You are a helpful AI assistant analyzing email content.',
        template: `{customInput}

**Email Context:**
**Subject:** {subject}
**From:** {from}

**Email Body:**
{body}

{attachments_section}`
    },

    // === Compose Actions ===
    improveWriting: {
        id: 'improve-writing',
        label: '✨ Improve Writing',
        context: 'compose',
        system: 'You are an expert editor. Improve text for clarity, grammar, and professional tone. Return ONLY the improved text, no explanations.',
        template: `Improve the following email text for clarity, grammar, and professional tone:

{composeBody}`
    },

    rewrite: {
        id: 'rewrite',
        label: '📝 Rewrite',
        context: 'compose',
        system: 'You are an expert writer. Rewrite text to be more effective. Return ONLY the rewritten text, no explanations.',
        template: `Rewrite the following email text to be more clear, concise, and effective:

{composeBody}`
    },

    proofread: {
        id: 'proofread',
        label: '✅ Proofread',
        context: 'compose',
        system: 'You are a meticulous proofreader. Identify and fix errors. List corrections, then provide the corrected text.',
        template: `Proofread the following email text. Identify any spelling, grammar, punctuation, or style errors. Provide the corrected version with a list of changes made:

{composeBody}`
    }
};

// Export for use in other modules
if (typeof module !== 'undefined') module.exports = DEFAULT_PROMPTS;
