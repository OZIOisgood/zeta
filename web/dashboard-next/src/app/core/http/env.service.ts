import { Injectable } from '@angular/core';

type ZetaWindow = Window & {
  __env?: {
    apiUrl?: string;
    minSessionDurationMinutes?: number | string;
    sessionDurationStepMinutes?: number | string;
  };
};

const positiveInteger = (value: number | string | undefined, fallback: number): number => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

@Injectable({ providedIn: 'root' })
export class EnvService {
  get apiUrl(): string {
    return (window as ZetaWindow).__env?.apiUrl ?? '/api';
  }

  get minSessionDurationMinutes(): number {
    return positiveInteger((window as ZetaWindow).__env?.minSessionDurationMinutes, 15);
  }

  get sessionDurationStepMinutes(): number {
    return positiveInteger((window as ZetaWindow).__env?.sessionDurationStepMinutes, 5);
  }
}
