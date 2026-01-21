import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { TuiButton } from '@taiga-ui/core';
import { CounterService } from '../shared/services/counter.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, TuiButton],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {
  private counterService = inject(CounterService);

  count = signal(0);
  loading = signal(false);
  error = signal<string | null>(null);

  ngOnInit() {
    this.fetchCounter();
  }

  fetchCounter() {
    this.loading.set(true);
    this.counterService.get().subscribe({
        next: (res) => {
            this.count.set(res.value);
            this.loading.set(false);
        },
        error: () => {
            this.error.set('Failed to load counter');
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
        },
        error: () => {
            this.error.set('Failed to increment');
            this.loading.set(false);
        }
    });
  }
}
