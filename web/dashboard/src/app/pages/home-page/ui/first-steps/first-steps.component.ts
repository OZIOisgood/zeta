import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { TuiButton, TuiIcon } from '@taiga-ui/core';

export interface FirstStep {
  title: string;
  description: string;
  completed: boolean;
  icon: string;
  actionLabel?: string;
  actionRouterLink?: string;
  disabled?: boolean;
}

@Component({
  selector: 'app-first-steps',
  standalone: true,
  imports: [CommonModule, RouterLink, TuiButton, TuiIcon, TranslatePipe],
  templateUrl: './first-steps.component.html',
  styleUrls: ['./first-steps.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FirstStepsComponent {
  @Input({ required: true }) steps: FirstStep[] = [];
}
