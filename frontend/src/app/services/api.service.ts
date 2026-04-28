import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { GoldRate, GoldChartData, PortfolioItem, PortfolioSummary, User, Member } from '../models/gold.model';
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

  getChart(code?: string, maxDays?: number): Observable<{ data: GoldChartData }> {
    let params = code ? `?code=${code}` : '?';
    if (maxDays) params += `&max_days=${maxDays}`;
    return this.http.get<any>(`${this.base}/gold/chart${params.replace('?&', '?')}`);
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

  updateProfile(display_name: string): Observable<any> {
    return this.http.put(`${this.base}/auth/profile`, { display_name }, { headers: this.authHeader() });
  }

  // --- Members ---
  getMembers(): Observable<{ data: Member[] }> {
    return this.http.get<any>(`${this.base}/members`, { headers: this.authHeader() });
  }

  addMember(name: string): Observable<{ id: number; name: string }> {
    return this.http.post<any>(`${this.base}/members`, { name }, { headers: this.authHeader() });
  }

  renameMember(id: number, name: string): Observable<any> {
    return this.http.put(`${this.base}/members/${id}`, { name }, { headers: this.authHeader() });
  }

  deleteMember(id: number): Observable<any> {
    return this.http.delete(`${this.base}/members/${id}`, { headers: this.authHeader() });
  }

  // --- Portfolio ---
  getPortfolio(memberId?: number | null): Observable<{ data: PortfolioItem[]; summary: PortfolioSummary }> {
    const params = memberId ? `?member_id=${memberId}` : '';
    return this.http.get<any>(`${this.base}/portfolio${params}`, { headers: this.authHeader() });
  }

  addPortfolio(item: { code: string; quantity: number; buy_price: number; buy_date: string; note?: string }, memberId?: number | null): Observable<any> {
    const body = { ...item, ...(memberId ? { member_id: memberId } : {}) };
    return this.http.post(`${this.base}/portfolio`, body, { headers: this.authHeader() });
  }

  updatePortfolio(id: number, item: Partial<{ code: string; quantity: number; buy_price: number; buy_date: string; note: string }>): Observable<any> {
    return this.http.put(`${this.base}/portfolio/${id}`, item, { headers: this.authHeader() });
  }

  deletePortfolio(id: number): Observable<any> {
    return this.http.delete(`${this.base}/portfolio/${id}`, { headers: this.authHeader() });
  }

  sellPortfolio(id: number, body: { sell_price: number; sell_date: string; sell_quantity: number; market_price_at_sell?: number }): Observable<any> {
    return this.http.put(`${this.base}/portfolio/${id}/sell`, body, { headers: this.authHeader() });
  }

  reopenPortfolio(id: number): Observable<any> {
    return this.http.put(`${this.base}/portfolio/${id}/reopen`, {}, { headers: this.authHeader() });
  }
}
