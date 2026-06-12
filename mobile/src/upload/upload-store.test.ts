import { createUploadStore, type UploadDeps } from './upload-store';

type TransferCall = { localUri: string; uploadUrl: string; onProgress: (f: number) => void };

function makeDeps(overrides?: Partial<{ transferStatus: number | Error; completeOk: boolean }>) {
  const calls: TransferCall[] = [];
  const invalidated: unknown[] = [];
  const completed: string[] = [];
  const transferStatus = overrides?.transferStatus ?? 200;
  const deps: UploadDeps = {
    transfer: (localUri, uploadUrl, onProgress) => {
      calls.push({ localUri, uploadUrl, onProgress });
      return {
        start: async () => {
          if (transferStatus instanceof Error) throw transferStatus;
          onProgress(0.5);
          onProgress(1);
          return { status: transferStatus };
        },
        cancel: async () => undefined,
      };
    },
    completeAsset: async (assetId: string) => {
      completed.push(assetId);
      if (overrides?.completeOk === false) throw new Error('complete failed');
    },
    invalidateAssets: () => {
      invalidated.push(true);
    },
  };
  return { deps, calls, invalidated, completed };
}

const CREATE_RESPONSE = {
  asset_id: 'asset_1',
  videos: [
    { id: 'v1', upload_url: 'https://mux.example/u1', filename: 'a.mp4' },
    { id: 'v2', upload_url: 'https://mux.example/u2', filename: 'b.mp4' },
  ],
};

const PICKED = [
  { filename: 'a.mp4', localUri: 'file:///a.mp4' },
  { filename: 'b.mp4', localUri: 'file:///b.mp4' },
];

test('enqueue uploads all files sequentially and completes the asset', async () => {
  const { deps, calls, invalidated, completed } = makeDeps();
  const store = createUploadStore(deps);
  await store.getState().enqueue(CREATE_RESPONSE, PICKED, 'My upload');

  const job = store.getState().jobs[0];
  expect(job.status).toBe('done');
  expect(job.files.every((f) => f.status === 'done' && f.progress === 1)).toBe(true);
  expect(calls.map((c) => c.uploadUrl)).toEqual(['https://mux.example/u1', 'https://mux.example/u2']);
  expect(completed).toEqual(['asset_1']);
  expect(invalidated).toHaveLength(1);
});

test('files are matched to upload urls by filename', async () => {
  const { deps, calls } = makeDeps();
  const store = createUploadStore(deps);
  await store.getState().enqueue(CREATE_RESPONSE, [PICKED[1], PICKED[0]], 'My upload');
  const byUrl = Object.fromEntries(calls.map((c) => [c.uploadUrl, c.localUri]));
  expect(byUrl['https://mux.example/u1']).toBe('file:///a.mp4');
  expect(byUrl['https://mux.example/u2']).toBe('file:///b.mp4');
});

test('a failing transfer marks file and job failed without completing', async () => {
  const { deps, completed } = makeDeps({ transferStatus: 500 });
  const store = createUploadStore(deps);
  await store.getState().enqueue(CREATE_RESPONSE, PICKED, 'My upload');
  const job = store.getState().jobs[0];
  expect(job.status).toBe('failed');
  expect(job.files[0].status).toBe('failed');
  expect(completed).toHaveLength(0);
});

test('retryFile re-runs only the failed file and finishes the job', async () => {
  const { deps, completed } = makeDeps({ transferStatus: 500 });
  const store = createUploadStore(deps);
  await store.getState().enqueue(CREATE_RESPONSE, PICKED, 'My upload');
  expect(store.getState().jobs[0].status).toBe('failed');

  // swap the transfer to succeed now
  deps.transfer = (localUri, uploadUrl, onProgress) => ({
    start: async () => {
      onProgress(1);
      return { status: 200 };
    },
    cancel: async () => undefined,
  });

  await store.getState().retryFile('asset_1', 'v1');
  // v2 never ran (sequential stop on failure) — retryFile must also pick up remaining pending files
  const job = store.getState().jobs[0];
  expect(job.status).toBe('done');
  expect(completed).toEqual(['asset_1']);
});

test('failed completion can be retried via retryFile and only re-runs completion', async () => {
  const { deps, completed } = makeDeps({ completeOk: false });
  const store = createUploadStore(deps);
  await store.getState().enqueue(CREATE_RESPONSE, PICKED, 'My upload');
  expect(store.getState().jobs[0].status).toBe('failed');
  expect(completed).toEqual(['asset_1']);

  deps.completeAsset = async (assetId: string) => {
    completed.push(assetId);
  };
  await store.getState().retryFile('asset_1', 'v1');
  expect(store.getState().jobs[0].status).toBe('done');
});

test('dismissJob removes finished jobs', async () => {
  const { deps } = makeDeps();
  const store = createUploadStore(deps);
  await store.getState().enqueue(CREATE_RESPONSE, PICKED, 'My upload');
  store.getState().dismissJob('asset_1');
  expect(store.getState().jobs).toHaveLength(0);
});
