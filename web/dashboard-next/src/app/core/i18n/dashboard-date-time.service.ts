import { Injectable, inject } from '@angular/core';
import { DashboardLocalizationService } from './dashboard-localization.service';

type DateTimeValue = Date | string;

@Injectable({ providedIn: 'root' })
export class DashboardDateTimeService {
  private readonly localization = inject(DashboardLocalizationService);

  formatInstantDate(value: DateTimeValue, options: Intl.DateTimeFormatOptions): string {
    return this.toDate(value).toLocaleDateString(this.localization.dateLocale(), {
      timeZone: this.localization.timeZone(),
      ...options,
    });
  }

  formatInstantTime(value: DateTimeValue, options: Intl.DateTimeFormatOptions = {}): string {
    return this.toDate(value).toLocaleTimeString(this.localization.dateLocale(), {
      timeZone: this.localization.timeZone(),
      hour: '2-digit',
      minute: '2-digit',
      ...options,
    });
  }

  formatInstantDateTime(value: DateTimeValue, options: Intl.DateTimeFormatOptions): string {
    return this.toDate(value).toLocaleString(this.localization.dateLocale(), {
      timeZone: this.localization.timeZone(),
      ...options,
    });
  }

  formatCalendarDate(date: string, options: Intl.DateTimeFormatOptions): string {
    return new Date(`${date}T00:00:00`).toLocaleDateString(this.localization.dateLocale(), options);
  }

  formatRelative(value: DateTimeValue): string {
    const now = new Date();
    const date = this.toDate(value);
    const diffMs = date.getTime() - now.getTime();
    const diffSec = Math.round(diffMs / 1000);
    const absSec = Math.abs(diffSec);
    const rtf = new Intl.RelativeTimeFormat(this.localization.dateLocale(), { numeric: 'auto' });

    if (absSec < 45) return rtf.format(0, 'second');
    if (absSec < 3600) return rtf.format(Math.round(diffSec / 60), 'minute');
    if (absSec < 86400) return rtf.format(Math.round(diffSec / 3600), 'hour');
    const days = Math.round(diffSec / 86400);
    if (Math.abs(days) > 30) {
      return this.formatInstantDate(date, { dateStyle: 'medium' });
    }
    return rtf.format(days, 'day');
  }

  private toDate(value: DateTimeValue): Date {
    return value instanceof Date ? value : new Date(value);
  }
}
