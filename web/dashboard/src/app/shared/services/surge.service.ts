import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, TeardownLogic } from 'rxjs';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SurgeOptions {
  method?: 'PUT' | 'POST' | 'PATCH';
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
    const subject = new BehaviorSubject<SurgeEvent>({ type: 'start', correlationId });

    let teardown: TeardownLogic;

    if (isChunked(options)) {
      teardown = this.runChunked(file, url, options, correlationId, subject);
    } else {
      teardown = this.runXHR(file, url, options, correlationId, subject);
    }

    return new Observable<SurgeEvent>((subscriber) => {
      const sub = subject.subscribe(subscriber);
      return () => {
        sub.unsubscribe();
        if (typeof teardown === 'function') teardown();
      };
    });
  }

  private runXHR(
    file: File,
    url: string,
    options: SurgeOptions,
    correlationId: string,
    upload$: BehaviorSubject<SurgeEvent>,
  ): TeardownLogic {
    const xhr = new XMLHttpRequest();

    xhr.upload.onprogress = (e: ProgressEvent): void => {
      upload$.next({
        type: 'progress',
        correlationId,
        loaded: e.loaded,
        total: e.total,
        percentage: pct(e.loaded, e.total),
      });
    };

    // Use xhr.onload (not xhr.upload.onload) to inspect the server response status
    xhr.onload = (): void => {
      if (xhr.status >= 200 && xhr.status < 300) {
        this.emitComplete(correlationId, upload$);
      } else {
        this.emitError(correlationId, `Server returned ${xhr.status} for "${file.name}"`, xhr.statusText, upload$);
      }
    };

    xhr.onerror = (): void =>
      this.emitError(correlationId, `Failed to upload "${file.name}"`, null, upload$);

    xhr.open(options.method ?? DEFAULT_METHOD, url, true);
    xhr.setRequestHeader('Content-Type', file.type);
    xhr.send(file);

    return () => xhr.abort();
  }

  private runChunked(
    file: File,
    url: string,
    options: SurgeChunkedOptions,
    correlationId: string,
    upload$: BehaviorSubject<SurgeEvent>,
  ): TeardownLogic {
    const totalSize = file.size;
    const method = options.method ?? DEFAULT_METHOD;
    const retryAttempts = options.retryAttempts ?? DEFAULT_RETRY_ATTEMPTS;
    const retryDelay = options.retryDelay ?? DEFAULT_RETRY_DELAY_MS;
    let offset = 0;
    let retryCount = 0;
    let cancelled = false;

    const uploadChunk = (): void => {
      if (cancelled) return;

      const end = Math.min(offset + options.chunkSize, totalSize);
      const slice = file.slice(offset, end);

      this.http
        .request(method, url, {
          body: slice,
          headers: {
            'Content-Type': 'application/octet-stream',
            'Content-Range': `bytes ${offset}-${end - 1}/${totalSize}`,
          },
          observe: 'response',
          reportProgress: true,
        })
        .subscribe({
          next: () => {
            if (cancelled) return;

            offset = end;
            retryCount = 0;
            this.emitProgress(correlationId, offset, totalSize, upload$);

            if (offset < totalSize) {
              uploadChunk();
            } else {
              this.emitComplete(correlationId, upload$);
            }
          },
          error: (err: HttpErrorResponse) => {
            if (cancelled) return;

            // 308 Resume Incomplete — advance offset from Range header and continue
            if (err.status === 308) {
              const rangeHeader = err.headers.get('Range');

              if (rangeHeader) {
                const lastByte = rangeHeader.split('-')[1];
                if (!lastByte) {
                  this.emitError(correlationId, `Invalid Range header for "${file.name}"`, err, upload$);
                  return;
                }
                offset = parseInt(lastByte, 10) + 1;
              } else {
                offset = end;
              }

              this.emitProgress(correlationId, offset, totalSize, upload$);
              uploadChunk();
            } else if (retryCount < retryAttempts && isRetriable(err.status)) {
              retryCount++;
              setTimeout(uploadChunk, retryDelay);
            } else {
              this.emitError(correlationId, `Failed to upload "${file.name}"`, err, upload$);
            }
          },
        });
    };

    uploadChunk();

    return () => {
      cancelled = true;
    };
  }

  private emitProgress(
    correlationId: string,
    loaded: number,
    total: number,
    upload$: BehaviorSubject<SurgeEvent>,
  ): void {
    upload$.next({ type: 'progress', correlationId, loaded, total, percentage: pct(loaded, total) });
  }

  private emitComplete(
    correlationId: string,
    upload$: BehaviorSubject<SurgeEvent>,
  ): void {
    upload$.next({ type: 'complete', correlationId });
    upload$.complete();
  }

  private emitError(
    correlationId: string,
    message: string,
    error: unknown,
    upload$: BehaviorSubject<SurgeEvent>,
  ): void {
    upload$.next({ type: 'error', correlationId, message, error });
    upload$.complete();
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isChunked(options: SurgeOptions | SurgeChunkedOptions): options is SurgeChunkedOptions {
  return 'chunkSize' in options;
}

function pct(loaded: number, total: number): number {
  return total === 0 ? 100 : Math.round((loaded / total) * 100);
}

// Retry on network errors (0), request timeout (408), rate limiting (429), and server errors (5xx)
function isRetriable(status: number): boolean {
  return status === 0 || status === 408 || status === 429 || status >= 500;
}
