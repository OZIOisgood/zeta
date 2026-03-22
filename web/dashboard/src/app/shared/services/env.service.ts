import { Injectable } from '@angular/core';

export interface EnvConfig {
  apiUrl: string;
}

@Injectable({ providedIn: 'root' })
export class EnvService {
  private config: EnvConfig = { apiUrl: '' };

  get apiUrl(): string {
    return this.config.apiUrl;
  }

  load(): Promise<void> {
    return fetch('/env.json')
      .then((res) => res.json())
      .then((config) => {
        this.config = config;
      });
  }
}
