import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
})
export class LoginComponent implements OnInit {
  private auth = inject(AuthService);
  private router = inject(Router);

  ngOnInit() {
    if (this.auth.isLoggedIn()) {
      this.router.navigate(['/']);
    }
  }

  username = '';
  password = '';
  isRegister = signal(false);
  loading = signal(false);
  error = signal('');
  submitted = signal(false);
  showPassword = signal(false);

  switchTab(register: boolean) {
    this.isRegister.set(register);
    this.error.set('');
    this.submitted.set(false);
    this.username = '';
    this.password = '';
  }

  submit() {
    this.submitted.set(true);
    this.error.set('');

    if (!this.username || !this.password) return;
    if (this.isRegister() && this.username.length < 3) return;
    if (this.isRegister() && this.password.length < 6) return;

    this.loading.set(true);
    const normalizedUsername = this.username.trim().toLowerCase();

    const req = this.isRegister()
      ? this.auth.register(normalizedUsername, this.password)
      : this.auth.login(normalizedUsername, this.password);

    req.subscribe({
      next: () => this.router.navigate(['/']),
      error: err => {
        this.error.set(err.error?.error ?? 'An error occurred, please try again');
        this.loading.set(false);
      },
    });
  }
}
