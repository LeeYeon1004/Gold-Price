import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GoldRate } from '../../models/gold.model';

@Component({
  selector: 'app-price-table',
  standalone: true,
  imports: [CommonModule],
  template: `
    <!-- Skeleton -->
    @if (loading) {
      <div class="space-y-3">
        @for (i of [1,2,3,4,5]; track i) {
          <div class="shimmer h-14 rounded-xl"></div>
        }
      </div>
    }

    
    <!-- Table -->
    @if (!loading && rates.length) {
      <div class="overflow-x-auto -mx-1">
        <table class="w-full min-w-[560px]">
          <thead>
            <tr class="text-xs text-gray-500 uppercase tracking-wider">
              <th class="text-left pb-3 pl-2">Loại vàng</th>
              <th class="text-right pb-3">Mua vào</th>
              <th class="text-right pb-3">Bán ra</th>
              <th class="text-right pb-3 pr-2">Chênh lệch</th>
              <th class="text-center pb-3">Xu hướng</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-800">
            @for (rate of rates; track rate.code + rate.vendor_name) {
              <tr class="group hover:bg-gray-800/40 transition-colors duration-150 rounded-xl animate-fade-in">
                <td class="py-3.5 pl-2">
                  <div class="font-medium text-gray-100 text-sm leading-tight">{{ rate.name }}</div>
                  @if (rate.vendor_name) {
                    <div class="text-xs text-gray-500 mt-0.5">{{ rate.vendor_name }}</div>
                  }
                </td>
                <td class="py-3.5 text-right">
                  <span class="text-emerald-400 font-semibold tabular-nums">
                    {{ rate.buy_price | number:'1.0-0' }}
                  </span>
                  <div class="text-xs text-gray-600">đ</div>
                </td>
                <td class="py-3.5 text-right">
                  <span class="text-amber-400 font-semibold tabular-nums">
                    {{ rate.sell_price | number:'1.0-0' }}
                  </span>
                  <div class="text-xs text-gray-600">đ</div>
                </td>
                <td class="py-3.5 text-right pr-2">
                  <span class="text-gray-400 text-sm tabular-nums">
                    {{ (rate.sell_price - rate.buy_price) | number:'1.0-0' }}
                  </span>
                </td>
                <td class="py-3.5 text-center">
                  @if (rate.trend === 'up') {
                    <span class="badge-up">↑ Tăng</span>
                  } @else if (rate.trend === 'down') {
                    <span class="badge-down">↓ Giảm</span>
                  } @else {
                    <span class="badge-neutral">— Giữ</span>
                  }
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    }

    @if (!loading && !rates.length) {
      <div class="text-center py-12 text-gray-500">
        <div class="text-4xl mb-3">📊</div>
        <p>Chưa có dữ liệu giá vàng</p>
      </div>
    }
  `
})
export class PriceTableComponent {
  @Input() rates: GoldRate[] = [];
  @Input() loading = false;
}
