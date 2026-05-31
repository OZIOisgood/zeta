import { Component, input } from '@angular/core';

@Component({
  selector: 'z-tab-panel',
  template: `<ng-content />`,
  host: {
    role: 'tabpanel',
    tabindex: '0',
    class: 'block outline-none',
    '[id]': 'panelId()',
    '[attr.aria-labelledby]': 'buttonId()',
  },
})
export class ZTabPanelComponent {
  readonly tabsId = input.required<string>();
  readonly value = input.required<string>();

  protected panelId(): string {
    return `${this.tabsId()}-panel-${this.value()}`;
  }

  protected buttonId(): string {
    return `${this.tabsId()}-button-${this.value()}`;
  }
}
