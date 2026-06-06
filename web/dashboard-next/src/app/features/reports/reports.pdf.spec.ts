import { buildReportDoc } from './reports.pdf';

describe('buildReportDoc', () => {
  const rows = [
    ['Beta', 'Student One', '03.06.2026', 'Video', 'Clip A', '2'],
    ['Beta', 'Student One', '04.06.2026', 'Live', 'Session A', '30'],
  ];
  const meta = {
    title: 'Expertenbericht',
    subtitle: 'Max · Juni 2026',
    columns: ['Gruppe', 'Schüler', 'Datum', 'Typ', 'Beschreibung', 'Länge (Min)'],
  };

  it('puts the title and subtitle into the content and document info', () => {
    const doc = buildReportDoc(rows, meta) as any;
    expect(doc.content[0].text).toBe('Expertenbericht');
    expect(doc.content[1].text).toBe('Max · Juni 2026');
    expect(doc.info.title).toBe('Expertenbericht');
  });

  it('builds a table with a header row plus one row per event', () => {
    const doc = buildReportDoc(rows, meta) as any;
    const table = doc.content[2].table;
    expect(table.headerRows).toBe(1);
    expect(table.widths).toHaveLength(6);
    expect(table.body).toHaveLength(rows.length + 1);
    expect(table.body[0].map((c: any) => c.text)).toEqual(meta.columns);
    expect(table.body[1].map((c: any) => c.text)).toEqual(rows[0]);
  });

  it('renders page numbers in the footer', () => {
    const doc = buildReportDoc(rows, meta) as any;
    expect(doc.footer(2, 5).text).toBe('2 / 5');
  });
});
