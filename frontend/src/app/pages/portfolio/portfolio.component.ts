import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { PortfolioItem, PortfolioSummary } from '../../models/gold.model';

interface AddForm {
  code: string;
  quantity: number | null;
  buy_price: number | null;
  buy_date: string;
  note: string;
}

@Component({
  selector: 'app-portfolio',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 animate-fade-in">

      <!-- Not logged in -->
      @if (!auth.isLoggedIn()) {
        <div class="card text-center py-16">
          <div class="text-5xl mb-4">🔒</div>
          <h2 class="text-xl font-semibold text-gray-200 mb-2">Đăng nhập để xem danh mục</h2>
          <p class="text-gray-500 mb-6">Theo dõi lãi/lỗ vàng đã mua của bạn</p>
          <a routerLink="/login" class="btn-primary inline-block">Đăng nhập ngay</a>
        </div>
      }

      @if (auth.isLoggedIn()) {
        <!-- Summary cards -->
        @if (summary()) {
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div class="card-sm animate-slide-up">
              <p class="text-xs text-gray-500 uppercase tracking-wider">Tổng vốn</p>
              <p class="text-lg font-bold text-gray-200 tabular-nums mt-1">
                {{ summary()!.total_cost / 1_000_000 | number:'1.0-0' }}M
              </p>
            </div>
            <div class="card-sm animate-slide-up" style="animation-delay:0.05s">
              <p class="text-xs text-gray-500 uppercase tracking-wider">Giá trị hiện tại</p>
              <p class="text-lg font-bold text-amber-400 tabular-nums mt-1">
                {{ summary()!.total_value / 1_000_000 | number:'1.0-0' }}M
              </p>
            </div>
            <div class="card-sm animate-slide-up" style="animation-delay:0.1s">
              <p class="text-xs text-gray-500 uppercase tracking-wider">Lãi / Lỗ</p>
              <p class="text-lg font-bold tabular-nums mt-1"
                 [class]="summary()!.total_pnl >= 0 ? 'text-emerald-400' : 'text-red-400'">
                {{ summary()!.total_pnl >= 0 ? '+' : '' }}{{ summary()!.total_pnl / 1_000_000 | number:'1.0-0' }}M
              </p>
            </div>
            <div class="card-sm animate-slide-up" style="animation-delay:0.15s">
              <p class="text-xs text-gray-500 uppercase tracking-wider">% Lợi nhuận</p>
              <p class="text-lg font-bold tabular-nums mt-1"
                 [class]="summary()!.total_pnl_pct >= 0 ? 'text-emerald-400' : 'text-red-400'">
                {{ summary()!.total_pnl_pct >= 0 ? '+' : '' }}{{ summary()!.total_pnl_pct | number:'1.2-2' }}%
              </p>
            </div>
          </div>
        }

        <div class="grid grid-cols-1 xl:grid-cols-3 gap-6">

          <!-- Add form -->
          <div class="card xl:col-span-1">
            <h2 class="text-base font-semibold text-gray-100 mb-4">
              {{ editId() ? 'Chỉnh sửa giao dịch' : 'Thêm giao dịch mới' }}
            </h2>
            <form (ngSubmit)="submit()" class="space-y-3">
              <div>
                <label class="text-xs text-gray-400 mb-1 block">Loại vàng</label>
                <select [(ngModel)]="form.code" name="code" class="input-field text-sm">
                  <option value="SJC">SJC</option>
                  <option value="BTMH">Bảo Tín Mạnh Hải</option>
                  <option value="PNJ">PNJ</option>
                  <option value="DOJI">DOJI</option>
                  <option value="KHS">Kim Gia Bảo Hoa Sen</option>
                </select>
              </div>

              <div>
                <label class="text-xs text-gray-400 mb-1 block">Số lượng (chỉ/lượng)</label>
                <input [(ngModel)]="form.quantity" name="quantity" type="number" step="0.1" min="0.1"
                  placeholder="Ví dụ: 2.5" class="input-field text-sm" required/>
              </div>

              <div>
                <label class="text-xs text-gray-400 mb-1 block">Giá mua (đ/đơn vị)</label>
                <input [(ngModel)]="form.buy_price" name="buy_price" type="number" step="1000" min="0"
                  placeholder="Ví dụ: 87000000" class="input-field text-sm" required/>
                @if (form.buy_price) {
                  <p class="text-xs text-amber-400 mt-1">
                    = {{ form.buy_price / 1_000_000 | number:'1.2-2' }}M đ
                  </p>
                }
              </div>

              <div>
                <label class="text-xs text-gray-400 mb-1 block">Ngày mua</label>
                <input [(ngModel)]="form.buy_date" name="buy_date" type="date"
                  class="input-field text-sm" required/>
              </div>

              <div>
                <label class="text-xs text-gray-400 mb-1 block">Ghi chú (tùy chọn)</label>
                <input [(ngModel)]="form.note" name="note" type="text"
                  placeholder="Ví dụ: Mua tại Bảo Tín" class="input-field text-sm"/>
              </div>

              @if (form.quantity && form.buy_price) {
                <div class="bg-gray-800/60 rounded-xl p-3 text-xs text-gray-400 space-y-1">
                  <div class="flex justify-between">
                    <span>Tổng vốn bỏ ra:</span>
                    <span class="text-gray-200 font-semibold">
                      {{ (form.quantity * form.buy_price) / 1_000_000 | number:'1.2-2' }}M đ
                    </span>
                  </div>
                </div>
              }

              <div class="flex gap-2 pt-1">
                <button type="submit" [disabled]="submitting()" class="btn-primary flex-1 text-sm">
                  {{ submitting() ? 'Đang lưu...' : (editId() ? 'Cập nhật' : 'Thêm vào danh mục') }}
                </button>
                @if (editId()) {
                  <button type="button" (click)="cancelEdit()" class="btn-secondary text-sm px-3">Hủy</button>
                }
              </div>
            </form>
          </div>

          <!-- Portfolio list -->
          <div class="card xl:col-span-2">
            <h2 class="text-base font-semibold text-gray-100 mb-4">Danh mục của bạn</h2>

            @if (loading()) {
              <div class="space-y-3">
                @for (i of [1,2,3]; track i) {
                  <div class="shimmer h-20 rounded-xl"></div>
                }
              </div>
            } @else if (!items().length) {
              <div class="text-center py-12 text-gray-500">
                <div class="text-4xl mb-3">💰</div>
                <p class="text-sm">Chưa có giao dịch nào. Hãy thêm giao dịch đầu tiên!</p>
              </div>
            } @else {
              <div class="space-y-3">
                @for (item of items(); track item.id) {
                  <div class="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4 hover:border-gray-600 transition-colors animate-slide-up">
                    <div class="flex items-start justify-between gap-3">
                      <div class="flex-1 min-w-0">
                        <div class="flex items-center gap-2 flex-wrap">
                          <span class="font-semibold text-gray-100 text-sm">{{ item.code }}</span>
                          <span class="text-xs text-gray-500">{{ item.quantity }} đơn vị</span>
                          <span class="text-xs text-gray-600">{{ item.buy_date }}</span>
                        </div>
                        <div class="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1 text-xs">
                          <div>
                            <span class="text-gray-500">Giá mua: </span>
                            <span class="text-gray-300 tabular-nums">{{ item.buy_price / 1_000_000 | number:'1.2-2' }}M</span>
                          </div>
                          <div>
                            <span class="text-gray-500">Hiện tại: </span>
                            <span class="text-amber-400 tabular-nums">{{ item.current_price / 1_000_000 | number:'1.2-2' }}M</span>
                          </div>
                          <div>
                            <span class="text-gray-500">Vốn: </span>
                            <span class="text-gray-300 tabular-nums">{{ item.cost_basis / 1_000_000 | number:'1.0-0' }}M</span>
                          </div>
                          <div>
                            <span class="text-gray-500">Giá trị: </span>
                            <span class="text-amber-400 tabular-nums">{{ item.current_value / 1_000_000 | number:'1.0-0' }}M</span>
                          </div>
                          <div class="col-span-2">
                            <span class="text-gray-500">Lãi/Lỗ: </span>
                            <span class="font-semibold tabular-nums" [class]="item.pnl >= 0 ? 'text-emerald-400' : 'text-red-400'">
                              {{ item.pnl >= 0 ? '+' : '' }}{{ item.pnl / 1_000_000 | number:'1.2-2' }}M
                              ({{ item.pnl_pct >= 0 ? '+' : '' }}{{ item.pnl_pct | number:'1.2-2' }}%)
                            </span>
                          </div>
                        </div>
                        @if (item.note) {
                          <p class="text-xs text-gray-500 mt-1.5 italic">{{ item.note }}</p>
                        }
                      </div>
                      <div class="flex flex-col gap-1.5 shrink-0">
                        <button (click)="editItem(item)" class="text-xs text-blue-400 hover:text-blue-300 px-2 py-1 rounded-lg hover:bg-blue-500/10 transition-colors">
                          Sửa
                        </button>
                        <button (click)="deleteItem(item.id)" class="text-xs text-red-400 hover:text-red-300 px-2 py-1 rounded-lg hover:bg-red-500/10 transition-colors">
                          Xóa
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
  summary = signal<PortfolioSummary | null>(null);
  loading = signal(false);
  submitting = signal(false);
  editId = signal<number | null>(null);

  form: AddForm = this.emptyForm();

  ngOnInit() {
    if (this.auth.isLoggedIn()) this.load();
  }

  load() {
    this.loading.set(true);
    this.api.getPortfolio().subscribe({
      next: res => {
        this.items.set(res.data);
        this.summary.set(res.summary);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
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
      next: () => { this.form = this.emptyForm(); this.editId.set(null); this.submitting.set(false); this.load(); },
      error: () => this.submitting.set(false),
    });
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
    if (!confirm('Xóa giao dịch này?')) return;
    this.api.deletePortfolio(id).subscribe({ next: () => this.load() });
  }

  private emptyForm(): AddForm {
    return { code: 'SJC', quantity: null, buy_price: null, buy_date: '', note: '' };
  }
}
