import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="min-h-screen flex items-center justify-center px-4 py-12">
      <div class="w-full max-w-sm animate-slide-up">

        <!-- Logo -->
        <div class="text-center mb-8">
          <div class="w-14 h-14 rounded-2xl bg-amber-500 flex items-center justify-center text-gray-950 text-2xl font-bold shadow-xl shadow-amber-500/25 mx-auto mb-4">
            ✦
          </div>
          <h1 class="text-2xl font-bold text-gray-100">Vàng Tracker</h1>
          <p class="text-gray-500 text-sm mt-1">{{ isRegister() ? 'Tạo tài khoản mới' : 'Đăng nhập vào tài khoản' }}</p>
        </div>

        <div class="card">
          <!-- Tab switch -->
          <div class="flex rounded-xl bg-gray-800 p-1 mb-5">
            <button (click)="isRegister.set(false)" [class]="!isRegister() ? 'flex-1 py-2 text-sm font-medium rounded-lg bg-gray-700 text-gray-100 transition-all' : 'flex-1 py-2 text-sm text-gray-400 transition-all'">
              Đăng nhập
            </button>
            <button (click)="isRegister.set(true)" [class]="isRegister() ? 'flex-1 py-2 text-sm font-medium rounded-lg bg-gray-700 text-gray-100 transition-all' : 'flex-1 py-2 text-sm text-gray-400 transition-all'">
              Đăng ký
            </button>
          </div>

          <form (ngSubmit)="submit()" class="space-y-4">
            <div>
              <label class="text-xs text-gray-400 mb-1 block">Tên đăng nhập</label>
              <input [(ngModel)]="username" name="username" type="text"
                placeholder="Nhập tên đăng nhập" class="input-field" required
                autocomplete="username"/>
            </div>
            <div>
              <label class="text-xs text-gray-400 mb-1 block">Mật khẩu</label>
              <input [(ngModel)]="password" name="password" type="password"
                placeholder="{{ isRegister() ? 'Tối thiểu 6 ký tự' : 'Nhập mật khẩu' }}" class="input-field" required
                autocomplete="{{ isRegister() ? 'new-password' : 'current-password' }}"/>
            </div>

            @if (error()) {
              <div class="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-sm text-red-400 animate-fade-in">
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
                  Đang xử lý...
                </span>
              } @else {
                {{ isRegister() ? 'Tạo tài khoản' : 'Đăng nhập' }}
              }
            </button>
          </form>
        </div>

        <p class="text-center text-xs text-gray-600 mt-4">
          Dữ liệu của bạn được mã hóa và bảo mật an toàn
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

  submit() {
    if (!this.username || !this.password) return;
    this.loading.set(true);
    this.error.set('');

    const req = this.isRegister()
      ? this.auth.register(this.username, this.password)
      : this.auth.login(this.username, this.password);

    req.subscribe({
      next: () => this.router.navigate(['/portfolio']),
      error: err => {
        this.error.set(err.error?.error ?? 'Đã xảy ra lỗi, vui lòng thử lại');
        this.loading.set(false);
      },
    });
  }
}
