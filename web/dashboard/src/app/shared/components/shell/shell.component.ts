import { Component, effect, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { NavbarComponent } from '../navbar/navbar.component';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, NavbarComponent],
  templateUrl: './shell.component.html',
  styleUrls: ['./shell.component.scss']
})
export class ShellComponent {
  private readonly auth = inject(AuthService);

  constructor() {
     effect(() => {
      const user = this.auth.user();
      const loading = this.auth.loading();

      if (!loading && !user) {
        this.auth.login();
      }
    });
  }
}
