import { CommonModule } from '@angular/common';
import { Component, effect, inject } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { TuiIcon } from '@taiga-ui/core';
import { AuthService } from '../../services/auth.service';
import { NavbarComponent } from '../navbar/navbar.component';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [CommonModule, RouterOutlet, NavbarComponent, TuiIcon],
  templateUrl: './shell.component.html',
  styleUrls: ['./shell.component.scss'],
})
export class ShellComponent {
  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  constructor() {
    effect(() => {
      const loading = this.auth.loading();
      const unauthenticated = this.auth.unauthenticated();
      const user = this.auth.user();

      if (!loading && unauthenticated) {
        this.auth.login();
      }

      if (!loading && user) {
        const redirectPath = this.auth.consumeRedirectPath();
        if (redirectPath) {
          setTimeout(() => this.router.navigateByUrl(redirectPath));
        }
      }
    });
  }
}
