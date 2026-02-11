// User types
export interface User {
  id: string;
  email: string;
  name?: string;
  subscriptionId?: string;
  isAdmin?: boolean;
  createdAt: string;
  updatedAt: string;
}

// Signal types
export type StrategyType = 'RSI_DIVERGENCE' | 'SUPER_ENGULFING' | 'ICT_BIAS';
export type SignalType = 'BUY' | 'SELL';
export type Timeframe = '5m' | '15m' | '1h' | '4h' | '1d' | '1w';
export type SignalStatus = 'ACTIVE' | 'EXPIRED' | 'FILLED' | 'CLOSED';

export interface Signal {
  id: string;
  strategyType: StrategyType;
  symbol: string;
  timeframe: Timeframe;
  signalType: SignalType;
  price: number;
  detectedAt: string;
  status: SignalStatus;
  metadata?: Record<string, any>;
}

// Candle types
export interface Candle {
  id: string;
  symbol: string;
  timeframe: Timeframe;
  openTime: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  quoteVolume?: number;
}

// Strategy types
export interface Strategy {
  id: string;
  userId: string;
  name: string;
  strategyType: StrategyType;
  parameters: Record<string, any>;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

// Subscription types
export interface Subscription {
  id: string;
  name: string;
  price: number;
  features: Record<string, any>;
  limits: Record<string, any>;
  billingPeriod?: 'monthly' | 'yearly' | 'lifetime';
  isActive?: boolean;
  sortOrder?: number;
  cryptoCurrencies?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface UserSubscription {
  id: string;
  userId: string;
  subscriptionId: string;
  status: 'active' | 'expired' | 'cancelled' | 'pending_payment';
  startedAt?: string;
  expiresAt?: string;
  renewalDate?: string;
  autoRenew: boolean;
  paymentId?: string;
  subscription?: Subscription;
  createdAt: string;
  updatedAt: string;
}

export interface SubscriptionPayment {
  id: string;
  userId: string;
  subscriptionId: string;
  paymentId: string;
  amount: number;
  currency: string;
  status: string;
  payAddress?: string;
  paymentUrl?: string;
  createdAt: string;
  updatedAt: string;
}

// RSI Divergence types
export interface RSIDivergence {
  type: 'BULLISH' | 'BEARISH';
  priceLow: number;
  priceHigh: number;
  rsiLow: number;
  rsiHigh: number;
  timestamp: number;
  pivotIndex: number;
}

// Super Engulfing types
export interface SuperEngulfing {
  type: 'BULLISH' | 'BEARISH';
  previousCandle: Candle;
  currentCandle: Candle;
  hasWickFilter?: boolean;
  is3X?: boolean;
}

// ICT Bias types
export type BiasType = 'BULLISH' | 'BEARISH' | 'RANGING' | 'UNKNOWN';

export interface ICTBias {
  bias: BiasType;
  message: string;
  high: number;
  low: number;
  isValid: boolean;
}
