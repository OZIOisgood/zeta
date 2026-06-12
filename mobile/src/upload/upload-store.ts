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
      patchFile(jobId, file.videoId, { status: 'uploading', progress: 0 });
      try {
        const handle = deps.transfer(file.localUri, file.uploadUrl, (fraction) => {
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
    }

    return {
      jobs: [],

      enqueue: async (created, picked, title) => {
        const byFilename = new Map(picked.map((p) => [p.filename, p.localUri]));
        const files: UploadFileState[] = created.videos.map((v) => ({
          videoId: v.id,
          uploadUrl: v.upload_url,
          localUri: byFilename.get(v.filename) ?? '',
          filename: v.filename,
          progress: 0,
          status: 'pending',
        }));
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
