import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './login.component.html',
})
export class LoginComponent {
  username = '';
  password = '';
  error = false;

  constructor(private auth: AuthService, private router: Router) {
    if (auth.isLoggedIn()) {
      this.router.navigate(['/dashboard']);
    }
  }

  login() {
    if (this.auth.login(this.username, this.password)) {
      this.error = false;
      window.location.reload(); // reload to reinitialize DB with user's name
    } else {
      this.error = true;
    }
  }
}
