import { createStore } from 'zustand/vanilla';
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
};

type UploadState = {
  jobs: UploadJob[];
  enqueue: (created: CreateAssetResponse, picked: PickedFile[], title: string) => Promise<void>;
  retryFile: (jobId: string, videoId: string) => Promise<void>;
  dismissJob: (jobId: string) => void;
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

// Re-entrancy guard: tracks which job IDs are currently being processed.
// processJob returns immediately if its jobId is already in this set.
const processing = new Set<string>();

export function createUploadStore(deps: UploadDeps = defaultDeps) {
  const store = createStore<UploadState>((set, get) => {
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
          patchFile(jobId, file.videoId, { status: 'done', progress: 1 });
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

      retryFile: async (jobId, videoId) => {
        patchFile(jobId, videoId, { status: 'pending', progress: 0 });
        await processJob(jobId);
      },

      dismissJob: (jobId) => {
        set((state) => ({ jobs: state.jobs.filter((j) => j.id !== jobId) }));
      },
    };
  });

  return store;
}

export const uploadStore = createUploadStore();

export function useUploads<T>(selector: (state: UploadState) => T): T {
  return useStore(uploadStore, selector);
}
