import { getApiBaseUrl } from './userApi';
import { Signal, StrategyType } from '../types';

/**
 * Fetch signals from backend GET /api/signals.
 * Currently only Super Engulfing is stored via webhook; other strategies return [].
 */
export async function fetchSignals(strategyType?: StrategyType, limit = 1000): Promise<Signal[]> {
  try {
    const baseUrl = getApiBaseUrl();
    const params = new URLSearchParams();
    if (strategyType) params.set('strategyType', strategyType);
    const url = `${baseUrl}/signals${params.toString() ? `?${params.toString()}` : ''}`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    const list = Array.isArray(data) ? data : [];
    return (list as Signal[]).slice(0, limit);
  } catch {
    return [];
  }
}

/**
 * Fetch a single signal by its ID from GET /api/signals/:id.
 */
export async function fetchSignalById(id: string): Promise<Signal | null> {
  try {
    const baseUrl = getApiBaseUrl();
    const res = await fetch(`${baseUrl}/signals/${id}`);
    if (!res.ok) return null;
    return (await res.json()) as Signal;
  } catch {
    return null;
  }
}

/**
 * Trigger a manual scan for all strategies.
 */
export async function scanAll(): Promise<{ status: string }> {
  try {
    const baseUrl = getApiBaseUrl();
    console.log('[signalsApi] Triggering manual scan at', `${baseUrl}/signals/scan`);
    const res = await fetch(`${baseUrl}/signals/scan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) throw new Error('Scan failed');
    return await res.json();
  } catch (err) {
    console.error('Manual scan error:', err);
    throw err;
  }
}

/**
 * Fetch live ICT bias for all symbols in the given timeframe.
 * Returns { [symbol]: { bias, prevHigh, prevLow, direction } }
 */
export async function fetchLiveBias(
  timeframe: string,
): Promise<Record<string, { bias: string; prevHigh: number; prevLow: number; direction: string }>> {
  try {
    const baseUrl = getApiBaseUrl();
    const res = await fetch(`${baseUrl}/signals/live-bias?timeframe=${encodeURIComponent(timeframe)}`);
    if (!res.ok) return {};
    return (await res.json()) as Record<string, { bias: string; prevHigh: number; prevLow: number; direction: string }>;
  } catch {
    return {};
  }
}

/**
 * Signal statistics from backend lifecycle tracking.
 */
export interface SignalStats {
  total: number;
  active: number;
  won: number;
  lost: number;
  expired: number;
  winRate: number;
  avgWinPnl: number;
  avgLossPnl: number;
  live: number;
  closedSignals: number;
  archived: number;
}

/**
 * Fetch aggregated signal statistics.
 */
export async function fetchSignalStats(strategyType?: string): Promise<SignalStats> {
  try {
    const baseUrl = getApiBaseUrl();
    const params = new URLSearchParams();
    if (strategyType) params.set('strategyType', strategyType);
    const url = `${baseUrl}/signals/stats${params.toString() ? `?${params.toString()}` : ''}`;
    const res = await fetch(url);
    if (!res.ok) return { total: 0, active: 0, won: 0, lost: 0, expired: 0, winRate: 0, avgWinPnl: 0, avgLossPnl: 0, live: 0, closedSignals: 0, archived: 0 };
    return (await res.json()) as SignalStats;
  } catch {
    return { total: 0, active: 0, won: 0, lost: 0, expired: 0, winRate: 0, avgWinPnl: 0, avgLossPnl: 0, live: 0, closedSignals: 0, archived: 0 };
  }
}

/**
 * Trigger manual scan for signals
 */
export async function scanSuperEngulfing(_timeframe?: string): Promise<{ totalSignals: number; symbolsScanned: number; timeframesScanned: number }> {
  try {
    const baseUrl = getApiBaseUrl();
    const url = `${baseUrl}/signals/scan`;
    const res = await fetch(url, { method: 'POST' });
    if (!res.ok) throw new Error('Scan failed');
    // The backend currently returns { status: 'Scan completed' }. We mock the rest for the UI.
    return { totalSignals: 0, symbolsScanned: 0, timeframesScanned: 0 };
  } catch (error) {
    throw error;
  }
}

