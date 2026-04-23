import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GoldRate } from '../../models/gold.model';

@Component({
  selector: 'app-price-table',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './price-table.component.html',
})
export class PriceTableComponent {
  @Input() rates: GoldRate[] = [];
  @Input() loading = false;
}
