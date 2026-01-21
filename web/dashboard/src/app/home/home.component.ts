import { CommonModule } from '@angular/common';
import { Component, effect, inject, signal } from '@angular/core';
import { TuiButton } from '@taiga-ui/core';
import { AuthService } from '../shared/services/auth.service';
import { CounterService } from '../shared/services/counter.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, TuiButton],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent {
  private counterService = inject(CounterService);
  public auth = inject(AuthService);

  count = signal(0);
  loading = signal(false);
  error = signal<string | null>(null);

  constructor() {
    // When user logs in, fetch counter. 
    effect(() => {
        if (this.auth.user()) {
            this.fetchCounter();
        } else if (!this.auth.loading() && !this.auth.user()) {
            // If unauthenticated, we might want to clear or show 0?
            // The API requires auth now, so we can't fetch.
            // But if we want to show public "view read only" we'd need to change backend.
            // Requirement: "/counter ... require authenticated session".
            // So we can't fetch.
            this.count.set(0);
        }
    });
  }

  fetchCounter() {
    this.loading.set(true);
    this.counterService.get().subscribe({
        next: (res) => {
            this.count.set(res.value);
            this.loading.set(false);
            this.error.set(null);
        },
        error: () => {
             // If 401, error will trigger.
            this.error.set('Failed to load counter (Unauthorized?)');
            this.loading.set(false);
        }
    });
  }

  increment() {
    this.loading.set(true);
    this.counterService.increment().subscribe({
        next: (res) => {
            this.count.set(res.value);
            this.loading.set(false);
            this.error.set(null);
        },
        error: () => {
            this.error.set('Failed to increment');
            this.loading.set(false);
        }
    });
  }
}
