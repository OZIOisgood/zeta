import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { AccessApiClient, RedeemResponse, SignupCode } from '../../core/http/access-api.service';
import { AccessStore } from './access.store';

const redeemResponse: RedeemResponse = {
  access_status: 'active',
  role: 'athlete',
  role_upgraded: true,
};

const codes: SignupCode[] = [
  { code: 'ABC123', status: 'available' },
  { code: 'DEF456', status: 'consumed' },
];

describe('AccessStore', () => {
  it('redeems a code and records success with the response', async () => {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: AccessApiClient,
          useValue: {
            redeem: () => of(redeemResponse),
          },
        },
      ],
    });

    const store = TestBed.inject(AccessStore);

    const result = await store.redeem('ABC123');

    expect(result).toEqual(redeemResponse);
    expect(store.redeemStatus()).toBe('success');
    expect(store.redeemError()).toBeNull();
  });

  it('records an error and returns null when redeem fails', async () => {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: AccessApiClient,
          useValue: {
            redeem: () => throwError(() => new Error('Invalid code')),
          },
        },
      ],
    });

    const store = TestBed.inject(AccessStore);

    const result = await store.redeem('BAD');

    expect(result).toBeNull();
    expect(store.redeemStatus()).toBe('error');
    expect(store.redeemError()).toBe('Invalid code');
  });

  it('loads codes and marks the slice successful', async () => {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: AccessApiClient,
          useValue: {
            listCodes: () => of({ codes }),
          },
        },
      ],
    });

    const store = TestBed.inject(AccessStore);

    await store.loadCodes();

    expect(store.codes()).toEqual(codes);
    expect(store.codesSlice().status).toBe('success');
    expect(store.codesSlice().error).toBeNull();
  });
});
