import { Injectable, inject, signal, computed } from '@angular/core';
import { ApiService } from './api.service';
import { GoldRate } from '../models/gold.model';

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

@Injectable({ providedIn: 'root' })
export class RatesService {
  private api = inject(ApiService);

  rates = signal<GoldRate[]>([]);
  loading = signal(false);
  lastUpdated = signal<Date | null>(null);
  lastUpdatedLabel = computed(() => {
    const d = this.lastUpdated();
    return d ? d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '–';
  });

  // Only rates that have both buy and sell prices (active products)
  activeRates = computed(() => this.rates().filter(r => r.sell_price > 1 && r.buy_price > 1));

  private autoRefreshTimer?: ReturnType<typeof setInterval>;

  /** Load rates if cache is stale, otherwise skip. */
  ensureLoaded(): void {
    const last = this.lastUpdated();
    if (last && Date.now() - last.getTime() < CACHE_TTL_MS) return;
    this.load();
  }

  /** Force reload from server (e.g. manual refresh button). */
  load(): void {
    this.loading.set(true);
    this.api.getRates().subscribe({
      next: res => {
        this.rates.set(res.data ?? []);
        this.lastUpdated.set(new Date());
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  /** Start auto-refresh every 5 minutes. Call from HomeComponent. */
  startAutoRefresh(): void {
    this.stopAutoRefresh();
    this.autoRefreshTimer = setInterval(() => this.load(), CACHE_TTL_MS);
  }

  stopAutoRefresh(): void {
    clearInterval(this.autoRefreshTimer);
  }
}
