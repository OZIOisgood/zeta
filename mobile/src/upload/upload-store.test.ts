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

// ── New tests ──────────────────────────────────────────────────────────────

test('duplicate filenames upload each picked file once', async () => {
  // Two videos both named 'video.mp4' — filename map would collapse them.
  // Index-based matching must pair each picked file with the right upload URL.
  const { deps, calls } = makeDeps();
  const store = createUploadStore(deps);

  const createResponse = {
    asset_id: 'asset_dup',
    videos: [
      { id: 'v1', upload_url: 'https://mux.example/u1', filename: 'video.mp4' },
      { id: 'v2', upload_url: 'https://mux.example/u2', filename: 'video.mp4' },
    ],
  };
  const picked = [
    { filename: 'video.mp4', localUri: 'file:///clip1.mp4' },
    { filename: 'video.mp4', localUri: 'file:///clip2.mp4' },
  ];

  await store.getState().enqueue(createResponse, picked, 'Dup upload');

  expect(calls).toHaveLength(2);
  const byUrl = Object.fromEntries(calls.map((c) => [c.uploadUrl, c.localUri]));
  expect(byUrl['https://mux.example/u1']).toBe('file:///clip1.mp4');
  expect(byUrl['https://mux.example/u2']).toBe('file:///clip2.mp4');
});

test('missing local uri fails pre-flight without calling the transfer', async () => {
  // The response contains a video whose filename matches nothing in picked —
  // localUri ends up ''. The upload loop must mark that file failed without
  // ever calling the transfer dependency.
  const { deps, calls } = makeDeps();
  const store = createUploadStore(deps);

  const createResponse = {
    asset_id: 'asset_missing',
    videos: [
      { id: 'v1', upload_url: 'https://mux.example/u1', filename: 'ghost.mp4' },
    ],
  };
  // picked has a different filename — so index 0 matches by index but filename
  // differs; fall back to filename lookup which also fails → localUri stays ''.
  const picked = [{ filename: 'real.mp4', localUri: 'file:///real.mp4' }];

  await store.getState().enqueue(createResponse, picked, 'Missing upload');

  expect(calls).toHaveLength(0);
  const file = store.getState().jobs[0].files[0];
  expect(file.status).toBe('failed');
});

test('retryFile during an active run is a no-op', async () => {
  // The transfer for this test awaits a manually-resolved promise so we can
  // interleave retryFile while the first run is still in flight.
  // We use a queue of notify functions; each start() call registers itself and
  // awaits a per-call latch that the test drains in sequence.
  const calls: { localUri: string; uploadUrl: string }[] = [];

  // notifyStarted[i] is called by start() as soon as it begins waiting.
  // resolveStart[i] is called by the test to unblock that start().
  const notifyStarted: (() => void)[] = [];
  const resolveStart: (() => void)[] = [];

  const deps: UploadDeps = {
    transfer: (localUri, uploadUrl, onProgress) => {
      calls.push({ localUri, uploadUrl });
      const idx = calls.length - 1;
      return {
        start: async () => {
          await new Promise<void>((res) => {
            resolveStart[idx] = res;
            // Signal that this start() is now blocked and waiting.
            notifyStarted[idx]?.();
          });
          onProgress(1);
          return { status: 200 };
        },
        cancel: async () => undefined,
      };
    },
    completeAsset: async () => undefined,
    invalidateAssets: () => undefined,
  };

  // Wire up the "started" notifications before launching.
  const startedPromises = [0, 1].map(
    (i) =>
      new Promise<void>((res) => {
        notifyStarted[i] = res;
      }),
  );

  const store = createUploadStore(deps);
  const enqueuePromise = store.getState().enqueue(CREATE_RESPONSE, PICKED, 'Guard test');

  // Wait until the first transfer's start() is actually blocked.
  await startedPromises[0];

  // Kick retryFile while the first file is still mid-transfer.
  // The re-entrancy guard must make this a no-op (returns immediately).
  await store.getState().retryFile('asset_1', 'v1');

  // Unblock the first transfer and wait for the second to start.
  resolveStart[0]();
  await startedPromises[1];

  // Unblock the second transfer.
  resolveStart[1]();
  await enqueuePromise;

  // Each file should have been transferred exactly once — no duplicates from retryFile.
  expect(calls).toHaveLength(2);
});
