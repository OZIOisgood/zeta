// Pure pdfmake document builder for report exports. Takes the already-flattened
// rows (reportRows) plus localized chrome and returns a plain document object.
// The component lazy-loads pdfmake at runtime and renders this — keeping pdfmake
// out of the main bundle and out of the unit-test path.
import type { TDocumentDefinitions } from 'pdfmake/interfaces';

export type ReportDocMeta = {
  // Localized report title (e.g. "Expertenbericht").
  title: string;
  // One-line summary under the title (e.g. "Max Mustermann · Juni 2026").
  subtitle: string;
  // The 6 localized column headers, in row order:
  // [group, leaf, date, type, title, minutes].
  columns: string[];
};

export function buildReportDoc(rows: string[][], meta: ReportDocMeta): TDocumentDefinitions {
  return {
    pageSize: 'A4',
    pageMargins: [32, 40, 32, 36],
    info: { title: meta.title },
    content: [
      { text: meta.title, style: 'h1' },
      { text: meta.subtitle, style: 'subtitle' },
      {
        table: {
          headerRows: 1,
          widths: ['*', '*', 'auto', 'auto', '*', 'auto'],
          body: [
            meta.columns.map((text) => ({ text, style: 'th' })),
            ...rows.map((row) => row.map((text) => ({ text }))),
          ],
        },
        layout: 'lightHorizontalLines',
      },
    ],
    footer: (currentPage: number, pageCount: number) => ({
      text: `${currentPage} / ${pageCount}`,
      alignment: 'right',
      margin: [0, 8, 32, 0],
      fontSize: 8,
      color: '#888888',
    }),
    defaultStyle: { fontSize: 9 },
    styles: {
      h1: { fontSize: 16, bold: true, margin: [0, 0, 0, 2] },
      subtitle: { fontSize: 10, color: '#666666', margin: [0, 0, 0, 12] },
      th: { bold: true, fillColor: '#f3f4f6', margin: [0, 2, 0, 2] },
    },
  };
}
