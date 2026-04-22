import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HighchartsChartComponent } from 'highcharts-angular';
import * as Highcharts from 'highcharts';
import { ChartDataPoint } from '../../models/gold.model';

type Period = '1w' | '1m' | '3m' | '6m';

@Component({
  selector: 'app-gold-chart',
  standalone: true,
  imports: [CommonModule, HighchartsChartComponent],
  template: `
    <div class="space-y-4">
      <!-- Period selector -->
      <div class="flex gap-2 flex-wrap">
        @for (p of periods; track p.value) {
          <button
            (click)="setPeriod(p.value)"
            [class]="activePeriod === p.value
              ? 'btn-primary text-xs px-3 py-1.5'
              : 'btn-secondary text-xs px-3 py-1.5'">
            {{ p.label }}
          </button>
        }
      </div>

      <!-- Chart -->
      @if (loading) {
        <div class="shimmer h-72 rounded-xl"></div>
      } @else if (hasData) {
        <highcharts-chart
          [options]="chartOptions"
          style="width: 100%; height: 300px; display: block;"
          class="animate-fade-in">
        </highcharts-chart>
      } @else {
        <div class="h-72 flex items-center justify-center text-slate-500">
          <div class="text-center">
            <div class="text-3xl mb-2">📈</div>
            <p class="text-sm">No data for this period</p>
          </div>
        </div>
      }
    </div>
  `
})
export class GoldChartComponent implements OnChanges {
  @Input() dataPoints: ChartDataPoint[] = [];
  @Input() loading = false;

  activePeriod: Period = '1m';
  chartOptions: Highcharts.Options = {};
  hasData = false;

  periods = [
    { value: '1w' as Period, label: '1W' },
    { value: '1m' as Period, label: '1M' },
    { value: '3m' as Period, label: '3M' },
    { value: '6m' as Period, label: '6M' },
  ];

  ngOnChanges(changes: SimpleChanges) {
    if (changes['dataPoints']) this.buildChart();
  }

  setPeriod(p: Period) {
    this.activePeriod = p;
    this.buildChart();
  }

  private filterByPeriod(points: ChartDataPoint[]): ChartDataPoint[] {
    if (!points.length) return points;
    const days = { '1w': 7, '1m': 30, '3m': 90, '6m': 180 }[this.activePeriod];
    return points.slice(-days);
  }

  private buildChart() {
    const filtered = this.filterByPeriod(this.dataPoints);
    this.hasData = filtered.length > 0;
    if (!this.hasData) return;

    const categories = filtered.map(p => p.date);
    const buyData = filtered.map(p => p.buy);
    const sellData = filtered.map(p => p.sell);

    this.chartOptions = {
      chart: {
        type: 'area',
        backgroundColor: 'transparent',
        style: { fontFamily: 'Inter, system-ui, sans-serif' },
        animation: { duration: 500 },
      },
      title: { text: undefined },
      xAxis: {
        categories,
        tickInterval: Math.max(1, Math.floor(filtered.length / 6)),
        labels: { style: { color: '#6b7280', fontSize: '11px' } },
        lineColor: '#cbd5e1',
        tickColor: '#cbd5e1',
      },
      yAxis: {
        title: { text: undefined },
        labels: {
          style: { color: '#6b7280', fontSize: '11px' },
          formatter() { return ((this.value as number) / 1_000_000).toFixed(1) + 'M'; }
        },
        gridLineColor: '#e2e8f0',
      },
      legend: {
        itemStyle: { color: '#9ca3af', fontWeight: '500', fontSize: '12px' },
        itemHoverStyle: { color: '#0f172a' },
      },
      tooltip: {
        shared: true,
        backgroundColor: '#ffffff',
        borderColor: '#e2e8f0',
        style: { color: '#1e293b', fontSize: '12px' },
        formatter() {
          const pts = this.points ?? [];
          let s = `<b>${this.x}</b><br/>`;
          for (const p of pts) {
            const val = (((p.y as number) ?? 0) / 1_000_000).toFixed(2);
            s += `<span style="color:${p.color}">●</span> ${p.series.name}: <b>${val}M đ</b><br/>`;
          }
          return s;
        }
      },
      plotOptions: {
        area: {
          fillOpacity: 0.08,
          lineWidth: 2,
          marker: { enabled: false, states: { hover: { enabled: true, radius: 4 } } },
        }
      },
      series: [
        {
          type: 'area',
          name: 'Buy',
          data: buyData,
          color: '#047857',
          fillColor: {
            linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
            stops: [[0, 'rgba(4,120,87,0.15)'], [1, 'rgba(4,120,87,0)']]
          },
        },
        {
          type: 'area',
          name: 'Sell',
          data: sellData,
          color: '#1d4ed8',
          fillColor: {
            linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
            stops: [[0, 'rgba(29,78,216,0.15)'], [1, 'rgba(29,78,216,0)']]
          },
        },
      ],
      credits: { enabled: false },
      responsive: {
        rules: [{
          condition: { maxWidth: 480 },
          chartOptions: {
            xAxis: { tickInterval: Math.max(1, Math.floor(filtered.length / 4)) },
          }
        }]
      }
    };
  }
}
