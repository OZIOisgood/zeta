import { importProvidersFrom } from '@angular/core';
import { TranslocoTestingModule } from '@jsverse/transloco';
import type { Meta, StoryObj } from '@storybook/angular';
import { applicationConfig } from '@storybook/angular';
import { of } from 'rxjs';
import { GroupsApiClient } from '../../core/http/groups-api.service';
import { PermissionsService } from '../../core/permissions/permissions.service';
import { AppShellStore } from '../../core/state/app-shell.store';
import { GroupInvitationsSectionComponent } from './group-invitations-section.component';

const invitations = [
  {
    id: 'direct-accepted',
    code: 'QRW56QVB',
    delivery: 'email' as const,
    email: 'paschalobaryev111@gmail.com',
    status: 'accepted' as const,
    invite_url: 'http://localhost:4200/groups?invite=QRW56QVB',
    created_at: '2026-06-21T12:00:00Z',
    status_changed_at: '2026-06-21T13:00:00Z',
  },
  {
    id: 'link-pending-1',
    code: 'GPJ3Y2GF',
    delivery: 'link' as const,
    status: 'pending' as const,
    invite_url: 'http://localhost:4200/groups?invite=GPJ3Y2GF',
    created_at: '2026-06-21T12:00:00Z',
  },
  {
    id: 'link-pending-2',
    code: 'QY92265W',
    delivery: 'link' as const,
    status: 'pending' as const,
    invite_url: 'http://localhost:4200/groups?invite=QY92265W',
    created_at: '2026-06-21T12:00:00Z',
  },
];

const translations = TranslocoTestingModule.forRoot({
  langs: {
    en: {
      common: { actions: { createInvitation: 'Create invitation', retry: 'Retry' } },
      groups: {
        invitations: {
          title: 'Group invitations',
          description: 'Create, revisit, and manage invitations to this group.',
          anyone: 'Anyone with the link',
          open: 'View',
          revoke: 'Revoke',
          columns: {
            code: 'Code',
            recipient: 'Recipient',
            status: 'Status',
            actions: 'Actions',
          },
          delivery: { email: 'Direct', link: 'Reusable' },
          status: { pending: 'Pending', accepted: 'Accepted' },
          date: { created: 'Created {{date}}', accepted: 'Accepted {{date}}' },
        },
      },
    },
  },
  translocoConfig: { availableLangs: ['en'], defaultLang: 'en' },
  preloadLangs: true,
});

const meta: Meta<GroupInvitationsSectionComponent> = {
  title: 'Pages/Group Invitations',
  component: GroupInvitationsSectionComponent,
  args: { groupId: 'group-1' },
  decorators: [
    applicationConfig({
      providers: [
        importProvidersFrom(translations),
        {
          provide: GroupsApiClient,
          useValue: {
            listGroupInvitations: () => of(invitations),
            revokeGroupInvitation: () => of(undefined),
          },
        },
        { provide: PermissionsService, useValue: { hasPermission: () => true } },
        { provide: AppShellStore, useValue: { showToast: () => undefined } },
      ],
    }),
  ],
  parameters: { layout: 'padded' },
};

export default meta;
type Story = StoryObj<GroupInvitationsSectionComponent>;

export const Default: Story = {};
