import { createStore } from 'zustand/vanilla';
import { useStore } from 'zustand';
import type { components } from '../api/schema';
import { api } from '../auth/auth-store';
import { createCallEngine, type CallEngine } from './call-engine';

export type CallPhase = 'idle' | 'connecting' | 'inCall' | 'error';

/**
 * Stable error code stored in state. The screen maps each code to a localized
 * message (sessions.call.*) — the raw provider message is never stored or
 * logged because it may carry connection details (token/appId/channel).
 *
 * - `connect`: failed to fetch the booking connect info
 * - `join`:    the call engine rejected the join
 * - `engine`:  a runtime error surfaced by the engine while in the call
 */
export type CallErrorCode = 'connect' | 'engine' | 'join';

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
  error: CallErrorCode | null;

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
          set({ phase: 'error', error: 'connect' });
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
          // Store a stable code; the screen localizes it.
          set({ phase: 'error', error: 'engine' });
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
          set({ phase: 'error', error: 'join' });
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
