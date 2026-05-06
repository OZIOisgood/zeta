import { orderedWeekdayValues, resolveFirstDayOfWeek } from './weekdays';

describe('weekday utilities', () => {
  it('orders weekdays from Monday for Berlin timezone users', () => {
    expect(resolveFirstDayOfWeek('Europe/Berlin', 'en')).toBe(1);
    expect(orderedWeekdayValues(resolveFirstDayOfWeek('Europe/Berlin', 'en'))).toEqual([
      1, 2, 3, 4, 5, 6, 0,
    ]);
  });

  it('keeps Sunday first for US locale when the timezone has no explicit rule', () => {
    expect(resolveFirstDayOfWeek('America/New_York', 'en-US')).toBe(0);
    expect(orderedWeekdayValues(resolveFirstDayOfWeek('America/New_York', 'en-US'))).toEqual([
      0, 1, 2, 3, 4, 5, 6,
    ]);
  });

  it('uses Monday first for German locale when the timezone has no explicit rule', () => {
    expect(resolveFirstDayOfWeek('America/New_York', 'de-DE')).toBe(1);
  });
});
