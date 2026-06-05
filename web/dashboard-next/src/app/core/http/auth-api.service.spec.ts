import { HttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { EnvService } from './env.service';
import { AuthApiClient } from './auth-api.service';

describe('AuthApiClient', () => {
  it('builds the login URL from the runtime API URL', () => {
    TestBed.configureTestingModule({
      providers: [
        AuthApiClient,
        {
          provide: HttpClient,
          useValue: {},
        },
        {
          provide: EnvService,
          useValue: {
            apiUrl: 'https://api.example.test',
          },
        },
      ],
    });

    const client = TestBed.inject(AuthApiClient);

    expect(client.getLoginUrl()).toBe('https://api.example.test/auth/login');
    expect(client.getLoginUrl('/groups?invite=AbC123')).toBe(
      'https://api.example.test/auth/login?return_to=%2Fgroups%3Finvite%3DAbC123',
    );
  });
});
