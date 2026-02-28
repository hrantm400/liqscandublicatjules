/**
 * confluence.indicator.ts — Strategy 9: SE+RSI+Trend Confluence
 *
 * Three-layer confluence:
 *   1. Daily SuperEngulfing / ICT Bias  (Higher Timeframe Filter)
 *   2. 5m/15m RSI Oversold/Overbought   (Momentum Filter)
 *   3. 5m/15m Trendline Break / MSS     (Execution Trigger)
 *
 * Completely standalone — imports shared helpers from indicators.ts
 * but never modifies them.
 */

import {
    CandleData,
    calculateRSI,
    detectSuperEngulfing,
    detectICTBias,
    detectRSIDivergence,
} from './indicators';

// ============================================================
// TYPES
// ============================================================

export interface TrendBreakSignal {
    type: 'LONG' | 'SHORT';
    breakPrice: number;
    breakTime: number;
    mechanism: 'TRENDLINE_BREAK' | 'MSS';
    /** Index of the bar where the break occurred */
    barIndex: number;
}

export interface ConfluenceSignal {
    direction: 'BUY' | 'SELL';
    price: number;
    time: number;
    barIndex: number;
    /** Which condition 1 matched */
    htfCondition: 'SUPER_ENGULFING' | 'ICT_BIAS';
    htfDetails: string;
    /** Condition 2 */
    rsiValue: number;
    rsiCondition: 'OVERSOLD' | 'OVERBOUGHT' | 'BULLISH_DIVERGENCE' | 'BEARISH_DIVERGENCE';
    /** Condition 3 */
    triggerType: 'TRENDLINE_BREAK' | 'MSS';
    triggerPrice: number;
    /** Label for visual rendering */
    label: string;
    /** Confidence based on strength of each layer */
    confidence: 'HIGH' | 'STANDARD';
}

// ============================================================
// CONDITION 3: TRENDLINE BREAK / MSS DETECTION
// ============================================================

/**
 * Detect Market Structure Shifts (MSS) and local trendline breaks.
 *
 * Long MSS:  price breaks the most recent Lower High
 * Short MSS: price breaks the most recent Higher Low
 *
 * This is a simplified but effective approach:
 *  - Track swing highs and swing lows over a lookback window
 *  - Detect when price breaks through a key structure level
 */
export function detectTrendBreak(
    candles: CandleData[],
    lookback = 20,
): TrendBreakSignal[] {
    const signals: TrendBreakSignal[] = [];
    if (candles.length < lookback + 5) return signals;

    const len = candles.length;
    // We work on the last `lookback` candles for swing detection,
    // then check if the most recent candle breaks the structure.

    // --- Find swing highs and swing lows (using 3-bar pivot) ---
    const swingHighs: { index: number; price: number }[] = [];
    const swingLows: { index: number; price: number }[] = [];

    const startIdx = Math.max(0, len - lookback - 1);
    for (let i = startIdx + 1; i < len - 1; i++) {
        const prev = candles[i - 1];
        const curr = candles[i];
        const next = candles[i + 1];

        // Swing High: high is higher than both neighbors
        if (curr.high > prev.high && curr.high > next.high) {
            swingHighs.push({ index: i, price: curr.high });
        }
        // Swing Low: low is lower than both neighbors
        if (curr.low < prev.low && curr.low < next.low) {
            swingLows.push({ index: i, price: curr.low });
        }
    }

    if (swingHighs.length < 2 && swingLows.length < 2) return signals;

    const lastCandle = candles[len - 1];
    const prevCandle = candles[len - 2];

    // --- MSS Long: break above the most recent Lower High ---
    // Look for descending swing highs (Lower Highs) and check if price breaks them
    if (swingHighs.length >= 2) {
        // Get the two most recent swing highs
        const recentSH = swingHighs[swingHighs.length - 1];
        const prevSH = swingHighs[swingHighs.length - 2];

        // If the recent swing high is lower → it's a Lower High (bearish structure)
        // Breaking above it = MSS Long
        if (recentSH.price < prevSH.price &&
            lastCandle.close > recentSH.price &&
            prevCandle.close <= recentSH.price) {
            signals.push({
                type: 'LONG',
                breakPrice: recentSH.price,
                breakTime: lastCandle.openTime,
                mechanism: 'MSS',
                barIndex: len - 1,
            });
        }
    }

    // --- MSS Short: break below the most recent Higher Low ---
    if (swingLows.length >= 2) {
        const recentSL = swingLows[swingLows.length - 1];
        const prevSL = swingLows[swingLows.length - 2];

        // If the recent swing low is higher → it's a Higher Low (bullish structure)
        // Breaking below it = MSS Short
        if (recentSL.price > prevSL.price &&
            lastCandle.close < recentSL.price &&
            prevCandle.close >= recentSL.price) {
            signals.push({
                type: 'SHORT',
                breakPrice: recentSL.price,
                breakTime: lastCandle.openTime,
                mechanism: 'MSS',
                barIndex: len - 1,
            });
        }
    }

    // --- Trendline break: simplified approach ---
    // Long: if we have descending highs forming a bearish trendline and price breaks above it
    if (signals.length === 0 && swingHighs.length >= 2) {
        const sh1 = swingHighs[swingHighs.length - 2];
        const sh2 = swingHighs[swingHighs.length - 1];

        if (sh2.price < sh1.price) {
            // Calculate the projected trendline value at the current bar
            const slope = (sh2.price - sh1.price) / (sh2.index - sh1.index);
            const projectedTL = sh2.price + slope * (len - 1 - sh2.index);

            if (lastCandle.close > projectedTL && prevCandle.close <= projectedTL) {
                signals.push({
                    type: 'LONG',
                    breakPrice: projectedTL,
                    breakTime: lastCandle.openTime,
                    mechanism: 'TRENDLINE_BREAK',
                    barIndex: len - 1,
                });
            }
        }
    }

    if (signals.length === 0 && swingLows.length >= 2) {
        const sl1 = swingLows[swingLows.length - 2];
        const sl2 = swingLows[swingLows.length - 1];

        if (sl2.price > sl1.price) {
            // Ascending lows = bullish trendline, break below = Short
            const slope = (sl2.price - sl1.price) / (sl2.index - sl1.index);
            const projectedTL = sl2.price + slope * (len - 1 - sl2.index);

            if (lastCandle.close < projectedTL && prevCandle.close >= projectedTL) {
                signals.push({
                    type: 'SHORT',
                    breakPrice: projectedTL,
                    breakTime: lastCandle.openTime,
                    mechanism: 'TRENDLINE_BREAK',
                    barIndex: len - 1,
                });
            }
        }
    }

    return signals;
}

// ============================================================
// CONDITION 2: RSI MOMENTUM CHECK
// ============================================================

interface RSIMomentumResult {
    direction: 'LONG' | 'SHORT' | null;
    rsiValue: number;
    condition: 'OVERSOLD' | 'OVERBOUGHT' | 'BULLISH_DIVERGENCE' | 'BEARISH_DIVERGENCE' | null;
}

/**
 * Check RSI condition on the lower timeframe candles.
 *
 * Long: RSI < 30 and curling up, OR RSI bullish divergence detected
 * Short: RSI > 70 and curling down, OR RSI bearish divergence detected
 */
export function checkRSIMomentum(candles: CandleData[]): RSIMomentumResult {
    const closes = candles.map(c => c.close);
    const rsiValues = calculateRSI(closes, 14);

    const lastIdx = rsiValues.length - 1;
    const currentRSI = rsiValues[lastIdx];
    const prevRSI = rsiValues[lastIdx - 1];
    const prevPrevRSI = rsiValues[lastIdx - 2];

    if (isNaN(currentRSI) || isNaN(prevRSI)) {
        return { direction: null, rsiValue: currentRSI, condition: null };
    }

    // Check for divergence first (stronger signal)
    const divergences = detectRSIDivergence(candles, {
        rsiLength: 14,
        lbL: 3,
        lbR: 3,
    });

    // Check if there's a recent divergence (within last 5 bars)
    const recentDivergence = divergences.find(
        d => d.barIndex >= candles.length - 8,
    );

    if (recentDivergence) {
        if (recentDivergence.type.includes('bullish')) {
            return {
                direction: 'LONG',
                rsiValue: currentRSI,
                condition: 'BULLISH_DIVERGENCE',
            };
        }
        if (recentDivergence.type.includes('bearish')) {
            return {
                direction: 'SHORT',
                rsiValue: currentRSI,
                condition: 'BEARISH_DIVERGENCE',
            };
        }
    }

    // RSI Oversold + curling up
    if (currentRSI < 35 && prevRSI <= currentRSI && prevPrevRSI > prevRSI) {
        return { direction: 'LONG', rsiValue: currentRSI, condition: 'OVERSOLD' };
    }

    // RSI Overbought + curling down
    if (currentRSI > 65 && prevRSI >= currentRSI && prevPrevRSI < prevRSI) {
        return { direction: 'SHORT', rsiValue: currentRSI, condition: 'OVERBOUGHT' };
    }

    return { direction: null, rsiValue: currentRSI, condition: null };
}

// ============================================================
// MAIN CONFLUENCE CHECK
// ============================================================

/**
 * Check all 3 confluence conditions.
 *
 * @param dailyCandles  - Daily (or higher TF) candles for SE/Bias check
 * @param ltfCandles    - Lower timeframe (5m/15m) candles for RSI + Trendbreak
 * @param ltfTimeframe  - The LTF string, e.g. '5m' or '15m'
 */
export function checkConfluence(
    dailyCandles: CandleData[],
    ltfCandles: CandleData[],
    ltfTimeframe: string,
): ConfluenceSignal | null {
    if (dailyCandles.length < 5 || ltfCandles.length < 30) return null;

    // ── CONDITION 1: Higher Timeframe Filter ──
    // Check for Daily SuperEngulfing
    const seSignals = detectSuperEngulfing(dailyCandles.slice(0, -1)); // closed candles only
    const bias = detectICTBias(dailyCandles);

    let htfDirection: 'BUY' | 'SELL' | null = null;
    let htfCondition: 'SUPER_ENGULFING' | 'ICT_BIAS' = 'SUPER_ENGULFING';
    let htfDetails = '';

    // SuperEngulfing takes priority (stronger signal)
    if (seSignals.length > 0) {
        const latestSE = seSignals[seSignals.length - 1];
        htfDirection = latestSE.direction;
        htfCondition = 'SUPER_ENGULFING';
        htfDetails = `SE ${latestSE.pattern} ${latestSE.direction === 'BUY' ? '↑' : '↓'}`;
    } else if (bias && bias.bias !== 'RANGING') {
        htfDirection = bias.direction === 'NEUTRAL' ? null : bias.direction;
        htfCondition = 'ICT_BIAS';
        htfDetails = `Bias ${bias.bias}`;
    }

    if (!htfDirection) return null;

    // ── CONDITION 2: RSI Momentum Filter ──
    const rsiResult = checkRSIMomentum(ltfCandles);
    if (!rsiResult.direction) return null;

    // Directions must agree
    const isLong = htfDirection === 'BUY' && rsiResult.direction === 'LONG';
    const isShort = htfDirection === 'SELL' && rsiResult.direction === 'SHORT';
    if (!isLong && !isShort) return null;

    // ── CONDITION 3: Execution Trigger ──
    const trendBreaks = detectTrendBreak(ltfCandles, 20);
    const matchingBreak = trendBreaks.find(tb =>
        (isLong && tb.type === 'LONG') || (isShort && tb.type === 'SHORT'),
    );

    if (!matchingBreak) return null;

    // ── ALL 3 CONDITIONS MET ──
    const direction = isLong ? 'BUY' : 'SELL';
    const lastCandle = ltfCandles[ltfCandles.length - 1];

    // Confidence: HIGH if SE + divergence, STANDARD otherwise
    const confidence: 'HIGH' | 'STANDARD' =
        htfCondition === 'SUPER_ENGULFING' &&
            (rsiResult.condition === 'BULLISH_DIVERGENCE' || rsiResult.condition === 'BEARISH_DIVERGENCE')
            ? 'HIGH'
            : 'STANDARD';

    const rsiLabel = rsiResult.condition === 'OVERSOLD' ? 'RSI OS'
        : rsiResult.condition === 'OVERBOUGHT' ? 'RSI OB'
            : rsiResult.condition === 'BULLISH_DIVERGENCE' ? 'RSI BullDiv'
                : 'RSI BearDiv';

    return {
        direction,
        price: lastCandle.close,
        time: lastCandle.openTime,
        barIndex: ltfCandles.length - 1,
        htfCondition,
        htfDetails,
        rsiValue: rsiResult.rsiValue,
        rsiCondition: rsiResult.condition!,
        triggerType: matchingBreak.mechanism,
        triggerPrice: matchingBreak.breakPrice,
        label: `${htfDetails} + ${rsiLabel} + ${matchingBreak.mechanism === 'MSS' ? 'MSS' : 'TL Break'} ${direction === 'BUY' ? '↑' : '↓'}`,
        confidence,
    };
}
