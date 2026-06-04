import { Pipe, PipeTransform, inject } from '@angular/core';
import { DashboardDateTimeService } from './dashboard-date-time.service';

@Pipe({ name: 'relativeTime', standalone: true })
export class RelativeTimePipe implements PipeTransform {
  private readonly dateTime = inject(DashboardDateTimeService);

  transform(value: string): string {
    return this.dateTime.formatRelative(value);
  }
}
