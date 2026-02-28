import { Injectable, Logger } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ALL_TIMEFRAMES } from './dto/webhook-signal.dto';

const MAX_SIGNALS = 5000;
const ALLOWED_TF = new Set<string>(ALL_TIMEFRAMES);

export type WebhookSignalInput = {
  id?: string;
  strategyType: string;
  symbol: string;
  timeframe: string;
  signalType: string;
  price: number;
  detectedAt?: string;
  status?: string;
  metadata?: Record<string, unknown>;
};

export class StoredSignal {
  id: string;
  strategyType: string;
  symbol: string;
  timeframe: string;
  signalType: string;
  price: number;
  detectedAt: string;
  status: string;
  metadata?: unknown;
  closedAt?: string;
  closedPrice?: number;
  pnlPercent?: number;
  outcome?: string;
}

/** Grno payload: body.signals is array of { symbol, price, signals_by_timeframe: { "1d": { signals: ["REV Bull"], price, time }, ... } } */
function transformGrnoPayloadToSignals(body: unknown): WebhookSignalInput[] {
  if (body == null || typeof body !== 'object' || !Array.isArray((body as any).signals)) {
    return [];
  }
  const grno = body as { signals: Array<{ symbol: string; price: number; signals_by_timeframe?: Record<string, { signals?: string[]; price?: number; time?: string }> }> };
  const nowIso = new Date().toISOString();
  const out: WebhookSignalInput[] = [];

  for (const item of grno.signals) {
    const symbol = String((item as any).symbol ?? '');
    const fallbackPrice = Number((item as any).current_price ?? (item as any).price) || 0;
    // Webhook sends coin.signals (timeframe map); API sends signals_by_timeframe
    let byTfRaw = (item as any).signals_by_timeframe ?? (item as any).signalsByTimeframe ?? (item as any).signals;
    if (!byTfRaw || typeof byTfRaw !== 'object' || Array.isArray(byTfRaw)) {
      // Fallback: coin may have 4h/1d/1w at top level
      byTfRaw = {};
      for (const tf of ['4h', '1d', '1w']) {
        const block = (item as any)[tf];
        if (block != null && typeof block === 'object') (byTfRaw as any)[tf] = block;
      }
    }
    const byTf = byTfRaw && typeof byTfRaw === 'object' && !Array.isArray(byTfRaw) ? byTfRaw : {};

    for (const tf of Object.keys(byTf)) {
      const tfNorm = tf.toLowerCase();
      if (!ALLOWED_TF.has(tfNorm)) continue; // ignore non-allowed timeframes
      const block = byTf[tf];
      const signalsList = Array.isArray(block?.signals) ? block.signals : (typeof (block as any)?.signal === 'string' ? [(block as any).signal] : []);
      const blockPrice = (block as any)?.current_price ?? (block as any)?.price;
      const price = typeof blockPrice === 'number' ? blockPrice : fallbackPrice;
      const detectedAt = typeof (block as any)?.time === 'string' ? (block as any).time : nowIso;
      const firstSignal = signalsList[0];
      const signalType = typeof firstSignal === 'string' && firstSignal.toLowerCase().includes('bear') ? 'SELL' : 'BUY';
      out.push({
        strategyType: 'SUPER_ENGULFING',
        symbol,
        timeframe: tfNorm,
        signalType,
        price,
        detectedAt,
      });
    }
  }
  return out;
}

@Injectable()
export class SignalsService {
  private readonly logger = new Logger(SignalsService.name);
  private signals: StoredSignal[] = [];

  constructor(private readonly prisma: PrismaService) { }

  /**
   * Normalize webhook body:
   * - Grno batch: { signals: [ { symbol, price, signals_by_timeframe }, ... ] } -> transform;
   * - Grno single: { symbol, price, signals_by_timeframe } (one coin per request) -> wrap and transform;
   * - else array or generic object -> [body].
   */
  normalizeWebhookBody(body: unknown): WebhookSignalInput[] {
    if (body != null && typeof body === 'object') {
      const b = body as Record<string, unknown>;
      if (Array.isArray(b.signals)) {
        return transformGrnoPayloadToSignals(body);
      }
      // Grno wrapper: { event, timestamp, coin: { symbol, price, signals_by_timeframe } }
      const coin = b.coin;
      if (coin != null && typeof coin === 'object') {
        const coinKeys = Object.keys(coin as object).join(',');
        this.logger.log(`Webhook body.coin keys: ${coinKeys}`);
        const out = transformGrnoPayloadToSignals({ signals: [coin] });
        if (out.length > 0) return out;
      }
      // Single-coin format: one object with symbol + signals_by_timeframe or signalsByTimeframe (no top-level "signals" array)
      const byTf = b.signals_by_timeframe ?? b.signalsByTimeframe;
      if (typeof b.symbol === 'string' && byTf != null && typeof byTf === 'object') {
        return transformGrnoPayloadToSignals({ signals: [body] });
      }
    }
    if (Array.isArray(body)) return (body as WebhookSignalInput[]);
    if (body != null && typeof body === 'object') return [body as WebhookSignalInput];
    return [];
  }

  /**
   * Add signals. Accepted strategyTypes: SUPER_ENGULFING, RSI_DIVERGENCE, ICT_BIAS.
   * If an item has signals_by_timeframe but no timeframe (raw Grno single-coin), expand it first.
   */
  async addSignals(items: Array<{ id?: string; strategyType?: string; symbol: string; timeframe?: string; signalType?: string; price: number; detectedAt?: string; status?: string; metadata?: Record<string, unknown>; signals_by_timeframe?: Record<string, unknown> }>): Promise<number> {
    const allowedStrategies = new Set(['SUPER_ENGULFING', 'RSI_DIVERGENCE', 'ICT_BIAS']);
    const allowedTf = new Set(ALL_TIMEFRAMES);
    const nowIso = new Date().toISOString();

    // Expand raw Grno objects (single-coin: have signals_by_timeframe/signalsByTimeframe but no timeframe/strategyType)
    const expanded: WebhookSignalInput[] = [];
    const first = items[0];
    const byTf = first && (first as any).signals_by_timeframe != null ? (first as any).signals_by_timeframe : first && (first as any).signalsByTimeframe;
    // this.logger.log(`addSignals: items=${items.length}, firstKeys=${first ? Object.keys(first).join(',') : 'none'}, hasByTf=${!!byTf}`);

    for (const s of items) {
      if (s.strategyType && allowedStrategies.has(s.strategyType) && s.timeframe && allowedTf.has(s.timeframe as any)) {
        expanded.push(s as WebhookSignalInput);
      } else if ((s as any).coin != null && typeof (s as any).coin === 'object') {
        const c = (s as any).coin;
        // this.logger.log(`addSignals unwrap coin keys: ${Object.keys(c).join(',')}`);
        expanded.push(...transformGrnoPayloadToSignals({ signals: [c] }));
      } else if (typeof (s as any).symbol === 'string') {
        const tf = (s as any).signals_by_timeframe ?? (s as any).signalsByTimeframe;
        if (tf != null && typeof tf === 'object') {
          expanded.push(...transformGrnoPayloadToSignals({ signals: [s] }));
        }
      }
    }
    // this.logger.log(`addSignals: expanded=${expanded.length}, toAdd will be computed`);

    const toAdd: StoredSignal[] = [];
    for (const s of expanded) {
      if (!s.strategyType || !allowedStrategies.has(s.strategyType) || !allowedTf.has(s.timeframe as any)) continue;
      const id = s.id?.trim() || `${s.strategyType}-${s.symbol}-${s.timeframe}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      toAdd.push({
        id,
        strategyType: s.strategyType,
        symbol: String(s.symbol),
        timeframe: s.timeframe,
        signalType: s.signalType,
        price: Number(s.price),
        detectedAt: s.detectedAt && typeof s.detectedAt === 'string' ? s.detectedAt : nowIso,
        status: s.status && ['ACTIVE', 'EXPIRED', 'FILLED', 'CLOSED'].includes(s.status) ? s.status : 'ACTIVE',
        metadata: s.metadata && typeof s.metadata === 'object' ? s.metadata : undefined,
      });
    }

    // In-memory cache update
    const byId = new Map(this.signals.map((x) => [x.id, x]));
    for (const s of toAdd) {
      byId.set(s.id, s);
    }
    this.signals = Array.from(byId.values());
    if (this.signals.length > MAX_SIGNALS) {
      this.signals = this.signals.slice(-MAX_SIGNALS);
    }

    if (toAdd.length > 0) {
      try {
        await (this.prisma as any).superEngulfingSignal.createMany({
          data: toAdd.map((s) => ({
            id: s.id,
            strategyType: s.strategyType,
            symbol: s.symbol,
            timeframe: s.timeframe,
            signalType: s.signalType,
            price: new Prisma.Decimal(s.price),
            detectedAt: new Date(s.detectedAt),
            status: s.status,
            metadata: s.metadata as Prisma.JsonValue | undefined,
          })),
          skipDuplicates: true,
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.error(`Failed to persist signals: ${msg}`);
      }
    }

    return toAdd.length;
  }

  /**
   * Update the status and outcome of an existing signal.
   * Called by the Position Tracker when TP/SL/Expiry is hit.
   */
  async updateSignalStatus(update: {
    id: string;
    status: string;
    outcome: string;
    closedPrice: number;
    closedAt: string;
    pnlPercent: number;
  }) {
    try {
      // 1. Update DB
      await (this.prisma as any).superEngulfingSignal.update({
        where: { id: update.id },
        data: {
          status: update.status,
          outcome: update.outcome,
          closedPrice: new Prisma.Decimal(update.closedPrice),
          closedAt: new Date(update.closedAt),
          pnlPercent: update.pnlPercent,
        },
      });

      // 2. Update in-memory cache
      const cachedSignal = this.signals.find(s => s.id === update.id);
      if (cachedSignal) {
        cachedSignal.status = update.status;
        cachedSignal.outcome = update.outcome;
        cachedSignal.closedPrice = update.closedPrice;
        cachedSignal.closedAt = update.closedAt;
        cachedSignal.pnlPercent = update.pnlPercent;
      }

      this.logger.log(`Updated signal ${update.id} to ${update.status} (PnL: ${update.pnlPercent}%)`);
    } catch (err) {
      this.logger.error(`Failed to update signal ${update.id}: ${err.message}`);
    }
  }

  /**
   * Get stored signals.
   */
  async getSignals(strategyType?: string): Promise<StoredSignal[]> {
    try {
      const rows = await (this.prisma as any).superEngulfingSignal.findMany({
        where: strategyType ? { strategyType } : undefined,
        orderBy: { detectedAt: 'desc' },
        take: MAX_SIGNALS,
      });
      return rows.map((r) => ({
        id: r.id,
        strategyType: r.strategyType,
        symbol: r.symbol,
        timeframe: r.timeframe,
        signalType: r.signalType,
        price: Number(r.price),
        detectedAt: r.detectedAt.toISOString(),
        status: r.status,
        metadata: r.metadata ?? undefined,
        closedAt: r.closedAt ? r.closedAt.toISOString() : undefined,
        closedPrice: r.closedPrice ? Number(r.closedPrice) : undefined,
        pnlPercent: r.pnlPercent ?? undefined,
        outcome: r.outcome ?? undefined,
      }));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Failed to load SuperEngulfing signals from DB: ${msg}`);
      // Fallback to in-memory cache
      let list = this.signals;
      if (strategyType) {
        list = list.filter((s) => s.strategyType === strategyType);
      }
      return [...list];
    }
  }

  /**
   * Get a single signal by its ID.
   */
  async getSignalById(id: string): Promise<StoredSignal | null> {
    try {
      const row = await (this.prisma as any).superEngulfingSignal.findUnique({
        where: { id },
      });
      if (!row) return null;
      return {
        id: row.id,
        strategyType: row.strategyType,
        symbol: row.symbol,
        timeframe: row.timeframe,
        signalType: row.signalType,
        price: Number(row.price),
        detectedAt: row.detectedAt.toISOString(),
        status: row.status,
        metadata: row.metadata ?? undefined,
        closedAt: row.closedAt ? row.closedAt.toISOString() : undefined,
        closedPrice: row.closedPrice ? Number(row.closedPrice) : undefined,
        pnlPercent: row.pnlPercent ?? undefined,
        outcome: row.outcome ?? undefined,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Failed to load signal by ID ${id}: ${msg}`);
      // Fallback to in-memory cache
      return this.signals.find((s) => s.id === id) ?? null;
    }
  }

  /**
   * Get aggregated signal statistics.
   */
  async getSignalStats(strategyType?: string): Promise<{
    total: number;
    active: number;
    won: number;
    lost: number;
    expired: number;
    winRate: number;
    avgWinPnl: number;
    avgLossPnl: number;
  }> {
    try {
      const where = strategyType ? { strategyType } : undefined;
      const rows = await (this.prisma as any).superEngulfingSignal.findMany({ where });

      const total = rows.length;
      const active = rows.filter((r) => r.status === 'ACTIVE').length;
      const won = rows.filter((r) => r.status === 'HIT_TP' || r.outcome === 'HIT_TP').length;
      const lost = rows.filter((r) => r.status === 'HIT_SL' || r.outcome === 'HIT_SL').length;
      const expired = rows.filter((r) => r.status === 'EXPIRED' || r.outcome === 'EXPIRED').length;

      const winPnls = rows.filter((r) => r.outcome === 'HIT_TP' && r.pnlPercent != null).map((r) => r.pnlPercent);
      const lossPnls = rows.filter((r) => r.outcome === 'HIT_SL' && r.pnlPercent != null).map((r) => r.pnlPercent);

      const closed = won + lost;
      const winRate = closed > 0 ? Math.round((won / closed) * 100) : 0;
      const avgWinPnl = winPnls.length > 0
        ? Math.round((winPnls.reduce((a, b) => a + b, 0) / winPnls.length) * 100) / 100
        : 0;
      const avgLossPnl = lossPnls.length > 0
        ? Math.round((lossPnls.reduce((a, b) => a + b, 0) / lossPnls.length) * 100) / 100
        : 0;

      return { total, active, won, lost, expired, winRate, avgWinPnl, avgLossPnl };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Failed to get signal stats: ${msg}`);
      return { total: 0, active: 0, won: 0, lost: 0, expired: 0, winRate: 0, avgWinPnl: 0, avgLossPnl: 0 };
    }
  }
}
