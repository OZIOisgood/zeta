import { CommonModule } from '@angular/common';
import { Component, input, output } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { TuiButton } from '@taiga-ui/core';

@Component({
  selector: 'app-drawer',
  standalone: true,
  imports: [CommonModule, TuiButton, TranslatePipe],
  template: `
    <div class="backdrop" *ngIf="isOpen()" (click)="onBackdropClick($event)">
      <div class="drawer">
        <div class="drawer-header">
          <div class="header-title">{{ title() | translate }}</div>
          <button
            tuiIconButton
            appearance="secondary"
            iconStart="@tui.x"
            size="s"
            (click)="close.emit()"
            class="close-btn"
          ></button>
        </div>
        
        <div class="drawer-content">
          <ng-content></ng-content>
        </div>
      </div>
    </div>
  `,
  styleUrls: ['./drawer.component.scss']
})
export class DrawerComponent {
  isOpen = input.required<boolean>();
  title = input.required<string>();
  close = output<void>();

  onBackdropClick(event: MouseEvent) {
    if ((event.target as HTMLElement).classList.contains('backdrop')) {
      this.close.emit();
    }
  }
}
