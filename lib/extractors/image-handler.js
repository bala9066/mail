// DP Mail AI Assist — Image Handler
// Converts images to base64 data URLs for multimodal/vision LLM analysis

const ImageHandler = {
    /** 
     * Supported image MIME types for vision models
     */
    SUPPORTED_TYPES: ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'],

    /**
     * Convert image file to base64 data URL
     * @param {File} file — File object from messenger API
     * @returns {object} { dataUrl, mimeType, description }
     */
    async process(file) {
        try {
            const arrayBuffer = await file.arrayBuffer();
            const bytes = new Uint8Array(arrayBuffer);
            let binary = '';
            for (let i = 0; i < bytes.byteLength; i++) {
                binary += String.fromCharCode(bytes[i]);
            }
            const base64 = btoa(binary);
            const mimeType = file.type || this.guessMimeType(file.name);
            const dataUrl = `data:${mimeType};base64,${base64}`;

            return {
                dataUrl,
                mimeType,
                fileName: file.name,
                size: file.size,
                description: `[Image: ${file.name} (${mimeType}, ${this.formatSize(file.size)})]`
            };
        } catch (err) {
            console.error('Image processing error:', err);
            return {
                dataUrl: null,
                mimeType: file.type,
                fileName: file.name,
                size: file.size,
                description: `[Image processing failed: ${err.message}]`
            };
        }
    },

    /**
     * Guess MIME type from file extension
     */
    guessMimeType(filename) {
        const ext = (filename || '').split('.').pop().toLowerCase();
        const map = {
            'png': 'image/png',
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'gif': 'image/gif',
            'webp': 'image/webp',
            'bmp': 'image/bmp',
            'tiff': 'image/tiff',
            'tif': 'image/tiff'
        };
        return map[ext] || 'image/png';
    },

    /**
     * Format file size
     */
    formatSize(bytes) {
        if (bytes === 0) return '0 B';
        const sizes = ['B', 'KB', 'MB'];
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return (bytes / Math.pow(1024, i)).toFixed(1) + ' ' + sizes[i];
    },

    /**
     * Check if the image is within size limits for vision API
     * Most vision APIs have a ~20MB limit
     */
    isWithinSizeLimit(file, maxMB = 20) {
        return file.size <= maxMB * 1024 * 1024;
    }
};
