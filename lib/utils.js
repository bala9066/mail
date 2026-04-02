// DP Mail AI Assist — Shared Utilities

const Utils = {
    /**
     * Format file size in human-readable form
     */
    formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return (bytes / Math.pow(1024, i)).toFixed(1) + ' ' + sizes[i];
    },

    /**
     * Get file extension from filename
     */
    getExtension(filename) {
        return (filename || '').split('.').pop().toLowerCase();
    },

    /**
     * Check if a file type is a text-based format
     */
    isTextType(contentType, filename) {
        const textTypes = [
            'text/plain', 'text/csv', 'text/html', 'text/xml',
            'application/json', 'application/xml', 'text/markdown'
        ];
        const textExts = ['txt', 'csv', 'log', 'json', 'xml', 'html', 'htm', 'md', 'yaml', 'yml', 'ini', 'cfg', 'conf'];
        const ext = this.getExtension(filename);
        return textTypes.includes(contentType) || textExts.includes(ext);
    },

    /**
     * Check if file is a PDF
     */
    isPDF(contentType, filename) {
        return contentType === 'application/pdf' || this.getExtension(filename) === 'pdf';
    },

    /**
     * Check if file is a DOCX
     */
    isDOCX(contentType, filename) {
        return contentType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            || this.getExtension(filename) === 'docx';
    },

    /**
     * Check if file is an XLSX
     */
    isXLSX(contentType, filename) {
        return contentType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            || this.getExtension(filename) === 'xlsx'
            || contentType === 'application/vnd.ms-excel'
            || this.getExtension(filename) === 'xls';
    },

    /**
     * Check if file is an image
     */
    isImage(contentType, filename) {
        const imgTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp', 'image/bmp', 'image/tiff'];
        const imgExts = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'tiff', 'tif'];
        const ext = this.getExtension(filename);
        return imgTypes.includes(contentType) || imgExts.includes(ext);
    },

    /**
     * Convert ArrayBuffer to Base64
     */
    arrayBufferToBase64(buffer) {
        let binary = '';
        const bytes = new Uint8Array(buffer);
        for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
    },

    /**
     * Truncate text to a maximum character count with ellipsis
     */
    truncateText(text, maxChars = 50000) {
        if (!text || text.length <= maxChars) return text;
        return text.substring(0, maxChars) + '\n\n[... Content truncated at ' + maxChars + ' characters ...]';
    },

    /**
     * Strip HTML tags and return plain text
     */
    stripHTML(html) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        return doc.body.textContent || '';
    },

    /**
     * Get default settings
     */
    getDefaultSettings() {
        return {
            apiBaseUrl: 'https://api.openai.com/v1',
            apiKey: '',
            modelName: 'gpt-4o-mini',
            maxTokens: 4096,
            temperature: 0.7,
            streamResponses: true
        };
    },

    /**
     * Load settings from storage
     */
    async loadSettings() {
        const defaults = this.getDefaultSettings();
        try {
            const stored = await messenger.storage.local.get(defaults);
            return { ...defaults, ...stored };
        } catch (e) {
            console.error('Failed to load settings:', e);
            return defaults;
        }
    },

    /**
     * Save settings to storage
     */
    async saveSettings(settings) {
        try {
            await messenger.storage.local.set(settings);
            return true;
        } catch (e) {
            console.error('Failed to save settings:', e);
            return false;
        }
    }
};
