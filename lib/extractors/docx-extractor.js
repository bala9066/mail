// DP Mail AI Assist — DOCX Text Extractor
// Uses JSZip to unpack DOCX and parse the XML content

const DOCXExtractor = {
    /**
     * Extract text from a DOCX file
     * @param {File} file — File object from messenger API
     * @returns {string} Extracted text content
     */
    async extract(file) {
        if (typeof JSZip === 'undefined') {
            return '[DOCX extraction unavailable — JSZip library not loaded]';
        }

        try {
            const arrayBuffer = await file.arrayBuffer();
            const zip = await JSZip.loadAsync(arrayBuffer);

            // DOCX stores main content in word/document.xml
            const documentXml = zip.file('word/document.xml');
            if (!documentXml) {
                return '[DOCX file does not contain word/document.xml]';
            }

            const xmlContent = await documentXml.async('string');
            const text = this.parseDocumentXml(xmlContent);

            if (!text.trim()) {
                return '[DOCX contains no extractable text]';
            }

            return text;
        } catch (err) {
            console.error('DOCX extraction error:', err);
            return `[DOCX extraction failed: ${err.message}]`;
        }
    },

    /**
     * Parse word/document.xml and extract readable text
     * DOCX XML structure: w:body > w:p (paragraphs) > w:r (runs) > w:t (text)
     */
    parseDocumentXml(xmlString) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(xmlString, 'text/xml');

        const nsResolver = (prefix) => {
            const ns = {
                'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'
            };
            return ns[prefix] || null;
        };

        const paragraphs = doc.getElementsByTagNameNS(
            'http://schemas.openxmlformats.org/wordprocessingml/2006/main', 'p'
        );

        const lines = [];
        for (const para of paragraphs) {
            const texts = para.getElementsByTagNameNS(
                'http://schemas.openxmlformats.org/wordprocessingml/2006/main', 't'
            );
            let line = '';
            for (const t of texts) {
                line += t.textContent;
            }
            if (line.trim()) {
                lines.push(line.trim());
            }
        }

        return lines.join('\n');
    }
};
