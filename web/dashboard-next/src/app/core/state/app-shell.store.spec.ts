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
});
