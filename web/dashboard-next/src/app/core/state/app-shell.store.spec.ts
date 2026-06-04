import { TestBed } from '@angular/core/testing';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { AppShellStore } from './app-shell.store';

describe('AppShellStore', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [
        TranslocoTestingModule.forRoot({
          langs: {
            en: {},
            de: {},
            fr: {},
          },
          translocoConfig: {
            availableLangs: ['en', 'de', 'fr'],
            defaultLang: 'en',
            fallbackLang: 'en',
          },
          preloadLangs: true,
        }),
      ],
    });
  });

  it('exposes foundation navigation and work queue state', () => {
    const store = TestBed.inject(AppShellStore);

    expect(store.navigation().map((item) => item.id)).toEqual([
      'home',
      'videos',
      'groups',
      'sessions',
    ]);
    expect(store.openWorkCount()).toBe(3);
  });

  it('updates the active language through a store method', () => {
    const store = TestBed.inject(AppShellStore);

    store.setLanguage('de');

    expect(store.activeLanguage()).toBe('de');
    expect(store.languages().map((language) => language.value)).toEqual(['en', 'de', 'fr']);
  });

  it('controls mobile navigation state and active section', () => {
    const store = TestBed.inject(AppShellStore);

    store.toggleNavigation();
    expect(store.isNavigationOpen()).toBe(true);

    store.selectSection('videos');

    expect(store.activeSection()).toBe('videos');
    expect(store.activeNavigationItem()?.label).toBe('Videos');
    expect(store.isNavigationOpen()).toBe(false);
  });

  it('selects the main section for nested feature routes', () => {
    const store = TestBed.inject(AppShellStore);

    store.selectSectionForUrl('/asset/asset-1');
    expect(store.activeSection()).toBe('videos');

    store.selectSectionForUrl('/upload-video');
    expect(store.activeSection()).toBe('videos');

    store.selectSectionForUrl('/create-group');
    expect(store.activeSection()).toBe('groups');

    store.selectSectionForUrl('/groups/group-1/preferences/general');
    expect(store.activeSection()).toBe('groups');
  });

  it('controls user menu and toast visibility', () => {
    const store = TestBed.inject(AppShellStore);

    store.toggleUserMenu();
    store.showToast('Saved', 'Preferences updated successfully');

    expect(store.isUserMenuOpen()).toBe(true);
    expect(store.isToastVisible()).toBe(true);
    expect(store.toastTitle()).toBe('Saved');
    expect(store.toastMessage()).toBe('Preferences updated successfully');

    store.closeUserMenu();
    store.dismissToast();

    expect(store.isUserMenuOpen()).toBe(false);
    expect(store.isToastVisible()).toBe(false);
  });
});
