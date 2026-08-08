import { useMutation } from '@tanstack/react-query';
import type { components } from '../schema';
import { api } from '../../auth/auth-store';

export type RedeemResponse = components['schemas']['RedeemResponse'];

type Poster = Pick<typeof api, 'POST'>;

/**
 * Redeems an invite code for the signed-in user.
 *
 * POST /access/redeem is deliberately mounted OUTSIDE RequireActiveAccess — it
 * is the only feature call a waitlisted user may make, and therefore the only
 * way out of the waitlist state. Codes are normalized server-side, so the raw
 * user input is sent as typed.
 */
export function useRedeemAccessMutation(client: Poster = api) {
  return useMutation({
    mutationFn: async (code: string) => {
      const { data, error } = await (client as typeof api).POST('/access/redeem', {
        body: { code },
      });
      if (error || !data) throw new Error('Failed to redeem access code');
      return data;
    },
  });
}
