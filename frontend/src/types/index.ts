// =========================================================================
// TYPESCRIPT DTO & DOMAIN INTERFACES - TFM TRADING BOT
// =========================================================================

export type StrategyType = "long_term" | "short_term";
export type DecisionAction = "BUY" | "SELL" | "HOLD";
export type OrderStatus = "filled" | "rejected" | "failed";

export interface ExecutionOrder {
  action: DecisionAction;
  symbol: string;
  quantity: number;
  price_estimated: number;
  amount_usd: number;
  reason: string;
}

export interface AIDecisionOutput {
  session_id: string;
  symbol: string;
  decision: DecisionAction;
  confidence_score: number;
  allocated_capital: number;
  orders: ExecutionOrder[];
  reasoning_markdown: string;
}

export interface AnalyzeRequest {
  user_id: string;
  symbol: string;
  strategy_type: StrategyType;
  available_capital: number;
  currency?: "USD" | "EUR" | "GBP" | "CNY";
  max_iterations?: number;
}

export interface PositionModel {
  symbol: string;
  quantity: number;
  average_price: number;
  current_price: number;
  market_value: number;
  cost_basis: number;
  profit_loss: number;
  profit_loss_pct: number;
  created_at?: string;
}

export interface PortfolioSummary {
  cash: number;
  total_positions_value: number;
  total_portfolio_value: number;
  total_cost_basis: number;
  total_profit_loss: number;
  total_profit_loss_pct: number;
}

export interface PortfolioFact {
  type: string;
  title: string;
  description: string;
}

export interface NewsItem {
  title: string;
  publisher: string;
  link: string;
  provider_publish_time: string;
}

export interface PortfolioResponse {
  summary: PortfolioSummary;
  positions: PositionModel[];
  facts: PortfolioFact[];
  news: NewsItem[];
}

export interface UserWallet {
  id: string;
  user_id: string;
  currency: string;
  balance: number;
  last_updated: string;
}

export interface UserProfile {
  id: string;
  email: string;
  role: "user" | "admin";
  created_at: string;
  raw_user_meta_data?: Record<string, unknown> | null;
}
