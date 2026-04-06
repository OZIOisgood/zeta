import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { TuiStringHandler } from '@taiga-ui/cdk';
import { TuiButton, TuiTextfield } from '@taiga-ui/core';
import { TuiAvatar, TuiChevron, TuiDataListWrapper, TuiSelect, TuiTextarea } from '@taiga-ui/kit';
import { PageContainerComponent } from '../../shared/components/page-container/page-container.component';
import { CoachingService } from '../../shared/services/coaching.service';
import { Group, GroupsService } from '../../shared/services/groups.service';

@Component({
  selector: 'app-create-coaching-session-page',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    PageContainerComponent,
    TuiButton,
    TuiTextfield,
    TuiTextarea,
    TuiSelect,
    TuiChevron,
    TuiDataListWrapper,
    TuiAvatar,
  ],
  templateUrl: './create-coaching-session-page.component.html',
  styleUrls: ['./create-coaching-session-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreateCoachingSessionPageComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly coachingService = inject(CoachingService);
  private readonly groupsService = inject(GroupsService);
  private readonly cdr = inject(ChangeDetectorRef);

  protected groups: Group[] = [];
  protected readonly submitting = signal(false);

  protected readonly durations: number[] = [30, 45, 60];

  protected readonly form = new FormGroup({
    title: new FormControl('', [
      Validators.required,
      Validators.minLength(5),
      Validators.maxLength(75),
    ]),
    description: new FormControl(''),
    group: new FormControl<Group | null>(null, Validators.required),
    scheduledDate: new FormControl('', Validators.required),
    scheduledTime: new FormControl('', Validators.required),
    duration: new FormControl<number | null>(60, Validators.required),
  });

  protected readonly groupStringify: TuiStringHandler<Group> = (item: Group) => item.name;
  protected readonly durationStringify: TuiStringHandler<number> = (value: number) =>
    `${value} minutes`;

  ngOnInit(): void {
    this.groupsService.list().subscribe((groups) => {
      this.groups = groups;
      this.cdr.markForCheck();
    });
  }

  protected onSubmit(): void {
    if (this.form.invalid || this.submitting()) return;

    const { title, description, group, scheduledDate, scheduledTime, duration } = this.form.value;

    const scheduledAt = new Date(`${scheduledDate}T${scheduledTime}`).toISOString();

    this.submitting.set(true);
    this.coachingService
      .createSession({
        title: title!,
        description: description || '',
        group_id: group!.id,
        scheduled_at: scheduledAt,
        duration_minutes: duration!,
      })
      .subscribe({
        next: () => {
          this.router.navigate(['/coaching']);
        },
        error: () => {
          this.submitting.set(false);
        },
      });
  }
}
