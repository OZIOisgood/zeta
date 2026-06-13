import { inject } from '@angular/core';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import { firstValueFrom } from 'rxjs';
import { AccessApiClient, RedeemResponse, SignupCode } from '../../core/http/access-api.service';
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
  codes: SignupCode[];
  codesSlice: AsyncSlice;
};

const initialState: AccessState = {
  redeemError: null,
  redeemStatus: 'idle',
  codes: [],
  codesSlice: idleAsyncSlice(),
};

export const AccessStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withMethods((store, api = inject(AccessApiClient)) => ({
    async redeem(code: string): Promise<RedeemResponse | null> {
      patchState(store, { redeemError: null, redeemStatus: 'loading' });
      try {
        const res = await firstValueFrom(api.redeem(code));
        patchState(store, { redeemStatus: 'success' });
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
        const { codes } = await firstValueFrom(api.listCodes());
        patchState(store, { codes, codesSlice: successAsyncSlice() });
      } catch (error) {
        patchState(store, { codesSlice: errorAsyncSlice(error) });
      }
    },
    async generateCodes(count: number): Promise<boolean> {
      try {
        await firstValueFrom(api.generateCodes(count));
        await this.loadCodes();
        return true;
      } catch {
        return false;
      }
    },
  })),
);
