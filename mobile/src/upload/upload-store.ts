import { createStore, type StoreApi } from 'zustand/vanilla';
import { persist, createJSONStorage, type StateStorage } from 'zustand/middleware';
import { useStore } from 'zustand';
import type { components } from '../api/schema';
import { api } from '../auth/auth-store';
import { queryClient } from '../api/query-client';
import { createFileTransfer, type TransferHandle } from './file-transfer';

type CreateAssetResponse = components['schemas']['CreateAssetResponse'];

export type PickedFile = { filename: string; localUri: string };

export type UploadFileState = {
  videoId: string;
  uploadUrl: string;
  localUri: string;
  filename: string;
  progress: number; // 0..1
  status: 'pending' | 'uploading' | 'done' | 'failed';
};

export type UploadJob = {
  id: string; // asset id
  title: string;
  files: UploadFileState[];
  status: 'uploading' | 'completing' | 'done' | 'failed';
};

export type UploadDeps = {
  transfer: (
    localUri: string,
    uploadUrl: string,
    onProgress: (fraction: number) => void,
  ) => TransferHandle;
  completeAsset: (assetId: string) => Promise<void>;
  invalidateAssets: () => void;
  storage?: StateStorage;
};

type UploadState = {
  jobs: UploadJob[];
  enqueue: (created: CreateAssetResponse, picked: PickedFile[], title: string) => Promise<void>;
  retryFile: (jobId: string, videoId: string) => Promise<void>;
  dismissJob: (jobId: string) => void;
};

/** Store type when persist middleware is applied. Exposes `store.persist.*`. */
export type PersistedUploadStore = StoreApi<UploadState> & {
  persist: {
    rehydrate: () => Promise<void> | void;
    hasHydrated: () => boolean;
    onHydrate: (fn: (state: UploadState) => void) => () => void;
    onFinishHydration: (fn: (state: UploadState) => void) => () => void;
    setOptions: (options: Partial<{ name: string }>) => void;
    clearStorage: () => void;
    getOptions: () => object;
  };
};

const defaultDeps: UploadDeps = {
  transfer: createFileTransfer,
  completeAsset: async (assetId) => {
    const { error } = await api.POST('/assets/{id}/complete', {
      params: { path: { id: assetId } },
    });
    if (error) throw new Error('Completing the upload failed');
  },
  invalidateAssets: () => {
    void queryClient.invalidateQueries({ queryKey: ['assets'] });
  },
};

/**
 * Sanitize jobs loaded from persisted storage.
 * - Drops jobs that are already 'done' (no point showing them after restart).
 * - Marks all remaining jobs and their in-flight files as 'failed' so the user
 *   can retry them (upload URLs remain valid for hours).
 * - Files that already reached 'done' keep that status so only remaining files
 *   need to be re-uploaded on retry.
 */
export function sanitizeJobs(jobs: UploadJob[]): UploadJob[] {
  return jobs
    .filter((j) => j.status !== 'done')
    .map((j) => ({
      ...j,
      status: 'failed' as const,
      files: j.files.map((f) =>
        f.status === 'done' ? f : { ...f, status: 'failed' as const },
      ),
    }));
}

/**
 * Build the state creator function shared by both plain and persisted stores.
 * The `deps` closure is captured here so both code paths use the same logic.
 */
function buildStateCreator(deps: UploadDeps) {
  // Re-entrancy guard: tracks which job IDs are currently being processed.
  // processJob returns immediately if its jobId is already in this set.
  // Scoped per store instance so independent stores (tests, hot reload)
  // never block each other on identical job IDs.
  const processing = new Set<string>();

  return (
    set: (partial: UploadState | Partial<UploadState> | ((s: UploadState) => UploadState | Partial<UploadState>)) => void,
    get: () => UploadState,
  ): UploadState => {
    function patchFile(jobId: string, videoId: string, patch: Partial<UploadFileState>) {
      set((state) => ({
        jobs: state.jobs.map((j) =>
          j.id === jobId
            ? { ...j, files: j.files.map((f) => (f.videoId === videoId ? { ...f, ...patch } : f)) }
            : j,
        ),
      }));
    }

    function patchJob(jobId: string, patch: Partial<UploadJob>) {
      set((state) => ({
        jobs: state.jobs.map((j) => (j.id === jobId ? { ...j, ...patch } : j)),
      }));
    }

    async function uploadOne(jobId: string, file: UploadFileState): Promise<boolean> {
      // Pre-flight: a blank localUri means the file could not be matched to a
      // picked file — fail immediately without calling the transfer.
      if (file.localUri === '') {
        patchFile(jobId, file.videoId, { status: 'failed' });
        return false;
      }

      patchFile(jobId, file.videoId, { status: 'uploading', progress: 0 });
      try {
        const handle = deps.transfer(file.localUri, file.uploadUrl, (fraction) => {
          // Terminal-state progress guard: ignore stale callbacks once the file
          // has already reached a final state (done or failed).
          const currentJob = get().jobs.find((j) => j.id === jobId);
          const currentFile = currentJob?.files.find((f) => f.videoId === file.videoId);
          if (currentFile?.status === 'done' || currentFile?.status === 'failed') return;
          patchFile(jobId, file.videoId, { progress: fraction });
        });
        const { status } = await handle.start();
        if (status >= 200 && status < 300) {
          // Drop the consumed capability URL: the queue is persisted to
          // unencrypted AsyncStorage, so only files that may still need a
          // retry keep their (time-limited) Mux upload URL around.
          patchFile(jobId, file.videoId, { status: 'done', progress: 1, uploadUrl: '' });
          return true;
        }
      } catch {
        // fall through to failure
      }
      patchFile(jobId, file.videoId, { status: 'failed' });
      return false;
    }

    async function processJob(jobId: string): Promise<void> {
      // Re-entrancy guard: if this job is already being processed (e.g. a
      // retryFile call arrives while a transfer is still in flight), return
      // immediately so we don't create duplicate transfers.
      if (processing.has(jobId)) return;
      processing.add(jobId);

      try {
        patchJob(jobId, { status: 'uploading' });

        // Collect videoIds upfront, but read file state fresh each iteration so
        // retryFile correctly skips files already marked done.
        const job = get().jobs.find((j) => j.id === jobId);
        const videoIds = job?.files.map((f) => f.videoId) ?? [];

        for (const videoId of videoIds) {
          // Re-read current file state so we skip already-done files.
          const currentJob = get().jobs.find((j) => j.id === jobId);
          const file = currentJob?.files.find((f) => f.videoId === videoId);
          if (!file || file.status === 'done') continue;
          const ok = await uploadOne(jobId, file);
          if (!ok) {
            patchJob(jobId, { status: 'failed' });
            return;
          }
        }

        patchJob(jobId, { status: 'completing' });
        try {
          await deps.completeAsset(jobId);
        } catch {
          patchJob(jobId, { status: 'failed' });
          return;
        }
        patchJob(jobId, { status: 'done' });
        deps.invalidateAssets();
      } finally {
        processing.delete(jobId);
      }
    }

    return {
      jobs: [],

      enqueue: async (created, picked, title) => {
        // The backend creates one video + upload URL per `filenames` entry IN
        // ORDER (see internal/assets/handler.go, the per-filename Mux upload
        // creation loop). Match created.videos[i] to picked[i] by index.
        // Filename-based lookup is kept as a fallback for the case where the
        // order contract is violated; if that also fails, localUri is '' and
        // the pre-flight check in uploadOne will mark the file failed.
        const byFilename = new Map(picked.map((p) => [p.filename, p.localUri]));
        const files: UploadFileState[] = created.videos.map((v, i) => {
          const indexMatch = picked[i];
          let localUri: string;
          if (indexMatch && indexMatch.filename === v.filename) {
            // Happy path: order contract holds.
            localUri = indexMatch.localUri;
          } else {
            // Fallback: filename lookup (e.g. if server reorders).
            localUri = byFilename.get(v.filename) ?? '';
          }
          return {
            videoId: v.id,
            uploadUrl: v.upload_url,
            localUri,
            filename: v.filename,
            progress: 0,
            status: 'pending' as const,
          };
        });
        set((state) => ({
          jobs: [...state.jobs, { id: created.asset_id, title, files, status: 'uploading' }],
        }));
        await processJob(created.asset_id);
      },

      // Resets one file, but processJob re-attempts every non-done file in
      // the job (and re-runs completion) — retrying a single file therefore
      // drags the rest of its failed siblings along. That is intentional:
      // a job only succeeds when all parts are uploaded.
      retryFile: async (jobId, videoId) => {
        patchFile(jobId, videoId, { status: 'pending', progress: 0 });
        await processJob(jobId);
      },

      dismissJob: (jobId) => {
        set((state) => ({ jobs: state.jobs.filter((j) => j.id !== jobId) }));
      },
    };
  };
}

export function createUploadStore(deps: UploadDeps = defaultDeps): StoreApi<UploadState> {
  if (deps.storage) {
    // When a storage backend is provided, wrap with persist middleware so the
    // queue survives app restarts. Interrupted uploads are sanitized to 'failed'
    // on rehydration so the user can retry them.
    const store = createStore<UploadState>()(
      persist(
        buildStateCreator(deps) as Parameters<typeof persist<UploadState>>[0],
        {
          name: 'zeta.uploadQueue',
          storage: createJSONStorage(() => deps.storage!),
          partialize: (s) => ({ jobs: s.jobs }) as Pick<UploadState, 'jobs'>,
          merge: (persisted, current) => {
            if (persisted == null) return current;
            const rehydrated = sanitizeJobs((persisted as { jobs?: UploadJob[] })?.jobs ?? []);
            // Keep any in-flight jobs that arrived before rehydration completed.
            const rehydratedIds = new Set(rehydrated.map((j) => j.id));
            const fresh = current.jobs.filter((j) => !rehydratedIds.has(j.id));
            return { ...current, jobs: [...rehydrated, ...fresh] };
          },
        },
      ),
    );
    return store as unknown as PersistedUploadStore;
  }

  // No storage provided: plain store without persistence.
  // All existing tests that don't pass a storage dep hit this path unchanged.
  return createStore<UploadState>(buildStateCreator(deps));
}

export const uploadStore = (() => {
  // Lazily require AsyncStorage only when creating the singleton so that jest
  // tests not using storage never touch the native module.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const AsyncStorage = require('@react-native-async-storage/async-storage').default as StateStorage;
  return createUploadStore({ ...defaultDeps, storage: AsyncStorage });
})();

export function useUploads<T>(selector: (state: UploadState) => T): T {
  return useStore(uploadStore, selector);
}
