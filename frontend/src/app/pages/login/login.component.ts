import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="min-h-screen flex items-center justify-center px-4 py-12">
      <div class="w-full max-w-sm animate-slide-up">

        <div class="text-center mb-8">
          <div class="w-14 h-14 rounded-2xl bg-amber-500 flex items-center justify-center text-gray-950 text-2xl font-bold shadow-xl shadow-amber-500/25 mx-auto mb-4">
            ✦
          </div>
          <h1 class="text-2xl font-bold text-slate-900">Gold Tracker</h1>
          <p class="text-slate-500 text-sm mt-1">{{ isRegister() ? 'Create a new account' : 'Log in to your account' }}</p>
        </div>

        <div class="card">
          <!-- Tab switch -->
          <div class="flex rounded-xl bg-slate-100 p-1 mb-5">
            <button type="button" (click)="switchTab(false)"
              [class]="!isRegister() ? 'flex-1 py-2 text-sm font-medium rounded-lg bg-white shadow-sm text-slate-900 transition-all' : 'flex-1 py-2 text-sm text-slate-600 transition-all'">Login</button>
            <button type="button" (click)="switchTab(true)"
              [class]="isRegister() ? 'flex-1 py-2 text-sm font-medium rounded-lg bg-white shadow-sm text-slate-900 transition-all' : 'flex-1 py-2 text-sm text-slate-600 transition-all'">Register</button>
          </div>

          <form (ngSubmit)="submit()" #f="ngForm" class="space-y-4">
            <div>
              <label class="text-xs text-slate-600 mb-1 block">Username</label>
              <input [(ngModel)]="username" name="username" type="text"
                placeholder="Min 3 chars" class="input-field"
                autocomplete="username" #u="ngModel"
                [minlength]="isRegister() ? 3 : 1" required/>
              @if (submitted() && (!username || (isRegister() && username.length < 3))) {
                <p class="text-xs text-red-600 mt-1">
                  {{ !username ? 'Please enter username' : 'Min 3 chars' }}
                </p>
              }
            </div>

            <div>
              <label class="text-xs text-slate-600 mb-1 block">Password</label>
              <div class="relative">
                <input [(ngModel)]="password" name="password"
                  [type]="showPassword() ? 'text' : 'password'"
                  placeholder="{{ isRegister() ? 'Min 6 chars' : 'Enter password' }}"
                  class="input-field pr-10"
                  [autocomplete]="isRegister() ? 'new-password' : 'current-password'" required/>
                <button type="button" (click)="showPassword.set(!showPassword())"
                  class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700">
                  {{ showPassword() ? '🙈' : '👁' }}
                </button>
              </div>
              @if (submitted() && (!password || (isRegister() && password.length < 6))) {
                <p class="text-xs text-red-600 mt-1">
                  {{ !password ? 'Please enter password' : 'Min 6 chars' }}
                </p>
              }
            </div>

            @if (error()) {
              <div class="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600 animate-fade-in">
                {{ error() }}
              </div>
            }

            <button type="submit" [disabled]="loading()" class="btn-primary w-full">
              @if (loading()) {
                <span class="flex items-center justify-center gap-2">
                  <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  Processing...
                </span>
              } @else {
                {{ isRegister() ? 'Create account' : 'Login' }}
              }
            </button>
          </form>
        </div>

        <p class="text-center text-xs text-slate-400 mt-4">
          Your data is securely encrypted
        </p>
      </div>
    </div>
  `
})
export class LoginComponent {
  private auth = inject(AuthService);
  private router = inject(Router);

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

    const req = this.isRegister()
      ? this.auth.register(this.username, this.password)
      : this.auth.login(this.username, this.password);

    req.subscribe({
      next: () => this.router.navigate(['/portfolio']),
      error: err => {
        this.error.set(err.error?.error ?? 'An error occurred, please try again');
        this.loading.set(false);
      },
    });
  }
}
