// DP Mail AI Assist — XLSX/XLS Spreadsheet Extractor
// Uses SheetJS (xlsx.min.js) to extract spreadsheet data as text

const XLSXExtractor = {
    /**
     * Extract text from an XLSX/XLS file
     * @param {File} file — File object from messenger API
     * @returns {string} Extracted text content (CSV-like format)
     */
    async extract(file) {
        if (typeof XLSX === 'undefined') {
            return '[XLSX extraction unavailable — SheetJS library not loaded]';
        }

        try {
            const arrayBuffer = await file.arrayBuffer();
            const workbook = XLSX.read(arrayBuffer, { type: 'array' });
            const parts = [];

            for (const sheetName of workbook.SheetNames) {
                const sheet = workbook.Sheets[sheetName];
                const csv = XLSX.utils.sheet_to_csv(sheet, { blankrows: false });

                if (csv.trim()) {
                    parts.push(`--- Sheet: ${sheetName} ---\n${csv.trim()}`);
                }
            }

            if (parts.length === 0) {
                return '[Spreadsheet contains no data]';
            }

            return parts.join('\n\n');
        } catch (err) {
            console.error('XLSX extraction error:', err);
            return `[Spreadsheet extraction failed: ${err.message}]`;
        }
    }
};
