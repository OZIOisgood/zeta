import { buildReportDoc, ReportDocModel } from './reports.pdf';

describe('buildReportDoc', () => {
  const model: ReportDocModel = {
    title: 'Expertenbericht',
    subtitle: 'Max · Juni 2026',
    kpiLine: '3 Videos · 18 Min   |   0 Live · 0 Min   |   2 students',
    columns: ['Datum', 'Typ', 'Beschreibung', 'Länge'],
    sections: [
      {
        heading: 'Beta › Anna',
        subtotal: '2 Videos · 12 Min',
        rows: [
          ['03.06.2026', 'Video', 'Clip A', '1:30'],
          ['09.06.2026', 'Video', 'Clip B', '4:20'],
        ],
      },
      {
        heading: 'Beta › Tom',
        subtotal: '1 Video · 6 Min',
        rows: [['02.06.2026', 'Video', 'Clip C', '6:00']],
      },
    ],
    total: { label: 'Total', value: '1 Std' },
  };

  it('puts the title, subtitle, KPI line into the content and document info', () => {
    const doc = buildReportDoc(model) as any;
    expect(doc.content[0].text).toBe('Expertenbericht');
    expect(doc.content[1].text).toBe('Max · Juni 2026');
    expect(doc.content[2].text).toBe(model.kpiLine);
    expect(doc.info.title).toBe('Expertenbericht');
  });

  it('renders a header + a 4-column event table per section', () => {
    const doc = buildReportDoc(model) as any;
    // content: h1, subtitle, kpi, [header, table] × 2 sections, total
    const header0 = doc.content[3].table;
    expect(header0.body[0][0].text).toBe('Beta › Anna');
    expect(header0.body[0][1].text).toBe('2 Videos · 12 Min');

    const table0 = doc.content[4].table;
    expect(table0.headerRows).toBe(1);
    expect(table0.widths).toHaveLength(4);
    expect(table0.body[0].map((c: any) => c.text)).toEqual(model.columns);
    expect(table0.body).toHaveLength(model.sections[0].rows.length + 1);
    expect(table0.body[1].map((c: any) => c.text)).toEqual(model.sections[0].rows[0]);

    // Second section follows immediately.
    expect(doc.content[5].table.body[0][0].text).toBe('Beta › Tom');
    expect(doc.content[6].table.body[1].map((c: any) => c.text)).toEqual(model.sections[1].rows[0]);
  });

  it('ends with a single-line grand total', () => {
    const doc = buildReportDoc(model) as any;
    const total = doc.content[doc.content.length - 1].table;
    expect(total.body[0][0].text).toBe('Total');
    expect(total.body[0][1].text).toBe('1 Std');
  });

  it('renders page numbers in the footer', () => {
    const doc = buildReportDoc(model) as any;
    expect(doc.footer(2, 5).text).toBe('2 / 5');
  });
});
