// TradeMaster Pro - Type Definitions

export interface Trade {
  id: string;
  datetime: string; // ISO string
  symbol: string;
  direction: 'Long' | 'Short';
  market_timing: 'Market' | 'Pre-Market' | 'After-Hours';
  position_size: number;
  entry_price: number;
  exit_price?: number;
  risk_level: 1 | 2 | 3; // 1=low, 2=medium, 3=high
  planned_stop_loss: number;
  entry_reason: string; // Reference to EntryReason
  emotional_entry: string; // Reference to EmotionalState
  result_dollars?: number;
  result_r_units?: number;
  result_percentage?: number;
  emotional_state?: string;
  followed_plan?: 'Yes' | 'No' | 'Partially';
  discipline_rating?: 1 | 2 | 3 | 4 | 5; // 1-5 stars
  entry_chart_url?: string;
  exit_chart_url?: string;
  what_worked?: string;
  what_to_improve?: string;
  notes?: string;
  created_at: string; // ISO string
  updated_at: string; // ISO string
}

export interface Capital {
  id: string;
  date: string; // YYYY-MM-DD format
  actual_datetime: string; // ISO string - critical for calculations
  amount: number;
  type: 'Initial' | 'Deposit' | 'Withdrawal' | 'Reconciliation';
  notes?: string;
  created_at: string; // ISO string
}

export interface EntryReason {
  id: string;
  name: string;
  is_active: boolean;
  created_at: string; // ISO string
  updated_at: string; // ISO string
}

export interface EmotionalState {
  id: string;
  name: string;
  is_active: boolean;
  created_at: string; // ISO string
  updated_at: string; // ISO string
}

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: string;
  risk_per_trade_percent: number; // e.g., 1.0 for 1%
  initial_capital_historical: number;
  created_at: string; // ISO string
  updated_at: string; // ISO string
}

// Extended types for calculations and display
export interface TradeWithCalculations extends Trade {
  is_open: boolean;
  current_price?: number;
  daily_change?: number;
  unrealized_pnl?: number;
  unrealized_r_units?: number;
  unrealized_percentage?: number;
}

export interface CapitalSummary {
  base_capital: number;
  realized_pnl: number;
  unrealized_pnl: number;
  total_equity: number;
  last_reconciliation_date?: string;
}

export interface DashboardKPIs {
  win_rate: number;
  average_r: number;
  total_r: number;
  total_profit_loss: number;
  total_trades: number;
  winning_trades: number;
  losing_trades: number;
}

export interface MarketData {
  symbol: string;
  price: number;
  change: number;
  change_percent: number;
  timestamp: string;
}

export interface TradePerformanceByStrategy {
  strategy: string;
  total_trades: number;
  winning_trades: number;
  win_rate: number;
  average_r: number;
  total_r: number;
}

export interface TradePerformanceByDiscipline {
  discipline_rating: number;
  total_trades: number;
  average_r: number;
}

// API Response types
export interface FinnhubQuoteResponse {
  c: number; // current price
  d: number; // change
  dp: number; // percent change
  h: number; // high price of the day
  l: number; // low price of the day
  o: number; // open price of the day
  pc: number; // previous close price
  t: number; // timestamp
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Form types
export interface TradeFormData {
  symbol: string;
  direction: 'Long' | 'Short';
  market_timing: 'Market' | 'Pre-Market' | 'After-Hours';
  position_size: number;
  entry_price: number;
  planned_stop_loss: number;
  entry_reason: string;
  emotional_entry: string;
  risk_level: 1 | 2 | 3;
  notes?: string;
  entry_chart_url?: string;
}

export interface CloseTradeFormData {
  exit_price: number;
  emotional_state: string;
  followed_plan: 'Yes' | 'No' | 'Partially';
  discipline_rating: 1 | 2 | 3 | 4 | 5;
  what_worked?: string;
  what_to_improve?: string;
  exit_chart_url?: string;
  notes?: string;
}

export interface CapitalFormData {
  amount: number;
  type: 'Initial' | 'Deposit' | 'Withdrawal' | 'Reconciliation';
  notes?: string;
}

// Filter types
export interface TradeFilters {
  symbol?: string;
  direction?: 'Long' | 'Short';
  status?: 'all' | 'open' | 'closed' | 'profit' | 'loss';
  date_from?: string;
  date_to?: string;
}

// Constants
export const RISK_LEVELS = {
  1: 'נמוך',
  2: 'בינוני', 
  3: 'גבוה'
} as const;

export const DISCIPLINE_RATINGS = {
  1: 'חלש מאוד',
  2: 'חלש',
  3: 'בינוני',
  4: 'טוב',
  5: 'מעולה'
} as const;

export const MARKET_TIMING = {
  'Market': 'שעות מסחר',
  'Pre-Market': 'לפני פתיחה',
  'After-Hours': 'אחרי סגירה'
} as const;

export const CAPITAL_TYPES = {
  'Initial': 'הון התחלתי',
  'Deposit': 'הפקדה',
  'Withdrawal': 'משיכה',
  'Reconciliation': 'התאמה'
} as const;
