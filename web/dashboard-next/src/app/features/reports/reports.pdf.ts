// Pure pdfmake document builder for the grouped report PDF. Takes a structured
// model (KPI line + one section per group→leaf, each with its own event table)
// and returns a plain document object. The component lazy-loads pdfmake at
// runtime and renders this — keeping pdfmake out of the main bundle and out of
// the unit-test path.
import type { Content, TableCell, TDocumentDefinitions } from 'pdfmake/interfaces';

// pdfmake cell borders are a [left, top, right, bottom] tuple.
type Border = [boolean, boolean, boolean, boolean];
const bottomBorder: Border = [false, false, false, true];

export type ReportDocSection = {
  // "Group › Leaf" header for the block.
  heading: string;
  // Localized subtotal shown to the right of the heading.
  subtotal: string;
  // Event rows in [date, type, description, length] order.
  rows: string[][];
};

export type ReportDocModel = {
  // Localized report title (e.g. "Expertenbericht").
  title: string;
  // One-line summary under the title (e.g. "Max Mustermann · Juni 2026").
  subtitle: string;
  // Plain-text KPI line under the subtitle (videos / live / people).
  kpiLine: string;
  // The 4 localized event-table headers: [date, type, description, length].
  columns: string[];
  // One block per group→leaf pair, in render order.
  sections: ReportDocSection[];
  // Single-line grand total: a localized label and the aggregated length.
  total: { label: string; value: string };
};

// Layout that draws only a single line on a given horizontal edge — used for the
// heavy underline under section headers and above the grand total.
const topRuleLayout = {
  hLineWidth: (i: number) => (i === 0 ? 1.2 : 0),
  vLineWidth: () => 0,
  hLineColor: () => '#111111',
  paddingLeft: () => 0,
  paddingRight: () => 0,
  paddingTop: () => 4,
  paddingBottom: () => 0,
};

export function buildReportDoc(model: ReportDocModel): TDocumentDefinitions {
  const sectionContent: Content[] = model.sections.flatMap((section): Content[] => [
    // Header: "Group › Leaf" left, subtotal right, with a heavy underline.
    {
      table: {
        widths: ['*', 'auto'],
        body: [
          [
            { text: section.heading, style: 'sectionHead', border: bottomBorder },
            {
              text: section.subtotal,
              style: 'sectionSub',
              alignment: 'right',
              border: bottomBorder,
            },
          ],
        ],
      },
      layout: {
        hLineWidth: (i: number) => (i === 1 ? 1.2 : 0),
        vLineWidth: () => 0,
        hLineColor: () => '#111111',
        paddingLeft: () => 0,
        paddingRight: () => 0,
        paddingTop: () => 2,
        paddingBottom: () => 3,
      },
      margin: [0, 10, 0, 0] as [number, number, number, number],
    },
    // Event table — column header repeated per block.
    {
      table: {
        headerRows: 1,
        widths: ['auto', 'auto', '*', 'auto'],
        body: [
          model.columns.map((text): TableCell => ({ text, style: 'th' })),
          ...section.rows.map((row) =>
            row.map((text, i): TableCell => ({ text, alignment: i === 3 ? 'right' : 'left' })),
          ),
        ],
      },
      layout: 'lightHorizontalLines',
      margin: [0, 2, 0, 0] as [number, number, number, number],
    },
  ]);

  return {
    pageSize: 'A4',
    pageMargins: [32, 40, 32, 36],
    info: { title: model.title },
    content: [
      { text: model.title, style: 'h1' },
      { text: model.subtitle, style: 'subtitle' },
      { text: model.kpiLine, style: 'kpi' },
      ...sectionContent,
      // Single-line grand total with a rule above it.
      {
        table: {
          widths: ['*', 'auto'],
          body: [
            [
              { text: model.total.label, style: 'tf' },
              { text: model.total.value, style: 'tf', alignment: 'right' },
            ],
          ],
        },
        layout: topRuleLayout,
        margin: [0, 12, 0, 0] as [number, number, number, number],
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
      subtitle: { fontSize: 10, color: '#666666', margin: [0, 0, 0, 6] },
      kpi: { fontSize: 10, color: '#374151', margin: [0, 0, 0, 2] },
      sectionHead: { fontSize: 11, bold: true },
      sectionSub: { fontSize: 9, color: '#6b7280' },
      th: { bold: true, fillColor: '#f3f4f6', margin: [0, 2, 0, 2] },
      tf: { bold: true, fontSize: 11, margin: [0, 2, 0, 0] },
    },
  };
}
