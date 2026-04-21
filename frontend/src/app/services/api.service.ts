import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { GoldRate, GoldChartData, PortfolioItem, PortfolioSummary, User } from '../models/gold.model';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);
  private base = environment.apiUrl;

  private authHeader(): HttpHeaders {
    const token = localStorage.getItem('token');
    return token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : new HttpHeaders();
  }

  // --- Gold ---
  getRates(): Observable<{ data: GoldRate[]; fetched_at: string }> {
    return this.http.get<any>(`${this.base}/gold/rates`);
  }

  getChart(code?: string): Observable<{ data: GoldChartData }> {
    const params = code ? `?code=${code}` : '';
    return this.http.get<any>(`${this.base}/gold/chart${params}`);
  }

  refreshRates(): Observable<any> {
    return this.http.post(`${this.base}/gold/refresh`, {});
  }

  // --- Auth ---
  login(username: string, password: string): Observable<{ token: string; user: User }> {
    return this.http.post<any>(`${this.base}/auth/login`, { username, password });
  }

  register(username: string, password: string): Observable<{ token: string; user: User }> {
    return this.http.post<any>(`${this.base}/auth/register`, { username, password });
  }

  me(): Observable<{ user: User }> {
    return this.http.get<any>(`${this.base}/auth/me`, { headers: this.authHeader() });
  }

  // --- Portfolio ---
  getPortfolio(): Observable<{ data: PortfolioItem[]; summary: PortfolioSummary }> {
    return this.http.get<any>(`${this.base}/portfolio`, { headers: this.authHeader() });
  }

  addPortfolio(item: { code: string; quantity: number; buy_price: number; buy_date: string; note?: string }): Observable<any> {
    return this.http.post(`${this.base}/portfolio`, item, { headers: this.authHeader() });
  }

  updatePortfolio(id: number, item: Partial<{ code: string; quantity: number; buy_price: number; buy_date: string; note: string }>): Observable<any> {
    return this.http.put(`${this.base}/portfolio/${id}`, item, { headers: this.authHeader() });
  }

  deletePortfolio(id: number): Observable<any> {
    return this.http.delete(`${this.base}/portfolio/${id}`, { headers: this.authHeader() });
  }
}
