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
  });
});
