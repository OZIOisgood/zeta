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

  private toDate(value: DateTimeValue): Date {
    return value instanceof Date ? value : new Date(value);
  }
}
