import { Injectable } from '@angular/core';

type ZetaWindow = Window & {
  __env?: {
    apiUrl?: string;
  };
};

@Injectable({ providedIn: 'root' })
export class EnvService {
  get apiUrl(): string {
    return (window as ZetaWindow).__env?.apiUrl ?? '/api';
  }
}
