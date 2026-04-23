export interface GoldRate {
  id: number;
  code: string;
  name: string;
  vendor_name: string;
  buy_price: number;
  sell_price: number;
  trend: 'up' | 'down' | 'neutral';
  unit: string;
  fetched_at: string;
}

export interface ChartDataPoint {
  date: string;
  buy: number;
  sell: number;
}

export interface GoldChartData {
  data_points: ChartDataPoint[];
  default_product: string;
  product_options: { value: string; label: string }[];
}

export interface PortfolioItem {
  id: number;
  user_id: number;
  code: string;
  quantity: number;
  buy_price: number;
  buy_date: string;
  note: string;
  created_at: string;
  // sell info (null = still holding)
  sell_price: number | null;
  sell_date: string | null;
  market_price_at_sell: number | null;
  // enriched by backend
  current_price: number;
  cost_basis: number;
  current_value: number;
  pnl: number;
  pnl_pct: number;
}

export interface PortfolioSummary {
  total_cost: number;
  total_value: number;
  total_pnl: number;
  total_pnl_pct: number;
}

export interface User {
  id: number;
  username: string;
}

export interface Member {
  id: number;
  name: string;
  created_at: string;
}
