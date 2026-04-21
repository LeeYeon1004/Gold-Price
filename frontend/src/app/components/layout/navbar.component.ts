import { Component, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  template: `
    <nav class="sticky top-0 z-50 bg-gray-950/80 backdrop-blur-md border-b border-gray-800">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex items-center justify-between h-16">

          <!-- Logo -->
          <a routerLink="/" class="flex items-center gap-2.5 group">
            <div class="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center text-gray-950 font-bold text-sm shadow-lg shadow-amber-500/25 group-hover:scale-110 transition-transform">
              ✦
            </div>
            <span class="font-bold text-lg tracking-tight">
              <span class="text-amber-400">Vàng</span>
              <span class="text-gray-300">Tracker</span>
            </span>
          </a>

          <!-- Desktop nav -->
          <div class="hidden sm:flex items-center gap-1">
            <a routerLink="/" routerLinkActive="bg-gray-800 text-amber-400" [routerLinkActiveOptions]="{exact:true}"
               class="px-4 py-2 rounded-xl text-sm font-medium text-gray-400 hover:text-gray-100 hover:bg-gray-800 transition-all duration-150">
              Bảng giá
            </a>
            <a routerLink="/portfolio" routerLinkActive="bg-gray-800 text-amber-400"
               class="px-4 py-2 rounded-xl text-sm font-medium text-gray-400 hover:text-gray-100 hover:bg-gray-800 transition-all duration-150">
              Danh mục
            </a>
          </div>

          <!-- User menu -->
          <div class="flex items-center gap-3">
            @if (auth.isLoggedIn()) {
              <div class="hidden sm:flex items-center gap-2">
                <div class="w-7 h-7 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 text-xs font-bold">
                  {{ auth.user()?.username?.charAt(0)?.toUpperCase() }}
                </div>
                <span class="text-sm text-gray-400">{{ auth.user()?.username }}</span>
              </div>
              <button (click)="auth.logout()" class="btn-secondary text-sm px-3 py-1.5">
                Đăng xuất
              </button>
            } @else {
              <a routerLink="/login" class="btn-primary text-sm px-4 py-2">
                Đăng nhập
              </a>
            }

            <!-- Mobile menu toggle -->
            <button (click)="mobileOpen.set(!mobileOpen())" class="sm:hidden p-2 rounded-lg text-gray-400 hover:text-gray-100 hover:bg-gray-800">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" [attr.d]="mobileOpen() ? 'M6 18L18 6M6 6l12 12' : 'M4 6h16M4 12h16M4 18h16'"/>
              </svg>
            </button>
          </div>
        </div>
      </div>

      <!-- Mobile menu -->
      @if (mobileOpen()) {
        <div class="sm:hidden border-t border-gray-800 bg-gray-950 animate-fade-in">
          <div class="px-4 py-3 space-y-1">
            <a routerLink="/" routerLinkActive="text-amber-400 bg-gray-800" [routerLinkActiveOptions]="{exact:true}"
               (click)="mobileOpen.set(false)"
               class="block px-4 py-2.5 rounded-xl text-sm font-medium text-gray-400 hover:text-gray-100 hover:bg-gray-800">
              Bảng giá
            </a>
            <a routerLink="/portfolio" routerLinkActive="text-amber-400 bg-gray-800"
               (click)="mobileOpen.set(false)"
               class="block px-4 py-2.5 rounded-xl text-sm font-medium text-gray-400 hover:text-gray-100 hover:bg-gray-800">
              Danh mục
            </a>
            @if (auth.isLoggedIn()) {
              <div class="pt-2 border-t border-gray-800 flex items-center justify-between">
                <span class="text-sm text-gray-500">{{ auth.user()?.username }}</span>
                <button (click)="auth.logout()" class="text-sm text-red-400 hover:text-red-300">Đăng xuất</button>
              </div>
            }
          </div>
        </div>
      }
    </nav>
  `
})
export class NavbarComponent {
  auth = inject(AuthService);
  mobileOpen = signal(false);
}
