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
