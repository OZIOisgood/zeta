import { Injectable } from '@angular/core';

export interface EnvConfig {
  apiUrl: string;
}

let loaded = false;
let envConfig: EnvConfig = { apiUrl: '' };

export function loadEnv(): Promise<void> {
  if (loaded) return Promise.resolve();
  return fetch('/env.json')
    .then((res) => {
      if (!res.ok) throw new Error(`env.json returned ${res.status}`);
      return res.json();
    })
    .then((config: EnvConfig) => {
      envConfig = config;
      loaded = true;
    })
    .catch((err) => {
      console.error('[EnvService] Failed to load /env.json:', err);
    });
}

@Injectable({ providedIn: 'root' })
export class EnvService {
  get apiUrl(): string {
    return envConfig.apiUrl;
  }
}
