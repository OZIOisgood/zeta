import { inject } from '@angular/core';
import { computed } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { firstValueFrom } from 'rxjs';
import {
  AccessApiClient,
  GroupInvitationPreview,
  RedeemResponse,
  SignupCode,
} from '../../core/http/access-api.service';
import {
  AsyncSlice,
  errorAsyncSlice,
  idleAsyncSlice,
  loadingAsyncSlice,
  successAsyncSlice,
} from '../../core/state/async-state';

type AccessState = {
  redeemError: string | null;
  redeemStatus: AsyncSlice['status'];
  redeemResult: RedeemResponse | null;
  preview: GroupInvitationPreview | null;
  previewSlice: AsyncSlice;
  codes: SignupCode[];
  codesSlice: AsyncSlice;
  successfulReferrals: number;
  referralLimit: number;
  remainingReferrals: number;
};

const initialState: AccessState = {
  redeemError: null,
  redeemStatus: 'idle',
  redeemResult: null,
  preview: null,
  previewSlice: idleAsyncSlice(),
  codes: [],
  codesSlice: idleAsyncSlice(),
  successfulReferrals: 0,
  referralLimit: 5,
  remainingReferrals: 5,
};

export const AccessStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed((store) => ({
    isSubmitting: computed(() => store.redeemStatus() === 'loading'),
    isActivated: computed(() => store.redeemStatus() === 'success'),
    role: computed(() => store.redeemResult()?.role ?? ''),
    joinedGroup: computed(() => store.redeemResult()?.group ?? null),
  })),
  withMethods((store, api = inject(AccessApiClient)) => ({
    resetRedeem(): void {
      patchState(store, { redeemError: null, redeemStatus: 'idle', redeemResult: null });
    },
    resetError(): void {
      if (store.redeemStatus() === 'error') {
        patchState(store, { redeemError: null, redeemStatus: 'idle' });
      }
    },
    async previewGroupInvitation(code: string): Promise<GroupInvitationPreview | null> {
      patchState(store, { preview: null, previewSlice: loadingAsyncSlice() });
      try {
        const preview = await firstValueFrom(api.previewGroupInvitation(code));
        patchState(store, { preview, previewSlice: successAsyncSlice() });
        return preview;
      } catch (error) {
        patchState(store, { preview: null, previewSlice: errorAsyncSlice(error) });
        return null;
      }
    },
    async redeem(code: string): Promise<RedeemResponse | null> {
      patchState(store, { redeemError: null, redeemStatus: 'loading' });
      try {
        const res = await firstValueFrom(api.redeem(code));
        patchState(store, { redeemStatus: 'success', redeemResult: res });
        return res;
      } catch (error) {
        const s = errorAsyncSlice(error);
        patchState(store, { redeemError: s.error, redeemStatus: s.status });
        return null;
      }
    },
    async loadCodes(): Promise<void> {
      patchState(store, { codesSlice: loadingAsyncSlice() });
      try {
        const response = await firstValueFrom(api.listCodes());
        patchState(store, {
          codes: response.codes,
          successfulReferrals: response.successful_referrals,
          referralLimit: response.referral_limit,
          remainingReferrals: response.remaining_referrals,
          codesSlice: successAsyncSlice(),
        });
      } catch (error) {
        patchState(store, { codesSlice: errorAsyncSlice(error) });
      }
    },
  })),
);
