import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HighchartsChartComponent } from 'highcharts-angular';
import * as Highcharts from 'highcharts';
import { ChartDataPoint } from '../../models/gold.model';

@Component({
  selector: 'app-gold-chart',
  standalone: true,
  imports: [CommonModule, HighchartsChartComponent],
  templateUrl: './gold-chart.component.html',
})
export class GoldChartComponent implements OnChanges {
  @Input() dataPoints: ChartDataPoint[] = [];
  @Input() loading = false;
  @Input() maxDays: number | undefined = 7;

  chartOptions: Highcharts.Options = {};
  hasData = false;

  ngOnChanges(changes: SimpleChanges) {
    if (changes['dataPoints'] || changes['maxDays']) {
      this.buildChart();
    }
  }

  private buildChart() {
    const filtered = this.dataPoints;
    this.hasData = filtered.length > 0;
    if (!this.hasData) return;

    const categories = filtered.map(p => p.date);
    const buyData = filtered.map(p => p.buy);
    const sellData = filtered.map(p => p.sell);

    const allValues = [...buyData, ...sellData].filter(v => v > 0);
    const dataMin = Math.min(...allValues);
    const dataMax = Math.max(...allValues);
    const padding = (dataMax - dataMin) * 0.05 || dataMax * 0.02;
    const yMin = Math.floor((dataMin - padding) / 100_000) * 100_000;
    const yMax = Math.ceil((dataMax + padding) / 100_000) * 100_000;

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
        tickInterval: this.maxDays === 1 ? 4
          : this.maxDays === 7 ? 1
          : this.maxDays === 30 ? 3
          : this.maxDays === 365 ? 30
          : Math.max(1, Math.floor(filtered.length / 8)),
        labels: { 
          style: { color: '#6b7280', fontSize: '11px' },
          rotation: 0
        },
        lineColor: '#cbd5e1',
        tickColor: '#cbd5e1',
      },
      yAxis: {
        min: yMin,
        max: yMax,
        title: { text: undefined },
        labels: {
          style: { color: '#6b7280', fontSize: '11px' },
          formatter() { 
            const val = (this.value as number) / 1_000_000;
            return (+val.toFixed(3)) + 'M'; 
          }
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
            const val = +(((p.y as number) ?? 0) / 1_000_000).toFixed(3);
            s += `<span style="color:${p.color}">●</span> ${p.series.name}: <b>${val}M đ</b><br/>`;
          }
          return s;
        }
      },
      plotOptions: {
        area: {
          fillOpacity: 0.12,
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
            stops: [[0, 'rgba(4,120,87,0.18)'], [1, 'rgba(4,120,87,0)']]
          },
        },
        {
          type: 'area',
          name: 'Sell',
          data: sellData,
          color: '#1d4ed8',
          fillColor: {
            linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
            stops: [[0, 'rgba(29,78,216,0.18)'], [1, 'rgba(29,78,216,0)']]
          },
        },
      ],
      credits: { enabled: false }
    };
  }
}
