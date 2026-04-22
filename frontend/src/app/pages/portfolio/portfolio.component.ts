import { Component, OnInit, inject, signal, Directive, ElementRef, OnDestroy, computed } from '@angular/core';
import flatpickr from 'flatpickr';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { PortfolioItem, PortfolioSummary, GoldRate } from '../../models/gold.model';

interface AddForm {
  code: string;
  quantity: number | null;
  buy_price: number | null;
  buy_date: string;
  note: string;
}

@Directive({
  selector: '[appFlatpickr]',
  standalone: true
})
export class FlatpickrDirective implements OnInit, OnDestroy {
  private fp: any;
  constructor(private el: ElementRef) {}
  ngOnInit() {
    this.fp = flatpickr(this.el.nativeElement, {
      dateFormat: 'Y-m-d',
      allowInput: true,
      onChange: () => {
        this.el.nativeElement.dispatchEvent(new Event('input'));
      }
    });
  }
  ngOnDestroy() {
    if (this.fp) this.fp.destroy();
  }
}

@Component({
  selector: 'app-portfolio',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, FlatpickrDirective],
  template: `
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 animate-fade-in">

      <!-- Not logged in -->
      @if (!auth.isLoggedIn()) {
        <div class="card text-center py-16">
          <div class="text-5xl mb-4">🔒</div>
          <h2 class="text-xl font-semibold text-slate-800 mb-2">Login to view portfolio</h2>
          <p class="text-slate-500 mb-6">Track your gold profit/loss</p>
          <a routerLink="/login" class="btn-primary inline-block">Login now</a>
        </div>
      }

      @if (auth.isLoggedIn()) {
        <!-- Summary cards -->
        @if (computedSummary(); as s) {
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div class="card-sm animate-slide-up relative overflow-hidden group border-2" 
                 [class.border-blue-500]="selectedIds().size > 0"
                 [class.border-slate-200]="selectedIds().size === 0">
              @if (selectedIds().size > 0) {
                <div class="absolute top-0 right-0 p-1">
                  <span class="flex h-2 w-2 rounded-full bg-blue-500 animate-pulse"></span>
                </div>
              }
              <p class="text-xs text-slate-500 uppercase tracking-wider">Total Cost</p>
              <p class="text-lg font-bold text-slate-800 tabular-nums mt-1">
                {{ s.total_cost / 1_000_000 | number:'1.0-0' }}M
              </p>
            </div>
            <div class="card-sm animate-slide-up relative overflow-hidden border-2" 
                 [class.border-blue-500]="selectedIds().size > 0"
                 [class.border-slate-200]="selectedIds().size === 0"
                 style="animation-delay:0.05s">
              @if (selectedIds().size > 0) {
                <div class="absolute top-0 right-0 p-1">
                  <span class="flex h-2 w-2 rounded-full bg-blue-500 animate-pulse"></span>
                </div>
              }
              <p class="text-xs text-slate-500 uppercase tracking-wider">Current Value</p>
              <p class="text-lg font-bold text-blue-700 tabular-nums mt-1">
                {{ s.total_value / 1_000_000 | number:'1.0-0' }}M
              </p>
            </div>
            <div class="card-sm animate-slide-up relative overflow-hidden border-2" 
                 [class.border-blue-500]="selectedIds().size > 0"
                 [class.border-slate-200]="selectedIds().size === 0"
                 style="animation-delay:0.1s">
              @if (selectedIds().size > 0) {
                <div class="absolute top-0 right-0 p-1">
                  <span class="flex h-2 w-2 rounded-full bg-blue-500 animate-pulse"></span>
                </div>
              }
              <p class="text-xs text-slate-500 uppercase tracking-wider">Profit / Loss</p>
              <p class="text-lg font-bold tabular-nums mt-1"
                 [class]="s.total_pnl >= 0 ? 'text-emerald-700' : 'text-red-600'">
                {{ s.total_pnl >= 0 ? '+' : '' }}{{ s.total_pnl / 1_000_000 | number:'1.0-0' }}M
              </p>
            </div>
            <div class="card-sm animate-slide-up relative overflow-hidden border-2" 
                 [class.border-blue-500]="selectedIds().size > 0"
                 [class.border-slate-200]="selectedIds().size === 0"
                 style="animation-delay:0.15s">
              @if (selectedIds().size > 0) {
                <div class="absolute top-0 right-0 p-1">
                  <span class="flex h-2 w-2 rounded-full bg-blue-500 animate-pulse"></span>
                </div>
              }
              <p class="text-xs text-slate-500 uppercase tracking-wider">Return %</p>
              <p class="text-lg font-bold tabular-nums mt-1"
                 [class]="s.total_pnl_pct >= 0 ? 'text-emerald-700' : 'text-red-600'">
                {{ s.total_pnl_pct >= 0 ? '+' : '' }}{{ s.total_pnl_pct | number:'1.2-2' }}%
              </p>
            </div>
          </div>
        }

        <div class="grid grid-cols-1 xl:grid-cols-3 gap-6">

          <!-- Add form -->
          <div class="card xl:col-span-1">
            <h2 class="text-base font-semibold text-slate-900 mb-4">
              {{ editId() ? 'Edit Transaction' : 'Add Transaction' }}
            </h2>
            <form (ngSubmit)="submit()" class="space-y-3">
              <div>
                <label class="text-xs text-slate-600 mb-1 block">Product</label>
                <select [(ngModel)]="form.code" name="code" class="input-field text-sm">
                  @for (rate of goldRates(); track rate.code + rate.vendor_name) {
                    <option [value]="rate.code">
                      {{ rate.name }}
                    </option>
                  } @empty {
                    <option value="SJC">SJC</option>
                    <option value="BTMH">Bảo Tín Mạnh Hải</option>
                  }
                </select>
              </div>

              <div>
                <label class="text-xs text-slate-600 mb-1 block">Quantity (tael/mace)</label>
                <input [(ngModel)]="form.quantity" name="quantity" type="number" step="0.1" min="0.1"
                  placeholder="e.g., 2.5" class="input-field text-sm" required/>
              </div>

              <div>
                <label class="text-xs text-slate-600 mb-1 block">Buy Price (VND)</label>
                <input [(ngModel)]="form.buy_price" name="buy_price" type="number" step="1000" min="0"
                  placeholder="e.g., 87000000" class="input-field text-sm" required/>
                @if (form.buy_price) {
                  <p class="text-xs text-blue-700 mt-1">
                    = {{ form.buy_price / 1_000_000 | number:'1.2-2' }}M đ
                  </p>
                }
              </div>

              <div>
                <label class="text-xs text-slate-600 mb-1 block">Buy Date</label>
                <input [(ngModel)]="form.buy_date" name="buy_date" type="text" appFlatpickr
                  placeholder="YYYY-MM-DD" class="input-field text-sm cursor-pointer" required/>
              </div>

              <div>
                <label class="text-xs text-slate-600 mb-1 block">Note (optional)</label>
                <input [(ngModel)]="form.note" name="note" type="text"
                  placeholder="e.g., Bought at Bao Tin" class="input-field text-sm"/>
              </div>

              @if (form.quantity && form.buy_price) {
                <div class="bg-slate-50 rounded-xl p-3 text-xs text-slate-600 space-y-1">
                  <div class="flex justify-between">
                    <span>Total cost basis:</span>
                    <span class="text-slate-800 font-semibold">
                      {{ (form.quantity * form.buy_price) / 1_000_000 | number:'1.2-2' }}M đ
                    </span>
                  </div>
                </div>
              }

              <div class="flex gap-2 pt-1">
                <button type="submit" [disabled]="submitting()" class="btn-primary flex-1 text-sm">
                  {{ submitting() ? 'Saving...' : (editId() ? 'Update' : 'Add to Portfolio') }}
                </button>
                @if (editId()) {
                  <button type="button" (click)="cancelEdit()" class="btn-secondary text-sm px-3">Cancel</button>
                }
              </div>
            </form>
          </div>

          <!-- Portfolio list -->
          <div class="card xl:col-span-2">
            <div class="flex items-center justify-between mb-4">
              <h2 class="text-base font-semibold text-slate-900">Your Portfolio</h2>
              @if (selectedIds().size > 0) {
                <button (click)="clearSelection()" class="text-xs text-slate-500 hover:text-blue-600 flex items-center gap-1 transition-colors">
                  <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                  Clear Selection ({{ selectedIds().size }})
                </button>
              }
            </div>

            @if (loading()) {
              <div class="space-y-3">
                @for (i of [1,2,3]; track i) {
                  <div class="shimmer h-20 rounded-xl"></div>
                }
              </div>
            } @else if (!items().length) {
              <div class="text-center py-12 text-slate-500">
                <div class="text-4xl mb-3">💰</div>
                <p class="text-sm">No transactions yet. Add your first one!</p>
              </div>
            } @else {
              <div class="space-y-3">
                @for (item of items(); track item.id) {
                  <div 
                    (click)="toggleSelection(item.id)"
                    [class]="isSelected(item.id) 
                      ? 'bg-blue-50/50 border-blue-200 ring-1 ring-blue-200 shadow-sm' 
                      : 'bg-slate-50 border-slate-200 hover:border-slate-300'"
                    class="border rounded-xl p-4 transition-all animate-slide-up cursor-pointer group relative overflow-hidden"
                  >
                    @if (isSelected(item.id)) {
                      <div class="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
                    }

                    <div class="flex items-start gap-4">
                      <!-- Selection Checkbox -->
                      <div class="mt-1">
                        <div 
                          [class]="isSelected(item.id) ? 'bg-blue-600 border-blue-600' : 'bg-white border-slate-300'"
                          class="w-5 h-5 rounded-md border flex items-center justify-center transition-colors shadow-sm"
                        >
                          @if (isSelected(item.id)) {
                            <svg class="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/></svg>
                          }
                        </div>
                      </div>

                      <div class="flex-1 min-w-0">
                        <div class="flex items-center gap-2 flex-wrap">
                          <span class="font-semibold text-slate-900 text-sm">{{ getProductName(item.code) }}</span>
                          <span class="text-xs text-slate-500">{{ item.quantity }} units</span>
                          <span class="text-xs text-slate-400">{{ item.buy_date }}</span>
                        </div>
                        <div class="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1 text-xs">
                          <div>
                            <span class="text-slate-500">Buy Price: </span>
                            <span class="text-slate-700 tabular-nums">{{ item.buy_price / 1_000_000 | number:'1.2-2' }}M</span>
                          </div>
                          <div>
                            <span class="text-slate-500">Current: </span>
                            <span class="text-blue-700 tabular-nums">{{ item.current_price / 1_000_000 | number:'1.2-2' }}M</span>
                          </div>
                          <div>
                            <span class="text-slate-500">Cost: </span>
                            <span class="text-slate-700 tabular-nums">{{ item.cost_basis / 1_000_000 | number:'1.0-0' }}M</span>
                          </div>
                          <div>
                            <span class="text-slate-500">Value: </span>
                            <span class="text-blue-700 tabular-nums">{{ item.current_value / 1_000_000 | number:'1.0-0' }}M</span>
                          </div>
                          <div class="col-span-2">
                            <span class="text-slate-500">P&L: </span>
                            <span class="font-semibold tabular-nums" [class]="item.pnl >= 0 ? 'text-emerald-700' : 'text-red-600'">
                              {{ item.pnl >= 0 ? '+' : '' }}{{ item.pnl / 1_000_000 | number:'1.2-2' }}M
                              ({{ item.pnl_pct >= 0 ? '+' : '' }}{{ item.pnl_pct | number:'1.2-2' }}%)
                            </span>
                          </div>
                        </div>
                        @if (item.note) {
                          <p class="text-xs text-slate-500 mt-1.5 italic">{{ item.note }}</p>
                        }
                      </div>
                      <div class="flex flex-col gap-1.5 shrink-0" (click)="$event.stopPropagation()">
                        <button (click)="editItem(item)" class="text-xs text-blue-600 hover:text-blue-500 px-2 py-1 rounded-lg hover:bg-blue-500/10 transition-colors">
                          Edit
                        </button>
                        <button (click)="deleteItem(item.id)" class="text-xs text-red-600 hover:text-red-500 px-2 py-1 rounded-lg hover:bg-red-50 transition-colors">
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                }
              </div>
            }
          </div>
        </div>
      }
    </div>
  `
})
export class PortfolioComponent implements OnInit {
  private api = inject(ApiService);
  auth = inject(AuthService);

  items = signal<PortfolioItem[]>([]);
  goldRates = signal<GoldRate[]>([]);
  loading = signal(false);
  submitting = signal(false);
  editId = signal<number | null>(null);
  selectedIds = signal<Set<number>>(new Set());

  form: AddForm = this.emptyForm();

  computedSummary = computed(() => {
    const allItems = this.items();
    const selected = this.selectedIds();
    
    const targetItems = selected.size > 0 
      ? allItems.filter(item => selected.has(item.id))
      : allItems;
      
    if (targetItems.length === 0 && allItems.length > 0 && selected.size > 0) return null;
    if (allItems.length === 0) return null;
    
    const total_cost = targetItems.reduce((acc, item) => acc + item.cost_basis, 0);
    const total_value = targetItems.reduce((acc, item) => acc + item.current_value, 0);
    const total_pnl = total_value - total_cost;
    const total_pnl_pct = total_cost > 0 ? (total_pnl / total_cost) * 100 : 0;
    
    return { total_cost, total_value, total_pnl, total_pnl_pct };
  });

  ngOnInit() {
    if (this.auth.isLoggedIn()) {
      this.load();
      this.loadRates();
    }
  }

  load() {
    this.loading.set(true);
    this.api.getPortfolio().subscribe({
      next: res => {
        this.items.set(res.data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  loadRates() {
    this.api.getRates().subscribe({
      next: res => {
        this.goldRates.set(res.data);
        if (res.data.length > 0 && !this.editId()) {
          this.form.code = res.data[0].code;
        }
      }
    });
  }

  toggleSelection(id: number) {
    const current = new Set(this.selectedIds());
    if (current.has(id)) {
      current.delete(id);
    } else {
      current.add(id);
    }
    this.selectedIds.set(current);
  }

  isSelected(id: number): boolean {
    return this.selectedIds().has(id);
  }

  clearSelection() {
    this.selectedIds.set(new Set());
  }

  submit() {
    if (!this.form.quantity || !this.form.buy_price || !this.form.buy_date) return;
    this.submitting.set(true);

    const payload = {
      code: this.form.code,
      quantity: this.form.quantity,
      buy_price: this.form.buy_price,
      buy_date: this.form.buy_date,
      note: this.form.note,
    };

    const req = this.editId()
      ? this.api.updatePortfolio(this.editId()!, payload)
      : this.api.addPortfolio(payload);

    req.subscribe({
      next: () => { 
        this.form = this.emptyForm(); 
        this.editId.set(null); 
        this.submitting.set(false); 
        this.load(); 
      },
      error: () => this.submitting.set(false),
    });
  }

  getProductName(code: string): string {
    const rate = this.goldRates().find(r => r.code === code);
    if (!rate) return code;
    return rate.name;
  }

  editItem(item: PortfolioItem) {
    this.editId.set(item.id);
    this.form = { code: item.code, quantity: item.quantity, buy_price: item.buy_price, buy_date: item.buy_date, note: item.note };
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  cancelEdit() {
    this.editId.set(null);
    this.form = this.emptyForm();
  }

  deleteItem(id: number) {
    if (!confirm('Delete this transaction?')) return;
    this.api.deletePortfolio(id).subscribe({ 
      next: () => {
        this.load();
        if (this.isSelected(id)) {
          const current = new Set(this.selectedIds());
          current.delete(id);
          this.selectedIds.set(current);
        }
      } 
    });
  }

  private emptyForm(): AddForm {
    const defaultCode = this.goldRates().length > 0 ? this.goldRates()[0].code : 'SJC9999';
    return { code: defaultCode, quantity: null, buy_price: null, buy_date: '', note: '' };
  }
}
