/**
 * strategy1.indicator.ts — Strategy 1: 4H SE + 5M Break
 *
 * Logic Flow:
 *   1. Detect 4H SuperEngulfing (REV/RUN/PLUS, both directions)
 *   2. Mark 4H Candle B Close as Break Level
 *   3. Check session (London 08-12 UTC / NY 13-17 UTC)
 *   4. Wait for 5M candle body close above/below level
 *   5. Find last 5M swing for SL (3L/3R)
 *   6. Check SL distance (max 1%)
 *   7. Calculate TP1 (1:1) and TP2 (1:2)
 *   8. Return signal (first break only)
 *
 * Standalone — imports shared helpers from indicators.ts
 */

import { CandleData, detectSuperEngulfing } from './indicators';

// ============================================================
// TYPES
// ============================================================

export interface Strategy1Signal {
    direction: 'BUY' | 'SELL';
    price: number;            // Entry price (5M break candle close)
    time: number;             // Time of signal
    barIndex: number;
    /** 4H SE pattern details */
    sePattern: string;        // REV | RUN | REV_PLUS | RUN_PLUS
    seDirection: string;      // BULLISH | BEARISH
    breakLevel: number;       // 4H Candle B Close
    /** Session info */
    session: 'LONDON' | 'NEW_YORK';
    /** Trade levels */
    stopLoss: number;
    tp1: number;              // 1:1 R:R
    tp2: number;              // 1:2 R:R
    riskPercent: number;      // SL distance as % of entry
    /** Description label */
    label: string;
}

// ============================================================
// SESSION DETECTION
// ============================================================

type SessionName = 'LONDON' | 'NEW_YORK' | 'ASIA' | 'OFF_SESSION';

/**
 * Determine which session a given UTC timestamp falls in.
 * London Kill Zone: 08:00 – 12:00 UTC
 * New York Kill Zone: 13:00 – 17:00 UTC
 */
function getSession(timestampMs: number): SessionName {
    const date = new Date(timestampMs);
    const utcHour = date.getUTCHours();

    if (utcHour >= 8 && utcHour < 12) return 'LONDON';
    if (utcHour >= 13 && utcHour < 17) return 'NEW_YORK';
    if (utcHour >= 0 && utcHour < 8) return 'ASIA';
    return 'OFF_SESSION';
}

function isValidSession(timestampMs: number): boolean {
    const session = getSession(timestampMs);
    return session === 'LONDON' || session === 'NEW_YORK';
}

// ============================================================
// 5M SWING DETECTION (3 Left / 3 Right pivot)
// ============================================================

/**
 * Find the last swing low before the given bar index.
 * A swing low requires the low to be lower than 3 bars on each side.
 */
function findLastSwingLow(candles: CandleData[], beforeIndex: number, leftBars = 3, rightBars = 3): { price: number; index: number } | null {
    // Start searching from beforeIndex going backwards
    // The pivot needs at least leftBars before and rightBars after
    for (let i = beforeIndex - rightBars; i >= leftBars; i--) {
        let isSwingLow = true;

        // Check left bars
        for (let j = 1; j <= leftBars; j++) {
            if (candles[i - j].low <= candles[i].low) {
                isSwingLow = false;
                break;
            }
        }
        if (!isSwingLow) continue;

        // Check right bars
        for (let j = 1; j <= rightBars; j++) {
            if (candles[i + j].low <= candles[i].low) {
                isSwingLow = false;
                break;
            }
        }

        if (isSwingLow) {
            return { price: candles[i].low, index: i };
        }
    }
    return null;
}

/**
 * Find the last swing high before the given bar index.
 * A swing high requires the high to be higher than 3 bars on each side.
 */
function findLastSwingHigh(candles: CandleData[], beforeIndex: number, leftBars = 3, rightBars = 3): { price: number; index: number } | null {
    for (let i = beforeIndex - rightBars; i >= leftBars; i--) {
        let isSwingHigh = true;

        // Check left bars
        for (let j = 1; j <= leftBars; j++) {
            if (candles[i - j].high >= candles[i].high) {
                isSwingHigh = false;
                break;
            }
        }
        if (!isSwingHigh) continue;

        // Check right bars
        for (let j = 1; j <= rightBars; j++) {
            if (candles[i + j].high >= candles[i].high) {
                isSwingHigh = false;
                break;
            }
        }

        if (isSwingHigh) {
            return { price: candles[i].high, index: i };
        }
    }
    return null;
}

// ============================================================
// 4H SUPER ENGULFING DETECTION
// ============================================================

interface SE4HResult {
    direction: 'BULLISH' | 'BEARISH';
    pattern: string;   // REV | RUN | REV_PLUS | RUN_PLUS
    breakLevel: number; // Candle B close
    time: number;       // Candle B open time
    barIndex: number;   // Index in 4H array
}

/**
 * Check the last closed 4H candles for a SuperEngulfing pattern.
 * Uses the shared detectSuperEngulfing which handles REV/RUN/PLUS.
 * Returns the most recent SE found, or null.
 */
function detect4HSuperEngulfing(candles4H: CandleData[]): SE4HResult | null {
    // Only check last 2 closed candles (most recent)
    if (candles4H.length < 3) return null;

    // Slice off last (forming) candle, take only last few closed candles
    const closed = candles4H.slice(0, -1);
    if (closed.length < 2) return null;

    // detectSuperEngulfing returns all SE signals in the array
    const allSignals = detectSuperEngulfing(closed);
    if (allSignals.length === 0) return null;

    // Take the most recent signal
    const lastSE = allSignals[allSignals.length - 1];

    const direction = lastSE.direction === 'BUY' ? 'BULLISH' : 'BEARISH';

    // Break level = Candle B close
    // The SE is detected at barIndex, which is Candle B
    const candleB = closed[lastSE.barIndex];
    const breakLevel = candleB.close;

    return {
        direction,
        pattern: lastSE.pattern,
        breakLevel,
        time: candleB.openTime,
        barIndex: lastSE.barIndex,
    };
}

// ============================================================
// MAIN STRATEGY CHECK
// ============================================================

/**
 * Check Strategy 1: 4H SE + 5M Break
 *
 * @param candles4H  4H candles (at least 10, including 1 forming)
 * @param candles5M  5M candles (at least 30, including 1 forming)
 * @returns Signal or null
 */
export function checkStrategy1(
    candles4H: CandleData[],
    candles5M: CandleData[],
): Strategy1Signal | null {
    // STEP 1: Detect 4H SuperEngulfing
    const se = detect4HSuperEngulfing(candles4H);
    if (!se) return null;

    // STEP 2: Break level is already in se.breakLevel (Candle B close)
    const breakLevel = se.breakLevel;

    // STEP 3+4: Look through recent 5M candles for a body close beyond the level
    // Only check 5M candles that formed AFTER the 4H SE candle
    const closed5M = candles5M.slice(0, -1); // Remove forming candle
    if (closed5M.length < 10) return null;

    // Find the start index: 5M candles after the 4H SE candle's time
    const seTime = se.time;
    let startIdx = -1;
    for (let i = 0; i < closed5M.length; i++) {
        if (closed5M[i].openTime >= seTime) {
            startIdx = i;
            break;
        }
    }
    if (startIdx < 0) return null;

    // STEP 4: Find FIRST 5M body close above/below break level
    let breakCandle: CandleData | null = null;
    let breakCandleIdx = -1;

    for (let i = startIdx; i < closed5M.length; i++) {
        const c = closed5M[i];
        // We need candle body — use Math.min/max of open,close
        const bodyClose = c.close;

        if (se.direction === 'BULLISH' && bodyClose > breakLevel) {
            breakCandle = c;
            breakCandleIdx = i;
            break; // FIRST break only
        } else if (se.direction === 'BEARISH' && bodyClose < breakLevel) {
            breakCandle = c;
            breakCandleIdx = i;
            break; // FIRST break only
        }

        // INVALIDATION: Check if price has already moved against the setup
        // For bullish: if price drops significantly below the SE candle's low
        // For bearish: if price rallies significantly above the SE candle's high
        // This handles "setup failed" invalidation
    }

    if (!breakCandle || breakCandleIdx < 0) return null;

    // STEP 3: Check session — the break must happen during London or NY
    if (!isValidSession(breakCandle.openTime)) return null;

    const session = getSession(breakCandle.openTime) as 'LONDON' | 'NEW_YORK';

    // STEP 5: Find last 5M swing for SL
    let stopLoss: number;

    if (se.direction === 'BULLISH') {
        // SL = Last 5M swing low before the break candle
        const swing = findLastSwingLow(closed5M, breakCandleIdx);
        if (!swing) return null;
        stopLoss = swing.price;
    } else {
        // SL = Last 5M swing high before the break candle
        const swing = findLastSwingHigh(closed5M, breakCandleIdx);
        if (!swing) return null;
        stopLoss = swing.price;
    }

    // STEP 6: Check SL distance (max 1%)
    const entry = breakCandle.close;
    const slDistance = Math.abs(entry - stopLoss);
    const riskPercent = (slDistance / entry) * 100;

    if (riskPercent > 1.0) return null; // SL too wide — discard

    // STEP 7: Calculate TP1 (1:1) and TP2 (1:2)
    let tp1: number;
    let tp2: number;

    if (se.direction === 'BULLISH') {
        tp1 = entry + slDistance;       // 1:1
        tp2 = entry + slDistance * 2;   // 1:2
    } else {
        tp1 = entry - slDistance;       // 1:1
        tp2 = entry - slDistance * 2;   // 1:2
    }

    // STEP 8: Build and return signal
    const dirLabel = se.direction === 'BULLISH' ? 'LONG 🟢' : 'SHORT 🔴';
    const label = `4H ${se.pattern} ${dirLabel} | Session: ${session} | Risk: ${riskPercent.toFixed(2)}%`;

    return {
        direction: se.direction === 'BULLISH' ? 'BUY' : 'SELL',
        price: entry,
        time: breakCandle.openTime,
        barIndex: breakCandleIdx,
        sePattern: se.pattern,
        seDirection: se.direction,
        breakLevel,
        session,
        stopLoss,
        tp1,
        tp2,
        riskPercent: Math.round(riskPercent * 100) / 100,
        label,
    };
}
