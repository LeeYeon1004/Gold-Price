import { Injectable, signal, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { User } from '../models/gold.model';
import { ApiService } from './api.service';
import { tap } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private api = inject(ApiService);
  private router = inject(Router);

  private _user = signal<User | null>(this.loadUser());
  readonly user = this._user.asReadonly();
  readonly isLoggedIn = computed(() => !!this._user());

  private loadUser(): User | null {
    try {
      const u = localStorage.getItem('user');
      return u ? JSON.parse(u) : null;
    } catch { return null; }
  }

  login(username: string, password: string) {
    return this.api.login(username, password).pipe(
      tap(res => this.saveSession(res.token, res.user))
    );
  }

  register(username: string, password: string) {
    return this.api.register(username, password).pipe(
      tap(res => this.saveSession(res.token, res.user))
    );
  }

  private saveSession(token: string, user: User) {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    this._user.set(user);
  }

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    this._user.set(null);
    this.router.navigate(['/login']);
  }
}
