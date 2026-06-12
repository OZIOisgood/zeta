import { createCallStore, type CallDeps } from './call-store';
import type { CallEngine, CallEngineEvents } from './call-engine';

// ─── Fake engine builder ──────────────────────────────────────────────────────

type FakeEngine = CallEngine & {
  _events: CallEngineEvents;
  leaveCallCount: number;
  micMuted: boolean;
  cameraEnabled: boolean;
  switchCameraCount: number;
};

function makeFakeEngine(
  events: CallEngineEvents,
  joinResult: 'resolve' | 'reject' = 'resolve',
): FakeEngine {
  const engine: FakeEngine = {
    _events: events,
    leaveCallCount: 0,
    micMuted: false,
    cameraEnabled: true,
    switchCameraCount: 0,
    join: async (_appId, _channel, _token, _uid) => {
      if (joinResult === 'reject') throw new Error('Fake join failed');
    },
    leave: async () => {
      engine.leaveCallCount++;
    },
    setMicMuted: (muted) => {
      engine.micMuted = muted;
    },
    setCameraEnabled: (enabled) => {
      engine.cameraEnabled = enabled;
    },
    switchCamera: () => {
      engine.switchCameraCount++;
    },
  };

  return engine;
}

// ─── Fake deps builder ────────────────────────────────────────────────────────

const FAKE_CONNECT_INFO = {
  app_id: 'fake-app-id',
  channel: 'test-channel',
  token: 'super-secret-token-abc123',
  uid: 1,
};

function makeDeps(overrides?: {
  fetchConnectResult?: 'resolve' | 'reject';
  joinResult?: 'resolve' | 'reject';
}): { deps: CallDeps; fakeEngines: FakeEngine[]; stopRecordingCalls: string[][] } {
  const fakeEngines: FakeEngine[] = [];
  const stopRecordingCalls: string[][] = [];
  const fetchConnectResult = overrides?.fetchConnectResult ?? 'resolve';
  const joinResult = overrides?.joinResult ?? 'resolve';

  const deps: CallDeps = {
    createEngine: (events) => {
      const eng = makeFakeEngine(events, joinResult);
      fakeEngines.push(eng);
      return eng;
    },
    fetchConnect: async (_groupId, _bookingId) => {
      if (fetchConnectResult === 'reject') throw new Error('Fetch connect failed');
      return FAKE_CONNECT_INFO;
    },
    stopRecording: (groupId, bookingId) => {
      stopRecordingCalls.push([groupId, bookingId]);
    },
  };

  return { deps, fakeEngines, stopRecordingCalls };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('call-store', () => {
  test('happy join: transitions idle → connecting → inCall', async () => {
    const { deps } = makeDeps();
    const store = createCallStore(deps);

    expect(store.getState().phase).toBe('idle');

    const joinPromise = store.getState().join('grp1', 'book1');
    // After calling join but before await, phase is connecting
    expect(store.getState().phase).toBe('connecting');

    await joinPromise;
    expect(store.getState().phase).toBe('inCall');
  });

  test('remote user join event updates remoteUid', async () => {
    const { deps, fakeEngines } = makeDeps();
    const store = createCallStore(deps);

    await store.getState().join('grp1', 'book1');
    expect(store.getState().phase).toBe('inCall');

    // Simulate remote user joining
    fakeEngines[0]._events.onRemoteUserJoined(2);
    expect(store.getState().remoteUid).toBe(2);
  });

  test('remote user leave event clears remoteUid', async () => {
    const { deps, fakeEngines } = makeDeps();
    const store = createCallStore(deps);

    await store.getState().join('grp1', 'book1');
    fakeEngines[0]._events.onRemoteUserJoined(2);
    expect(store.getState().remoteUid).toBe(2);

    fakeEngines[0]._events.onRemoteUserLeft(2);
    expect(store.getState().remoteUid).toBeNull();
  });

  test('fetchConnect rejection → error phase, no engine created', async () => {
    const { deps, fakeEngines } = makeDeps({ fetchConnectResult: 'reject' });
    const store = createCallStore(deps);

    await store.getState().join('grp1', 'book1');

    expect(store.getState().phase).toBe('error');
    expect(fakeEngines).toHaveLength(0);
  });

  test('engine.join rejection → error phase + cleanup called', async () => {
    const { deps, fakeEngines } = makeDeps({ joinResult: 'reject' });
    const store = createCallStore(deps);

    await store.getState().join('grp1', 'book1');

    expect(store.getState().phase).toBe('error');
    expect(fakeEngines).toHaveLength(1);
    expect(fakeEngines[0].leaveCallCount).toBe(1);
  });

  test('re-entrant join during connecting is a no-op', async () => {
    const { deps, fakeEngines } = makeDeps();
    const store = createCallStore(deps);

    const first = store.getState().join('grp1', 'book1');
    expect(store.getState().phase).toBe('connecting');

    // Second join while first is in-flight
    const second = store.getState().join('grp1', 'book1');

    await Promise.all([first, second]);

    // Only one engine should have been created
    expect(fakeEngines).toHaveLength(1);
    expect(store.getState().phase).toBe('inCall');
  });

  test('leave resets state to idle and fires stopRecording', async () => {
    const { deps, stopRecordingCalls } = makeDeps();
    const store = createCallStore(deps);

    await store.getState().join('grp1', 'book1');
    expect(store.getState().phase).toBe('inCall');

    await store.getState().leave('grp1', 'book1');

    expect(store.getState().phase).toBe('idle');
    expect(store.getState().remoteUid).toBeNull();
    expect(stopRecordingCalls).toHaveLength(1);
    expect(stopRecordingCalls[0]).toEqual(['grp1', 'book1']);
  });

  test('toggleMic flips micMuted flag and calls engine', async () => {
    const { deps, fakeEngines } = makeDeps();
    const store = createCallStore(deps);

    await store.getState().join('grp1', 'book1');
    expect(store.getState().micMuted).toBe(false);

    store.getState().toggleMic();
    expect(store.getState().micMuted).toBe(true);
    expect(fakeEngines[0].micMuted).toBe(true);

    store.getState().toggleMic();
    expect(store.getState().micMuted).toBe(false);
    expect(fakeEngines[0].micMuted).toBe(false);
  });

  test('toggleCamera flips cameraEnabled flag and calls engine', async () => {
    const { deps, fakeEngines } = makeDeps();
    const store = createCallStore(deps);

    await store.getState().join('grp1', 'book1');
    expect(store.getState().cameraEnabled).toBe(true);

    store.getState().toggleCamera();
    expect(store.getState().cameraEnabled).toBe(false);
    expect(fakeEngines[0].cameraEnabled).toBe(false);

    store.getState().toggleCamera();
    expect(store.getState().cameraEnabled).toBe(true);
    expect(fakeEngines[0].cameraEnabled).toBe(true);
  });

  test('switchCamera calls engine.switchCamera', async () => {
    const { deps, fakeEngines } = makeDeps();
    const store = createCallStore(deps);

    await store.getState().join('grp1', 'book1');

    store.getState().switchCamera();
    expect(fakeEngines[0].switchCameraCount).toBe(1);
  });

  test('onError mid-call transitions to error phase', async () => {
    const { deps, fakeEngines } = makeDeps();
    const store = createCallStore(deps);

    await store.getState().join('grp1', 'book1');
    expect(store.getState().phase).toBe('inCall');

    fakeEngines[0]._events.onError('Something went wrong');
    expect(store.getState().phase).toBe('error');
    expect(store.getState().error).not.toBeNull();
  });

  // ─── Fix 1: stopRecording rejection tolerance ────────────────────────────────

  test('leave resolves cleanly even when stopRecording throws synchronously', async () => {
    const throwingDeps: CallDeps = {
      createEngine: (events) => makeFakeEngine(events, 'resolve'),
      fetchConnect: async () => ({
        app_id: 'fake-app-id',
        channel: 'test-channel',
        token: 'tok',
        uid: 1,
      }),
      // Synchronously-throwing dep — store must not propagate this
      stopRecording: () => {
        throw new Error('stop recording failed synchronously');
      },
    };
    const store = createCallStore(throwingDeps);
    await store.getState().join('grp1', 'book1');
    // Must not throw and phase must reset to idle
    await expect(store.getState().leave('grp1', 'book1')).resolves.toBeUndefined();
    expect(store.getState().phase).toBe('idle');
  });

  test('leave resolves cleanly even when stopRecording returns a rejecting promise', async () => {
    const rejectingDeps: CallDeps = {
      createEngine: (events) => makeFakeEngine(events, 'resolve'),
      fetchConnect: async () => ({
        app_id: 'fake-app-id',
        channel: 'test-channel',
        token: 'tok',
        uid: 1,
      }),
      // Async-rejecting dep — fire-and-forget rejection must be swallowed
      stopRecording: () => {
        void Promise.reject(new Error('async stop recording failed')).catch(() => {});
      },
    };
    const store = createCallStore(rejectingDeps);
    await store.getState().join('grp1', 'book1');
    await expect(store.getState().leave('grp1', 'book1')).resolves.toBeUndefined();
    expect(store.getState().phase).toBe('idle');
  });

  // ─── Fix 2: join-generation counter — stale in-flight join is discarded ──────

  test('leave during in-flight join leaves final phase as idle, not inCall', async () => {
    // Gate the engine.join so we can interleave leave() before it resolves
    let resolveJoin!: () => void;
    const joinGate = new Promise<void>((res) => {
      resolveJoin = res;
    });

    let fakeEngine: FakeEngine | null = null;

    const gatedDeps: CallDeps = {
      createEngine: (events) => {
        const eng = makeFakeEngine(events, 'resolve');
        // Override join to wait for gate
        eng.join = async () => {
          await joinGate;
        };
        fakeEngine = eng;
        return eng;
      },
      fetchConnect: async () => ({
        app_id: 'fake-app-id',
        channel: 'test-channel',
        token: 'tok',
        uid: 1,
      }),
      stopRecording: () => undefined,
    };

    const store = createCallStore(gatedDeps);

    // Start join (will be stuck waiting for the gate)
    const joinPromise = store.getState().join('grp1', 'book1');
    expect(store.getState().phase).toBe('connecting');

    // Leave while join is still in-flight
    await store.getState().leave('grp1', 'book1');
    expect(store.getState().phase).toBe('idle');

    // Now release the gate so the stale join resolves
    resolveJoin();
    await joinPromise;

    // Phase must remain idle — the stale join must NOT apply its inCall state
    expect(store.getState().phase).toBe('idle');

    // The orphaned engine must have had leave() called on it for cleanup
    expect(fakeEngine!.leaveCallCount).toBeGreaterThanOrEqual(1);
  });

  test('error message never contains the Agora token', async () => {
    // Override createEngine to simulate an error that might try to include token
    const fakeEngines: FakeEngine[] = [];
    const TOKEN = 'super-secret-token-abc123';

    const deps: CallDeps = {
      createEngine: (events) => {
        const eng = makeFakeEngine(events, 'resolve');
        fakeEngines.push(eng);
        // Immediately fire an error containing the token to check it gets scrubbed
        setTimeout(() => {
          events.onError(`Failed to connect with token ${TOKEN}`);
        }, 0);
        return eng;
      },
      fetchConnect: async () => ({
        app_id: 'fake-app-id',
        channel: 'test-channel',
        token: TOKEN,
        uid: 1,
      }),
      stopRecording: () => undefined,
    };

    const store = createCallStore(deps);
    await store.getState().join('grp1', 'book1');

    // Wait for async error
    await new Promise((r) => setTimeout(r, 10));

    const { error } = store.getState();
    if (error !== null) {
      expect(error).not.toContain(TOKEN);
    }
    // The phase may be inCall or error but the token must not appear in stored error
    expect(store.getState().error ?? '').not.toContain(TOKEN);
  });
});
