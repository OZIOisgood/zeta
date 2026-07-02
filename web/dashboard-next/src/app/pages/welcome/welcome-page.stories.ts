import { importProvidersFrom, signal } from '@angular/core';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { TranslocoTestingModule } from '@jsverse/transloco';
import type { Meta, StoryObj } from '@storybook/angular';
import { applicationConfig } from '@storybook/angular';
import { AccessStore } from '../../features/access/access.store';
import { SessionStore } from '../../features/session/session.store';
import { WelcomePageComponent } from './welcome-page.component';

const redeemStatus = signal<'idle' | 'loading' | 'error' | 'success'>('idle');
const accessStub = {
  redeemStatus,
  previewSlice: signal({ status: 'idle', error: null }),
  preview: signal(null),
  isSubmitting: () => redeemStatus() === 'loading',
  isActivated: () => redeemStatus() === 'success',
  role: () => '',
  joinedGroup: () => null,
  resetRedeem: () => redeemStatus.set('idle'),
  resetError: () => undefined,
  previewGroupInvitation: async () => null,
  redeem: async () => null,
};
const sessionStub = {
  user: signal({ language: 'en' }),
  logout: () => undefined,
  loadCurrentUser: async () => undefined,
};
const translocoTestingModule = TranslocoTestingModule.forRoot({
  langs: {
    en: {
      app: { tagline: 'Video Coaching' },
      common: { legal: { imprint: 'Imprint', privacy: 'Privacy' } },
      access: {
        welcome: {
          brandHeadline: 'Get better, video by video.',
          brandSubline: 'Upload your training and get precise feedback from real experts.',
          eyebrowWaitlist: 'Early access',
          waitlistTitle: "You're on the waitlist.",
          waitlistBody:
            "We'll let you know when access opens up. Already have a code from an expert or coach? You can enter right away.",
          enterCode: 'Enter invite code',
          signOut: 'Sign out',
          back: 'Back',
          eyebrowCode: 'Invite code',
          codeTitle: 'Almost there.',
          codeBody: 'Enter the 8-character code from your invitation to activate your account.',
          codeLabel: 'Enter your 8-character code',
          codeHint: "Codes are 8 characters — letter case doesn't matter.",
          errorIncomplete: 'Please enter your full code.',
          errorInvalid: 'This code is invalid, unavailable, or has already been used.',
          activating: 'Activating…',
          activate: 'Activate account',
          noCode: "Didn't get a code?",
        },
      },
    },
  },
  translocoConfig: { availableLangs: ['en'], defaultLang: 'en' },
  preloadLangs: true,
});

const meta: Meta<WelcomePageComponent> = {
  title: 'Pages/Welcome Access',
  component: WelcomePageComponent,
  parameters: { layout: 'fullscreen' },
  decorators: [
    applicationConfig({
      providers: [
        importProvidersFrom(translocoTestingModule),
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParamMap: convertToParamMap({}) } },
        },
        { provide: AccessStore, useValue: accessStub },
        { provide: SessionStore, useValue: sessionStub },
      ],
    }),
  ],
};

export default meta;
type Story = StoryObj<WelcomePageComponent>;

export const Waitlist: Story = {};
