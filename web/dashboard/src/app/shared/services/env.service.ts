import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class EnvService {
  get apiUrl(): string {
    return (window as any).__env?.apiUrl ?? '';
  }
}
