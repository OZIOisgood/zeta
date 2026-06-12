import { createStore } from 'zustand/vanilla';
import { useStore } from 'zustand';
import type { components } from '../api/schema';
import { api } from '../auth/auth-store';
import { createCallEngine, type CallEngine } from './call-engine';

export type CallPhase = 'idle' | 'connecting' | 'inCall' | 'error';

export type CallDeps = {
  createEngine: typeof createCallEngine;
  fetchConnect: (groupId: string, bookingId: string) => Promise<components['schemas']['BookingConnectInfo']>;
  stopRecording: (groupId: string, bookingId: string) => void; // fire-and-forget
};

type CallState = {
  phase: CallPhase;
  remoteUid: number | null;
  micMuted: boolean;
  cameraEnabled: boolean;
  error: string | null;

  join: (groupId: string, bookingId: string) => Promise<void>;
  leave: (groupId: string, bookingId: string) => Promise<void>;
  toggleMic: () => void;
  toggleCamera: () => void;
  switchCamera: () => void;
};

const IDLE_STATE = {
  phase: 'idle' as const,
  remoteUid: null,
  micMuted: false,
  cameraEnabled: true,
  error: null,
};

const defaultDeps: CallDeps = {
  createEngine: createCallEngine,
  fetchConnect: async (groupId, bookingId) => {
    const { data, error } = await api.GET('/groups/{groupID}/coaching/bookings/{bookingID}/connect', {
      params: { path: { groupID: groupId, bookingID: bookingId } },
    });
    if (error || !data) {
      // Never include response details that could carry the token
      throw new Error('Failed to get connection info');
    }
    return data;
  },
  stopRecording: (groupId, bookingId) => {
    // fire-and-forget; the internal cleanup endpoint also stops recordings server-side
    void api
      .POST('/groups/{groupID}/coaching/bookings/{bookingID}/recording/stop', {
        params: { path: { groupID: groupId, bookingID: bookingId } },
      })
      .catch(() => {});
  },
};

export function createCallStore(deps: CallDeps = defaultDeps) {
  let engine: CallEngine | null = null;
  // Incremented on every join() and leave() call. A join callback only applies
  // its result if the generation it captured is still current; otherwise the
  // in-flight engine is torn down to avoid resource leaks.
  let generation = 0;

  return createStore<CallState>((set, get) => ({
    ...IDLE_STATE,

    join: async (groupId: string, bookingId: string) => {
      const { phase } = get();
      // Re-entrancy guard: only join when idle or in error state
      if (phase === 'connecting' || phase === 'inCall') return;

      const gen = ++generation;
      set({ phase: 'connecting', error: null });

      let connectInfo: components['schemas']['BookingConnectInfo'];
      try {
        connectInfo = await deps.fetchConnect(groupId, bookingId);
      } catch {
        if (gen === generation) {
          set({ phase: 'error', error: 'Failed to get connection info' });
        }
        return;
      }

      const newEngine = deps.createEngine({
        onRemoteUserJoined: (uid) => {
          set({ remoteUid: uid });
        },
        onRemoteUserLeft: (_uid) => {
          set({ remoteUid: null });
        },
        onError: (_message) => {
          // Never store or log the raw message — it may contain connection details.
          // Provide a generic error to the UI.
          set({ phase: 'error', error: 'A call error occurred' });
        },
      });

      try {
        // The token and appId are used only here — never assigned to state.
        await newEngine.join(
          connectInfo.app_id,
          connectInfo.channel,
          connectInfo.token,
          connectInfo.uid,
        );
      } catch {
        // Attempt cleanup — ignore secondary failures
        void newEngine.leave().catch(() => {});
        if (gen === generation) {
          set({ phase: 'error', error: 'Failed to join the call' });
        }
        return;
      }

      if (gen === generation) {
        // Generation still matches — this join is the current one.
        engine = newEngine;
        set({ phase: 'inCall' });
      } else {
        // A leave() (or newer join) happened while we were connecting.
        // Tear down the now-orphaned engine without touching store state.
        void newEngine.leave().catch(() => {});
      }
    },

    leave: async (groupId: string, bookingId: string) => {
      // Invalidate any in-flight join so it cannot apply its result.
      generation++;
      if (engine) {
        try {
          await engine.leave();
        } catch {
          // Swallow leave errors — reset state regardless
        }
        engine = null;
      }
      // Fire-and-forget: don't await, don't block UI. Wrap in try/catch so
      // even a synchronously-throwing dep cannot break leave().
      try {
        deps.stopRecording(groupId, bookingId);
      } catch {
        // Swallow — recording stop is best-effort
      }
      set({ ...IDLE_STATE });
    },

    toggleMic: () => {
      const nextMuted = !get().micMuted;
      set({ micMuted: nextMuted });
      engine?.setMicMuted(nextMuted);
    },

    toggleCamera: () => {
      const nextEnabled = !get().cameraEnabled;
      set({ cameraEnabled: nextEnabled });
      engine?.setCameraEnabled(nextEnabled);
    },

    switchCamera: () => {
      engine?.switchCamera();
    },
  }));
}

export const callStore = createCallStore();

export function useCall<T>(selector: (state: CallState) => T): T {
  return useStore(callStore, selector);
}
