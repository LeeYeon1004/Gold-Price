import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../services/api.service';
import { GoldRate, ChartDataPoint } from '../../models/gold.model';
import { PriceTableComponent } from '../../components/price-table/price-table.component';
import { GoldChartComponent } from '../../components/chart/gold-chart.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, PriceTableComponent, GoldChartComponent],
  template: `
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 animate-fade-in">

      <!-- Error banner -->
      @if (ratesError()) {
        <div class="bg-red-50 border border-red-200 rounded-2xl px-5 py-4 flex items-center justify-between gap-4">
          <div class="flex items-center gap-3">
            <span class="text-red-600 text-xl">⚠️</span>
            <div>
              <p class="text-sm font-medium text-red-500">Failed to load gold prices</p>
              <p class="text-xs text-red-600/70 mt-0.5">Check your connection or try again later</p>
            </div>
          </div>
          <button (click)="loadRates()" class="btn-secondary text-xs px-3 py-1.5 shrink-0">
            ↻ Thử lại
          </button>
        </div>
      }

      <!-- Header stats -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
        @if (ratesLoading()) {
          @for (i of [1,2,3,4]; track i) {
            <div class="card-sm shimmer h-20"></div>
          }
        } @else if (rates().length) {
          <div class="card-sm animate-slide-up">
            <p class="text-xs text-slate-500 uppercase tracking-wider">SJC Sell</p>
            <p class="text-xl font-bold text-blue-700 tabular-nums mt-1">
              {{ sjcSell() / 1_000_000 | number:'1.0-3' }}M
            </p>
            <p class="text-xs text-slate-400 mt-0.5">VND/tael</p>
          </div>
          <div class="card-sm animate-slide-up" style="animation-delay:0.05s">
            <p class="text-xs text-slate-500 uppercase tracking-wider">SJC Buy</p>
            <p class="text-xl font-bold text-emerald-700 tabular-nums mt-1">
              {{ sjcBuy() / 1_000_000 | number:'1.0-3' }}M
            </p>
            <p class="text-xs text-slate-400 mt-0.5">VND/tael</p>
          </div>
          <div class="card-sm animate-slide-up" style="animation-delay:0.1s">
            <p class="text-xs text-slate-500 uppercase tracking-wider">Spread</p>
            <p class="text-xl font-bold text-slate-700 tabular-nums mt-1">
              {{ (sjcSell() - sjcBuy()) / 1_000_000 | number:'1.0-3' }}M
            </p>
            <p class="text-xs text-slate-400 mt-0.5">buy/sell</p>
          </div>
          <div class="card-sm animate-slide-up" style="animation-delay:0.15s">
            <p class="text-xs text-slate-500 uppercase tracking-wider">Update</p>
            <div class="flex items-center gap-1.5 mt-1">
              <div class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
              <p class="text-sm font-medium text-slate-700">{{ lastUpdated() }}</p>
            </div>
            <button (click)="refresh()" [disabled]="refreshing()"
              class="mt-2 text-xs text-amber-500 hover:text-blue-700 disabled:opacity-40 transition-colors">
              {{ refreshing() ? 'Refreshing...' : '↻ Refresh' }}
            </button>
          </div>
        }
      </div>

      <!-- Price table + chart -->
      <div class="grid grid-cols-1 xl:grid-cols-5 gap-6">
        <div class="card xl:col-span-3">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-base font-semibold text-slate-900">Gold Prices</h2>
            <span class="text-xs text-slate-500">Source: Bao Tin Manh Hai</span>
          </div>
          <app-price-table [rates]="rates()" [loading]="ratesLoading()"/>
        </div>

        <div class="card xl:col-span-2">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-base font-semibold text-slate-900">Price Chart</h2>
            @if (productOptions().length) {
              <select (change)="onProductChange($event)"
                class="text-xs bg-slate-100 border border-slate-300 text-slate-700 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-amber-500">
                @for (opt of productOptions(); track opt.value) {
                  <option [value]="opt.value">{{ opt.label }}</option>
                }
              </select>
            }
          </div>
          <app-gold-chart [dataPoints]="chartData()" [loading]="chartLoading()"/>
        </div>
      </div>

    </div>
  `
})
export class HomeComponent implements OnInit, OnDestroy {
  private api = inject(ApiService);

  rates = signal<GoldRate[]>([]);
  ratesLoading = signal(true);
  ratesError = signal(false);
  refreshing = signal(false);
  chartData = signal<ChartDataPoint[]>([]);
  chartLoading = signal(true);
  productOptions = signal<{ value: string; label: string }[]>([]);
  lastUpdated = signal('–');

  private refreshTimer?: ReturnType<typeof setInterval>;

  private get sjcRate() { return this.rates().find(r => r.code === 'SJC') ?? this.rates()[0]; }
  sjcSell = () => this.sjcRate?.sell_price ?? 0;
  sjcBuy  = () => this.sjcRate?.buy_price ?? 0;

  ngOnInit() {
    this.loadRates();
    this.loadChart();
    this.refreshTimer = setInterval(() => this.loadRates(), 5 * 60 * 1000);
  }

  ngOnDestroy() { clearInterval(this.refreshTimer); }

  loadRates() {
    this.ratesLoading.set(true);
    this.ratesError.set(false);
    this.api.getRates().subscribe({
      next: res => {
        this.rates.set(res.data ?? []);
        if (res.fetched_at) {
          const d = new Date(res.fetched_at + 'Z');
          this.lastUpdated.set(d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }));
        }
        this.ratesLoading.set(false);
      },
      error: () => {
        this.ratesError.set(true);
        this.ratesLoading.set(false);
      },
    });
  }

  loadChart(code?: string) {
    this.chartLoading.set(true);
    this.api.getChart(code).subscribe({
      next: res => {
        this.chartData.set(res.data?.data_points ?? []);
        if (res.data?.product_options) this.productOptions.set(res.data.product_options);
        this.chartLoading.set(false);
      },
      error: () => this.chartLoading.set(false),
    });
  }

  onProductChange(event: Event) {
    this.loadChart((event.target as HTMLSelectElement).value || undefined);
  }

  refresh() {
    this.refreshing.set(true);
    this.api.refreshRates().subscribe({
      next: () => { this.refreshing.set(false); this.loadRates(); this.loadChart(); },
      error: () => { this.refreshing.set(false); this.loadRates(); },
    });
  }
}
