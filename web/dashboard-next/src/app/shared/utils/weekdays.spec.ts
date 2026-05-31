import { orderedWeekdayValues, resolveFirstDayOfWeek } from './weekdays';

describe('weekday utilities', () => {
  it('orders weekdays from Monday for Europe timezone users', () => {
    expect(resolveFirstDayOfWeek('Europe/Rome', 'en')).toBe(1);
    expect(orderedWeekdayValues(resolveFirstDayOfWeek('Europe/Rome', 'en'))).toEqual([
      1, 2, 3, 4, 5, 6, 0,
    ]);
  });

  it('keeps Sunday first for American timezone users', () => {
    expect(resolveFirstDayOfWeek('America/New_York', 'en-US')).toBe(0);
  });
});
