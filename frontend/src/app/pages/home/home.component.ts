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

      <!-- Header stats -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
        @if (ratesLoading()) {
          @for (i of [1,2,3,4]; track i) {
            <div class="card-sm shimmer h-20"></div>
          }
        } @else {
          <!-- SJC sell price -->
          <div class="card-sm animate-slide-up">
            <p class="text-xs text-gray-500 uppercase tracking-wider">SJC Bán ra</p>
            <p class="text-xl font-bold text-amber-400 tabular-nums mt-1">
              {{ (sjcRate()?.sell_price ?? 0) / 1_000_000 | number:'1.2-2' }}M
            </p>
            <p class="text-xs text-gray-600 mt-0.5">đ/lượng</p>
          </div>
          <!-- SJC buy price -->
          <div class="card-sm animate-slide-up" style="animation-delay:0.05s">
            <p class="text-xs text-gray-500 uppercase tracking-wider">SJC Mua vào</p>
            <p class="text-xl font-bold text-emerald-400 tabular-nums mt-1">
              {{ (sjcRate()?.buy_price ?? 0) / 1_000_000 | number:'1.2-2' }}M
            </p>
            <p class="text-xs text-gray-600 mt-0.5">đ/lượng</p>
          </div>
          <!-- Spread -->
          <div class="card-sm animate-slide-up" style="animation-delay:0.1s">
            <p class="text-xs text-gray-500 uppercase tracking-wider">Chênh lệch</p>
            <p class="text-xl font-bold text-gray-300 tabular-nums mt-1">
              {{ ((sjcRate()?.sell_price ?? 0) - (sjcRate()?.buy_price ?? 0)) / 1_000_000 | number:'1.2-2' }}M
            </p>
            <p class="text-xs text-gray-600 mt-0.5">mua/bán</p>
          </div>
          <!-- Last updated -->
          <div class="card-sm animate-slide-up" style="animation-delay:0.15s">
            <p class="text-xs text-gray-500 uppercase tracking-wider">Cập nhật</p>
            <div class="flex items-center gap-1.5 mt-1">
              <div class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse-slow"></div>
              <p class="text-sm font-medium text-gray-300">{{ lastUpdated() }}</p>
            </div>
            <button (click)="refresh()" [disabled]="refreshing()"
              class="mt-2 text-xs text-amber-500 hover:text-amber-400 disabled:opacity-40 transition-colors">
              {{ refreshing() ? 'Đang làm mới...' : '↻ Làm mới' }}
            </button>
          </div>
        }
      </div>

      <!-- Price table + chart side by side on large screen -->
      <div class="grid grid-cols-1 xl:grid-cols-5 gap-6">

        <!-- Price table -->
        <div class="card xl:col-span-3">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-base font-semibold text-gray-100">Bảng giá vàng</h2>
            <span class="text-xs text-gray-500">Nguồn: Bảo Tín Mạnh Hải</span>
          </div>
          <app-price-table [rates]="rates()" [loading]="ratesLoading()"/>
        </div>

        <!-- Chart -->
        <div class="card xl:col-span-2">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-base font-semibold text-gray-100">Biểu đồ giá</h2>
            <!-- Product selector -->
            <select (change)="onProductChange($event)"
              class="text-xs bg-gray-800 border border-gray-700 text-gray-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-amber-500">
              @for (opt of productOptions(); track opt.value) {
                <option [value]="opt.value">{{ opt.label }}</option>
              }
            </select>
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
  refreshing = signal(false);
  chartData = signal<ChartDataPoint[]>([]);
  chartLoading = signal(true);
  productOptions = signal<{ value: string; label: string }[]>([]);
  lastUpdated = signal('–');

  private refreshTimer?: ReturnType<typeof setInterval>;

  sjcRate = () => this.rates().find(r => r.code === 'SJC') ?? this.rates()[0] ?? null;

  ngOnInit() {
    this.loadRates();
    this.loadChart();
    // Auto-refresh every 5 minutes
    this.refreshTimer = setInterval(() => this.loadRates(), 5 * 60 * 1000);
  }

  ngOnDestroy() {
    clearInterval(this.refreshTimer);
  }

  loadRates() {
    this.ratesLoading.set(true);
    this.api.getRates().subscribe({
      next: res => {
        this.rates.set(res.data);
        if (res.fetched_at) {
          const d = new Date(res.fetched_at + 'Z');
          this.lastUpdated.set(d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }));
        }
        this.ratesLoading.set(false);
      },
      error: () => this.ratesLoading.set(false),
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
    const val = (event.target as HTMLSelectElement).value;
    this.loadChart(val || undefined);
  }

  refresh() {
    this.refreshing.set(true);
    this.api.refreshRates().subscribe({
      next: () => { this.refreshing.set(false); this.loadRates(); this.loadChart(); },
      error: () => this.refreshing.set(false),
    });
  }
}
