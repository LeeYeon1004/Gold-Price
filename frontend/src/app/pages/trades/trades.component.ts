import { Component, OnInit, OnDestroy, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { RatesService } from '../../services/rates.service';
import { MemberService } from '../../services/member.service';
import { PortfolioItem } from '../../models/gold.model';

interface SellForm {
  sell_quantity: number | null;
  sell_price: number | null;
  sell_date: string;
  market_price_at_sell: number | null;
}

@Component({
  selector: 'app-trades',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './trades.component.html',
})
export class TradesComponent implements OnInit, OnDestroy {
  private api = inject(ApiService);
  auth = inject(AuthService);
  ratesService = inject(RatesService);
  memberSvc = inject(MemberService);

  constructor() {
    effect(() => {
      const _ = this.memberSvc.activeMemberId();
      if (this.auth.isLoggedIn()) this.load();
    });
  }

  allItems = signal<PortfolioItem[]>([]);
  loading = signal(false);
  submitting = signal(false);
  sellError = signal<string | null>(null);

  sellTargetId = signal<number | null>(null);
  sellForm: SellForm = this.emptySellForm();

  reopenTargetId = signal<number | null>(null);

  holding = computed(() => this.allItems().filter(i => !i.sell_date));
  sold    = computed(() => this.allItems().filter(i => !!i.sell_date));

  totalRealisedPnl   = computed(() => this.sold().reduce((s, i) => s + this.sellPnl(i), 0));
  totalUnrealisedPnl = computed(() => this.holding().reduce((s, i) => s + i.pnl, 0));

  ngOnInit() {
    if (this.auth.isLoggedIn()) {
      this.memberSvc.load();
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
    const anyOpen = this.sellTargetId() !== null || this.reopenTargetId() !== null;
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
    this.loading.set(true);
    this.api.getPortfolio(this.memberSvc.activeMemberId()).subscribe({
      next: res => { this.allItems.set(res.data); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  getProductName(code: string): string {
    const rate = this.ratesService.rates().find(r => r.code === code);
    return rate ? rate.name : code;
  }

  // ─── Sell ────────────────────────────────────────────────────────────────

  openSell(item: PortfolioItem) {
    this.sellTargetId.set(item.id);
    const market = this.ratesService.rates().find(r => r.code === item.code)?.buy_price ?? null;
    this.sellForm = {
      sell_quantity: item.quantity,
      sell_price: market,
      sell_date: new Date().toISOString().slice(0, 10),
      market_price_at_sell: market,
    };
    this.syncBodyScroll();
  }

  cancelSell() {
    this.sellTargetId.set(null);
    this.sellForm = this.emptySellForm();
    this.sellError.set(null);
    this.syncBodyScroll();
  }

  confirmSell() {
    const id = this.sellTargetId();
    const item = this.getSellTargetItem();
    const qty = Number(this.sellForm.sell_quantity);
    const price = Number(this.sellForm.sell_price);

    if (!id || !item) { this.sellError.set('Item not found.'); return; }
    if (!price || price <= 0) { this.sellError.set('No sell price available.'); return; }
    if (!this.sellForm.sell_date) { this.sellError.set('Sell date is required.'); return; }
    if (!qty || qty <= 0) { this.sellError.set('Enter a valid quantity.'); return; }
    if (qty > item.quantity) { this.sellError.set(`Max quantity is ${item.quantity}.`); return; }

    this.sellError.set(null);
    this.submitting.set(true);
    this.api.sellPortfolio(id, {
      sell_price: price,
      sell_date: this.sellForm.sell_date,
      sell_quantity: qty,
      market_price_at_sell: this.sellForm.market_price_at_sell ?? undefined,
    }).subscribe({
      next: () => {
        this.submitting.set(false);
        this.sellTargetId.set(null);
        this.sellError.set(null);
        this.syncBodyScroll();
        this.load();
      },
      error: (err) => {
        this.submitting.set(false);
        this.sellError.set(err?.error?.error ?? 'Something went wrong. Please try again.');
      },
    });
  }

  // ─── Reopen ──────────────────────────────────────────────────────────────

  requestReopen(id: number) { this.reopenTargetId.set(id); this.syncBodyScroll(); }
  cancelReopen() { this.reopenTargetId.set(null); this.syncBodyScroll(); }

  confirmReopen() {
    const id = this.reopenTargetId();
    if (!id) return;
    this.reopenTargetId.set(null);
    this.syncBodyScroll();
    this.api.reopenPortfolio(id).subscribe({ next: () => this.load() });
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────

  sellPnl(item: PortfolioItem): number {
    if (!item.sell_price) return 0;
    return (item.sell_price - item.buy_price) * item.quantity;
  }

  sellPnlPct(item: PortfolioItem): number {
    const cost = item.buy_price * item.quantity;
    return cost > 0 ? (this.sellPnl(item) / cost) * 100 : 0;
  }

  sellVsMarket(item: PortfolioItem): number | null {
    if (!item.sell_price || !item.market_price_at_sell) return null;
    return (item.sell_price - item.market_price_at_sell) * item.quantity;
  }

  getSellTargetItem(): PortfolioItem | null {
    const id = this.sellTargetId();
    return id ? (this.allItems().find(i => i.id === id) ?? null) : null;
  }

  private emptySellForm(): SellForm {
    return { sell_quantity: null, sell_price: null, sell_date: new Date().toISOString().slice(0, 10), market_price_at_sell: null };
  }
}
