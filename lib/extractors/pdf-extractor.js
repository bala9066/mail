// DP Mail AI Assist — PDF Text Extractor
// Uses Mozilla's pdf.js to extract text from PDF files

const PDFExtractor = {
    _initialized: false,

    /**
     * Initialize pdf.js worker
     */
    init() {
        if (this._initialized) return;
        if (typeof pdfjsLib !== 'undefined') {
            pdfjsLib.GlobalWorkerOptions.workerSrc = '../vendor/pdf.worker.min.js';
            this._initialized = true;
        }
    },

    /**
     * Extract text from a PDF file
     * @param {File} file — File object from messenger API
     * @returns {string} Extracted text content
     */
    async extract(file) {
        this.init();

        if (typeof pdfjsLib === 'undefined') {
            return '[PDF extraction unavailable — pdf.js library not loaded]';
        }

        try {
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            const totalPages = pdf.numPages;
            const textParts = [];

            for (let i = 1; i <= totalPages; i++) {
                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();
                const pageText = textContent.items
                    .map(item => item.str)
                    .join(' ');
                if (pageText.trim()) {
                    textParts.push(`--- Page ${i} ---\n${pageText.trim()}`);
                }
            }

            if (textParts.length === 0) {
                return '[PDF contains no extractable text — may be a scanned/image PDF]';
            }

            return textParts.join('\n\n');
        } catch (err) {
            console.error('PDF extraction error:', err);
            return `[PDF extraction failed: ${err.message}]`;
        }
    }
};
