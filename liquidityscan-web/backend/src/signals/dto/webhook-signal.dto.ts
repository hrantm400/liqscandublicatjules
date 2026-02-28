import { IsString, IsNumber, IsOptional, IsIn, IsObject } from 'class-validator';

/** Allowed timeframes for different strategies */
export const SUPER_ENGULFING_TIMEFRAMES = ['4h', '1d', '1w'] as const;
export const RSI_DIVERGENCE_TIMEFRAMES = ['1h', '4h', '1d'] as const;
export const ICT_BIAS_TIMEFRAMES = ['4h', '1d', '1w'] as const;
export const STRATEGY_1_TIMEFRAMES = ['5m'] as const;
export const CONFLUENCE_TIMEFRAMES = ['5m', '15m'] as const;

export const ALL_TIMEFRAMES = [
  ...new Set([
    ...SUPER_ENGULFING_TIMEFRAMES,
    ...RSI_DIVERGENCE_TIMEFRAMES,
    ...ICT_BIAS_TIMEFRAMES,
    ...STRATEGY_1_TIMEFRAMES,
    ...CONFLUENCE_TIMEFRAMES,
  ]),
] as const;

export const ALL_STRATEGY_TYPES = [
  'SUPER_ENGULFING',
  'RSI_DIVERGENCE',
  'ICT_BIAS',
  'STRATEGY_1',
  'CONFLUENCE',
] as const;

export class WebhookSignalDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsString()
  @IsIn(ALL_STRATEGY_TYPES)
  strategyType: string;

  @IsString()
  symbol: string;

  @IsString()
  @IsIn(ALL_TIMEFRAMES)
  timeframe: string;

  @IsString()
  @IsIn(['BUY', 'SELL', 'NEUTRAL'])
  signalType: string;

  @IsNumber()
  price: number;

  @IsOptional()
  @IsString()
  detectedAt?: string;

  @IsOptional()
  @IsString()
  @IsIn(['ACTIVE', 'EXPIRED', 'FILLED', 'CLOSED', 'HIT_TP', 'HIT_SL'])
  status?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
