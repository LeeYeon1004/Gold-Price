import { Component, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  template: `
    <nav class="sticky top-0 z-50 bg-slate-50/80 backdrop-blur-md border-b border-slate-200">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex items-center justify-between h-16">

          <!-- Logo -->
          <a routerLink="/" class="flex items-center gap-2.5 group">
            <div class="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center text-gray-950 font-bold text-sm shadow-lg shadow-amber-500/25 group-hover:scale-110 transition-transform">
              ✦
            </div>
            <span class="font-bold text-lg tracking-tight">
              <span class="text-blue-700">Gold</span>
              <span class="text-slate-700">Tracker</span>
            </span>
          </a>

          <!-- Desktop nav -->
          <div class="hidden sm:flex items-center gap-1">
            <a routerLink="/" routerLinkActive="bg-slate-100 text-blue-700" [routerLinkActiveOptions]="{exact:true}"
               class="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-all duration-150">Prices</a>
            <a routerLink="/portfolio" routerLinkActive="bg-slate-100 text-blue-700"
               class="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-all duration-150">Portfolio</a>
          </div>

          <!-- User menu -->
          <div class="flex items-center gap-3">
            @if (auth.isLoggedIn()) {
              <div class="hidden sm:flex items-center gap-2">
                <div class="w-7 h-7 rounded-full bg-amber-100 border border-amber-500/40 flex items-center justify-center text-blue-700 text-xs font-bold">
                  {{ auth.user()?.username?.charAt(0)?.toUpperCase() }}
                </div>
                <span class="text-sm text-slate-600">{{ auth.user()?.username }}</span>
              </div>
              <button (click)="auth.logout()" class="btn-secondary text-sm px-3 py-1.5">Logout</button>
            } @else {
              <a routerLink="/login" class="btn-primary text-sm px-4 py-2">Login</a>
            }

            <!-- Mobile menu toggle -->
            <button (click)="mobileOpen.set(!mobileOpen())" class="sm:hidden p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" [attr.d]="mobileOpen() ? 'M6 18L18 6M6 6l12 12' : 'M4 6h16M4 12h16M4 18h16'"/>
              </svg>
            </button>
          </div>
        </div>
      </div>

      <!-- Mobile menu -->
      @if (mobileOpen()) {
        <div class="sm:hidden border-t border-slate-200 bg-slate-50 animate-fade-in">
          <div class="px-4 py-3 space-y-1">
            <a routerLink="/" routerLinkActive="text-blue-700 bg-slate-100" [routerLinkActiveOptions]="{exact:true}"
               (click)="mobileOpen.set(false)"
               class="block px-4 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100">Prices</a>
            <a routerLink="/portfolio" routerLinkActive="text-blue-700 bg-slate-100"
               (click)="mobileOpen.set(false)"
               class="block px-4 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100">Portfolio</a>
            @if (auth.isLoggedIn()) {
              <div class="pt-2 border-t border-slate-200 flex items-center justify-between">
                <span class="text-sm text-slate-500">{{ auth.user()?.username }}</span>
                <button (click)="auth.logout()" class="text-sm text-red-600 hover:text-red-500">Logout</button>
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
