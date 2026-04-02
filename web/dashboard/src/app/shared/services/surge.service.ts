import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SurgeOptions {
  method?: 'PUT' | 'POST' | 'PATCH';
  onProgress?: (event: SurgeProgressEvent) => void;
  onComplete?: (event: SurgeCompleteEvent) => void;
  onError?: (event: SurgeErrorEvent) => void;
}

export interface SurgeChunkedOptions extends SurgeOptions {
  chunkSize: number;
  retryAttempts?: number;
  retryDelay?: number;
}

export interface SurgeUpload {
  file: File;
  url: string;
  options?: SurgeOptions | SurgeChunkedOptions;
  correlationId?: string;
}

export interface SurgeStartEvent {
  type: 'start';
  correlationId: string;
}

export interface SurgeProgressEvent {
  type: 'progress';
  correlationId: string;
  loaded: number;
  total: number;
  percentage: number;
}

export interface SurgeCompleteEvent {
  type: 'complete';
  correlationId: string;
}

export interface SurgeErrorEvent {
  type: 'error';
  correlationId: string;
  message: string;
  error: unknown;
}

export type SurgeEvent =
  | SurgeStartEvent
  | SurgeProgressEvent
  | SurgeCompleteEvent
  | SurgeErrorEvent;

// ─── Defaults ────────────────────────────────────────────────────────────────

const DEFAULT_METHOD = 'PUT' as const;
const DEFAULT_RETRY_ATTEMPTS = 3;
const DEFAULT_RETRY_DELAY_MS = 1000;

// ─── Service ─────────────────────────────────────────────────────────────────

@Injectable({
  providedIn: 'root',
})
export class SurgeService {
  private readonly http = inject(HttpClient);

  upload({ file, url, options = {}, correlationId = crypto.randomUUID() }: SurgeUpload): Observable<SurgeEvent> {
    const upload$ = new BehaviorSubject<SurgeEvent>({ type: 'start', correlationId });

    if (isChunked(options)) {
      this.runChunked(file, url, options, correlationId, upload$);
    } else {
      this.runXHR(file, url, options, correlationId, upload$);
    }

    return upload$.asObservable();
  }

  private runXHR(
    file: File,
    url: string,
    options: SurgeOptions,
    correlationId: string,
    upload$: BehaviorSubject<SurgeEvent>,
  ): void {
    const xhr = new XMLHttpRequest();

    xhr.upload.onprogress = (e: ProgressEvent): void => {
      const evt: SurgeProgressEvent = {
        type: 'progress',
        correlationId,
        loaded: e.loaded,
        total: e.total,
        percentage: pct(e.loaded, e.total),
      };
      upload$.next(evt);
      options.onProgress?.(evt);
    };

    xhr.upload.onload = (): void => this.emitComplete(correlationId, options.onComplete, upload$);

    xhr.upload.onerror = (e): void =>
      this.emitError(correlationId, `Failed to upload "${file.name}"`, e, options.onError, upload$);

    xhr.open(options.method ?? DEFAULT_METHOD, url, true);
    xhr.setRequestHeader('Content-Type', file.type);
    xhr.send(file);
  }

  private runChunked(
    file: File,
    url: string,
    options: SurgeChunkedOptions,
    correlationId: string,
    upload$: BehaviorSubject<SurgeEvent>,
  ): void {
    const totalSize = file.size;
    const retryAttempts = options.retryAttempts ?? DEFAULT_RETRY_ATTEMPTS;
    const retryDelay = options.retryDelay ?? DEFAULT_RETRY_DELAY_MS;
    let offset = 0;
    let retryCount = 0;

    const uploadChunk = (): void => {
      const end = Math.min(offset + options.chunkSize, totalSize);
      const slice = file.slice(offset, end);

      this.http
        .put(url, slice, {
          headers: {
            'Content-Type': 'application/octet-stream',
            'Content-Range': `bytes ${offset}-${end - 1}/${totalSize}`,
          },
          observe: 'response',
          reportProgress: true,
        })
        .subscribe({
          next: () => {
            offset = end;
            retryCount = 0;
            this.emitProgress(correlationId, offset, totalSize, options.onProgress, upload$);

            if (offset < totalSize) {
              uploadChunk();
            } else {
              this.emitComplete(correlationId, options.onComplete, upload$);
            }
          },
          error: (err: HttpErrorResponse) => {
            // 308 Resume Incomplete — advance offset from Range header and continue
            if (err.status === 308) {
              const rangeHeader = err.headers.get('Range');

              if (rangeHeader) {
                const lastByte = rangeHeader.split('-')[1];
                if (!lastByte) {
                  this.emitError(correlationId, `Invalid Range header for "${file.name}"`, err, options.onError, upload$);
                  return;
                }
                offset = parseInt(lastByte, 10) + 1;
              } else {
                offset = end;
              }

              this.emitProgress(correlationId, offset, totalSize, options.onProgress, upload$);
              uploadChunk();
            } else if (retryCount < retryAttempts && isRetriable(err.status)) {
              retryCount++;
              setTimeout(uploadChunk, retryDelay);
            } else {
              this.emitError(correlationId, `Failed to upload "${file.name}"`, err, options.onError, upload$);
            }
          },
        });
    };

    uploadChunk();
  }

  private emitProgress(
    correlationId: string,
    loaded: number,
    total: number,
    onProgress: SurgeOptions['onProgress'],
    upload$: BehaviorSubject<SurgeEvent>,
  ): void {
    const evt: SurgeProgressEvent = { type: 'progress', correlationId, loaded, total, percentage: pct(loaded, total) };
    upload$.next(evt);
    onProgress?.(evt);
  }

  private emitComplete(
    correlationId: string,
    onComplete: SurgeOptions['onComplete'],
    upload$: BehaviorSubject<SurgeEvent>,
  ): void {
    const evt: SurgeCompleteEvent = { type: 'complete', correlationId };
    upload$.next(evt);
    upload$.complete();
    onComplete?.(evt);
  }

  private emitError(
    correlationId: string,
    message: string,
    error: unknown,
    onError: SurgeOptions['onError'],
    upload$: BehaviorSubject<SurgeEvent>,
  ): void {
    const evt: SurgeErrorEvent = { type: 'error', correlationId, message, error };
    upload$.next(evt);
    upload$.complete();
    onError?.(evt);
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isChunked(options: SurgeOptions | SurgeChunkedOptions): options is SurgeChunkedOptions {
  return 'chunkSize' in options;
}

function pct(loaded: number, total: number): number {
  return Math.round((loaded / total) * 100);
}

// Retry on network errors (status 0) or retriable HTTP errors (3xx–4xx)
function isRetriable(status: number): boolean {
  return status === 0 || (status >= 300 && status < 500);
}
