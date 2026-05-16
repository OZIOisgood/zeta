import { HttpErrorResponse } from '@angular/common/http';

export type AsyncStatus = 'idle' | 'loading' | 'success' | 'error';

export type AsyncSlice = {
  status: AsyncStatus;
  error: string | null;
};

export const idleAsyncSlice = (): AsyncSlice => ({
  status: 'idle',
  error: null,
});

export const loadingAsyncSlice = (): AsyncSlice => ({
  status: 'loading',
  error: null,
});

export const successAsyncSlice = (): AsyncSlice => ({
  status: 'success',
  error: null,
});

export const errorAsyncSlice = (error: unknown): AsyncSlice => ({
  status: 'error',
  error: normalizeStoreError(error),
});

export function normalizeStoreError(error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    return error.error?.message || error.message || `Request failed with status ${error.status}`;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Request failed';
}
