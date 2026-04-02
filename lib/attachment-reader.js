// DP Mail AI Assist — Attachment Reader Orchestrator
// Routes each attachment to the appropriate extractor

const AttachmentReader = {
    /**
     * Process all attachments for a given message
     * @param {number} messageId — Thunderbird message ID
     * @returns {object} { textContents: string[], imageDataUrls: string[], summary: string }
     */
    async processAllAttachments(messageId) {
        const results = {
            textContents: [],
            imageDataUrls: [],
            summary: '',
            attachmentCount: 0
        };

        try {
            const attachments = await messenger.messages.listAttachments(messageId);
            results.attachmentCount = attachments.length;

            if (attachments.length === 0) {
                results.summary = 'No attachments found in this email.';
                return results;
            }

            const parts = [];

            for (const att of attachments) {
                try {
                    const file = await messenger.messages.getAttachmentFile(messageId, att.partName);
                    const extracted = await this.extractFromFile(file, att);
                    
                    if (extracted.type === 'image') {
                        results.imageDataUrls.push(extracted.dataUrl);
                        parts.push(`### 📷 ${att.name}\n${extracted.description}`);
                    } else {
                        const truncatedContent = Utils.truncateText(extracted.content, 30000);
                        results.textContents.push(`### 📄 ${att.name}\n${truncatedContent}`);
                        parts.push(`### 📄 ${att.name}\n${truncatedContent}`);
                    }
                } catch (err) {
                    console.error(`Failed to process attachment "${att.name}":`, err);
                    parts.push(`### ⚠️ ${att.name}\n[Failed to extract: ${err.message}]`);
                }
            }

            results.summary = parts.join('\n\n');
            return results;
        } catch (err) {
            console.error('Failed to list attachments:', err);
            results.summary = `[Error listing attachments: ${err.message}]`;
            return results;
        }
    },

    /**
     * Extract content from a single file using the appropriate extractor
     * @param {File} file — File object
     * @param {object} att — Attachment metadata from messenger API
     * @returns {object} { type: 'text'|'image', content?, dataUrl?, description? }
     */
    async extractFromFile(file, att) {
        const contentType = att.contentType || file.type || '';
        const fileName = att.name || file.name || 'unknown';

        // Image files → vision model
        if (Utils.isImage(contentType, fileName)) {
            if (!ImageHandler.isWithinSizeLimit(file, 20)) {
                return {
                    type: 'text',
                    content: `[Image "${fileName}" is too large for vision analysis (${Utils.formatFileSize(file.size)})]`
                };
            }
            const result = await ImageHandler.process(file);
            return {
                type: 'image',
                dataUrl: result.dataUrl,
                description: result.description
            };
        }

        // PDF files
        if (Utils.isPDF(contentType, fileName)) {
            const content = await PDFExtractor.extract(file);
            return { type: 'text', content };
        }

        // DOCX files
        if (Utils.isDOCX(contentType, fileName)) {
            const content = await DOCXExtractor.extract(file);
            return { type: 'text', content };
        }

        // XLSX/XLS files
        if (Utils.isXLSX(contentType, fileName)) {
            const content = await XLSXExtractor.extract(file);
            return { type: 'text', content };
        }

        // Text-based files
        if (Utils.isTextType(contentType, fileName)) {
            const content = await TextExtractor.extract(file);
            return { type: 'text', content };
        }

        // Unsupported file type — provide metadata only
        return {
            type: 'text',
            content: `[Unsupported file type: "${fileName}" (${contentType}, ${Utils.formatFileSize(file.size)})]`
        };
    },

    /**
     * Get a quick summary of attachment names and types (metadata only, no content)
     */
    async getAttachmentList(messageId) {
        try {
            const attachments = await messenger.messages.listAttachments(messageId);
            if (attachments.length === 0) return 'No attachments.';
            
            return attachments.map((att, i) =>
                `${i + 1}. "${att.name}" [${att.contentType}] (${Utils.formatFileSize(att.size)})`
            ).join('\n');
        } catch (err) {
            return `[Error listing attachments: ${err.message}]`;
        }
    }
};
