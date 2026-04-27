import { Component, OnInit, OnDestroy, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { RatesService } from '../../services/rates.service';
import { MemberService } from '../../services/member.service';
import { PortfolioItem } from '../../models/gold.model';
import { FlatpickrDirective } from '../../directives/flatpickr.directive';

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
  imports: [CommonModule, FormsModule, RouterLink, FlatpickrDirective],
  templateUrl: './portfolio.component.html',
})
export class PortfolioComponent implements OnInit, OnDestroy {
  private api = inject(ApiService);
  auth = inject(AuthService);
  ratesService = inject(RatesService);
  memberSvc = inject(MemberService);

  constructor() {
    effect(() => {
      // Reload when active member changes
      const _ = this.memberSvc.activeMemberId();
      if (this.auth.isLoggedIn()) this.load();
    });
  }

  items = signal<PortfolioItem[]>([]);
  portfolioLoading = signal(false);
  loading = computed(() => this.portfolioLoading() || this.ratesService.loading());

  get goldRates() { return this.ratesService.rates; }
  submitting = signal(false);
  deletingId = signal<number | null>(null);
  editId = signal<number | null>(null);
  selectedIds = signal<Set<number>>(new Set());

  // Mobile form modal
  showFormModal = signal(false);

  // Delete confirm popup
  confirmDeleteId = signal<number | null>(null);

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
      this.ratesService.ensureLoaded();
    }
  }

  ngOnDestroy() {
    document.body.style.overflow = '';
  }

  /** Lock or unlock body scroll based on whether any modal is open.
   *  Saves/restores scroll position because iOS Safari requires
   *  position:fixed on body to prevent scroll-through on modals. */
  private scrollY = 0;
  private syncBodyScroll() {
    const anyOpen = this.showFormModal() || this.confirmDeleteId() !== null;
    if (anyOpen) {
      this.scrollY = window.scrollY;
      document.body.style.top = `-${this.scrollY}px`;
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      document.body.style.top = '';
      window.scrollTo({ top: this.scrollY, behavior: 'instant' });
    }
  }

  load() {
    this.portfolioLoading.set(true);
    this.api.getPortfolio(this.memberSvc.activeMemberId()).subscribe({
      next: res => {
        this.items.set(res.data);
        this.portfolioLoading.set(false);
      },
      error: () => this.portfolioLoading.set(false),
    });
  }

  // Auto-fill buy_price with current sell price when product changes
  onProductChange(code: string) {
    this.form.code = code;
    this.fillCurrentPrice(code);
  }

  private fillCurrentPrice(code: string) {
    const rate = this.goldRates().find(r => r.code === code);
    if (rate?.sell_price && rate.sell_price > 1) {
      this.form.buy_price = rate.sell_price;
    }
  }

  toggleSelection(id: number) {
    const current = new Set(this.selectedIds());
    if (current.has(id)) current.delete(id);
    else current.add(id);
    this.selectedIds.set(current);
  }

  isSelected(id: number): boolean {
    return this.selectedIds().has(id);
  }

  clearSelection() {
    this.selectedIds.set(new Set());
  }

  openAddForm() {
    this.editId.set(null);
    this.form = this.emptyForm();
    this.showFormModal.set(true);
    this.syncBodyScroll();
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
      : this.api.addPortfolio(payload, this.memberSvc.activeMemberId());

    req.subscribe({
      next: () => {
        this.form = this.emptyForm();
        this.editId.set(null);
        this.submitting.set(false);
        this.showFormModal.set(false);
        this.syncBodyScroll();
        this.load();
      },
      error: () => this.submitting.set(false),
    });
  }

  getProductName(code: string): string {
    const rate = this.goldRates().find(r => r.code === code);
    return rate ? rate.name : code;
  }

  getCurrentSellPrice(code: string): number {
    const rate = this.goldRates().find(r => r.code === code);
    return rate?.sell_price ?? 0;
  }

  editItem(item: PortfolioItem) {
    this.editId.set(item.id);
    const buyDate = item.buy_date ? item.buy_date.toString().slice(0, 10) : '';
    this.form = {
      code: item.code,
      quantity: item.quantity,
      buy_price: item.buy_price,
      buy_date: buyDate,
      note: item.note,
    };
    this.showFormModal.set(true);
    this.syncBodyScroll();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  cancelEdit() {
    this.editId.set(null);
    this.form = this.emptyForm();
    this.showFormModal.set(false);
    this.syncBodyScroll();
  }

  // Show delete confirm popup
  requestDelete(id: number) {
    this.confirmDeleteId.set(id);
    this.syncBodyScroll();
  }

  cancelDelete() {
    this.confirmDeleteId.set(null);
    this.syncBodyScroll();
  }

  confirmDelete() {
    const id = this.confirmDeleteId();
    if (id === null) return;
    this.confirmDeleteId.set(null);
    this.syncBodyScroll();
    this.deletingId.set(id);
    this.api.deletePortfolio(id).subscribe({
      next: () => {
        this.deletingId.set(null);
        if (this.isSelected(id)) {
          const current = new Set(this.selectedIds());
          current.delete(id);
          this.selectedIds.set(current);
        }
        this.load();
      },
      error: () => this.deletingId.set(null),
    });
  }

  getConfirmDeleteName(): string {
    const id = this.confirmDeleteId();
    if (id === null) return '';
    const item = this.items().find(i => i.id === id);
    return item ? this.getProductName(item.code) : '';
  }

  private emptyForm(): AddForm {
    const first = this.goldRates().find(r => r.sell_price > 1 && r.buy_price > 1);
    const defaultCode = first?.code ?? 'SJC9999';
    const defaultPrice = this.getCurrentSellPrice(defaultCode);
    const today = new Date().toISOString().slice(0, 10);
    return { code: defaultCode, quantity: null, buy_price: defaultPrice || null, buy_date: today, note: '' };
  }
}
