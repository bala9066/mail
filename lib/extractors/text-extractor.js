// DP Mail AI Assist — Text File Extractor
// Handles: .txt, .csv, .log, .html, .xml, .json, .md, .yaml, .ini, .cfg

const TextExtractor = {
    /**
     * Extract text content from a text-based file
     * @param {File} file — File object from messenger API
     * @returns {string} Extracted text content
     */
    async extract(file) {
        const text = await file.text();
        const ext = (file.name || '').split('.').pop().toLowerCase();

        // Strip HTML tags for HTML files
        if (ext === 'html' || ext === 'htm' || file.type === 'text/html') {
            return this.stripHTMLContent(text);
        }

        // For XML, extract just text content
        if (ext === 'xml' || file.type === 'text/xml' || file.type === 'application/xml') {
            return this.stripXMLContent(text);
        }

        return text;
    },

    /**
     * Strip HTML tags and return readable text
     */
    stripHTMLContent(html) {
        try {
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            // Remove script and style elements
            doc.querySelectorAll('script, style, noscript').forEach(el => el.remove());
            return doc.body.textContent.trim();
        } catch {
            // Fallback: simple regex strip
            return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
        }
    },

    /**
     * Strip XML tags and return text content
     */
    stripXMLContent(xml) {
        try {
            const parser = new DOMParser();
            const doc = parser.parseFromString(xml, 'text/xml');
            return doc.documentElement.textContent.trim();
        } catch {
            return xml.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
        }
    }
};
