import { TestBed } from '@angular/core/testing';
import { AppShellStore } from './app-shell.store';

describe('AppShellStore', () => {
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

    store.setLanguage('en');

    expect(store.activeLanguage()).toBe('en');
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

  it('controls user menu and toast visibility', () => {
    const store = TestBed.inject(AppShellStore);

    store.toggleUserMenu();
    store.dismissToast();

    expect(store.isUserMenuOpen()).toBe(true);
    expect(store.isToastVisible()).toBe(false);

    store.closeUserMenu();

    expect(store.isUserMenuOpen()).toBe(false);
  });
});
