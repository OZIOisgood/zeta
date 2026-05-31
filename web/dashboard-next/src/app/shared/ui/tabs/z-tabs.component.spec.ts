import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ZTabPanelComponent } from './z-tab-panel.component';
import { ZTabsComponent } from './z-tabs.component';

@Component({
  imports: [ZTabPanelComponent, ZTabsComponent],
  template: `
    <z-tabs
      tabsId="review-tabs"
      label="Review views"
      [value]="activeTab()"
      [options]="options"
      (valueChange)="activeTab.set($event)"
    />
    <z-tab-panel tabsId="review-tabs" [value]="activeTab()">Selected content</z-tab-panel>
  `,
})
class TestHostComponent {
  readonly activeTab = signal('all');
  readonly options = [
    { value: 'all', label: 'All', badge: 3 },
    { value: 'reviewed', label: 'Reviewed' },
  ];
}

describe('ZTabsComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestHostComponent],
    }).compileComponents();
  });

  it('links tabs to the active lazy-rendered panel and changes views', async () => {
    const fixture = TestBed.createComponent(TestHostComponent);
    fixture.detectChanges();

    const tabs = fixture.nativeElement.querySelectorAll('[role="tab"]');
    expect(tabs[0].getAttribute('aria-controls')).toBe('review-tabs-panel-all');
    expect(tabs[0].getAttribute('aria-selected')).toBe('true');
    expect(tabs[0].textContent).toContain('3');

    tabs[1].click();
    await fixture.whenStable();
    fixture.detectChanges();

    const panel = fixture.nativeElement.querySelector('[role="tabpanel"]');
    expect(fixture.componentInstance.activeTab()).toBe('reviewed');
    expect(tabs[1].getAttribute('aria-selected')).toBe('true');
    expect(panel.id).toBe('review-tabs-panel-reviewed');
    expect(panel.getAttribute('aria-labelledby')).toBe('review-tabs-button-reviewed');
  });
});
