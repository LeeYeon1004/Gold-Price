import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../services/api.service';
import { RatesService } from '../../services/rates.service';
import { ChartDataPoint } from '../../models/gold.model';
import { PriceTableComponent } from '../../components/price-table/price-table.component';
import { GoldChartComponent } from '../../components/chart/gold-chart.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, PriceTableComponent, GoldChartComponent],
  templateUrl: './home.component.html',
})
export class HomeComponent implements OnInit, OnDestroy {
  private api = inject(ApiService);
  ratesService = inject(RatesService);

  refreshing = signal(false);
  chartData = signal<ChartDataPoint[]>([]);
  chartLoading = signal(true);
  productOptions = signal<{ value: string; label: string }[]>([]);

  combinedLoading = computed(() => this.chartLoading() || this.ratesService.loading());

  private get sjcRate() { return this.ratesService.rates().find(r => r.code === 'SJC9999') ?? this.ratesService.rates()[0]; }
  sjcSell = () => this.sjcRate?.sell_price ?? 0;
  sjcBuy  = () => this.sjcRate?.buy_price ?? 0;

  ngOnInit() {
    this.ratesService.ensureLoaded();
    this.ratesService.startAutoRefresh();
    this.loadChart();
  }

  ngOnDestroy() {
    this.ratesService.stopAutoRefresh();
  }

  private formatTime(d: Date): string {
    return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  }

  activeCode: string | undefined;
  activeMaxDays: number | undefined = 30; // default to 30 days based on the image

  loadChart() {
    this.chartLoading.set(true);
    this.api.getChart(this.activeCode, this.activeMaxDays).subscribe({
      next: res => {
        this.chartData.set(res.data?.data_points ?? []);
        if (res.data?.product_options) this.productOptions.set(res.data.product_options);
        this.chartLoading.set(false);
      },
      error: () => this.chartLoading.set(false),
    });
  }

  onProductChange(event: Event) {
    this.activeCode = (event.target as HTMLSelectElement).value || undefined;
    this.loadChart();
  }

  setPeriod(days?: number) {
    this.activeMaxDays = days;
    this.loadChart();
  }

  refresh() {
    this.refreshing.set(true);
    this.api.refreshRates().subscribe({
      next: () => { this.refreshing.set(false); this.ratesService.load(); this.loadChart(); },
      error: () => { this.refreshing.set(false); this.ratesService.load(); },
    });
  }
}
