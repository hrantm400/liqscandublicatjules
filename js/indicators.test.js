const { detectSuperEngulfing } = require('./indicators');

describe('detectSuperEngulfing', () => {
    it('returns empty array when given empty candles', () => {
        expect(detectSuperEngulfing([])).toEqual([]);
    });

    it('returns empty array when given only one candle', () => {
        expect(detectSuperEngulfing([{ time: 1, open: 10, high: 20, low: 5, close: 15 }])).toEqual([]);
    });

    describe('RUN (Continuation) Patterns', () => {
        it('detects run_bull when currBull && prevBull && curr.low < prev.low && curr.close > prev.close', () => {
            const candles = [
                { time: 1, open: 10, high: 20, low: 10, close: 15 }, // prev: Bullish, low: 10, close: 15
                { time: 2, open: 14, high: 25, low: 5, close: 18 }   // curr: Bullish, low: 5 < 10, close: 18 > 15 (but <= prev.high)
            ];
            const result = detectSuperEngulfing(candles);
            expect(result).toHaveLength(1);
            expect(result[0]).toMatchObject({
                type: 'run_bull',
                label: 'RUN',
                barIndex: 1,
                time: 2,
                price: 5,
                position: 'belowBar',
                shape: 'arrowUp'
            });
        });

        it('detects run_bull_plus when plusBullCond (curr.close > prev.high) is also met', () => {
            const candles = [
                { time: 1, open: 10, high: 16, low: 10, close: 15 }, // prev: Bullish, high: 16
                { time: 2, open: 14, high: 25, low: 5, close: 18 }   // curr: Bullish, close: 18 > 16
            ];
            const result = detectSuperEngulfing(candles);
            expect(result).toHaveLength(1);
            expect(result[0]).toMatchObject({
                type: 'run_bull_plus',
                label: 'RUN+',
                color: '#00E676'
            });
        });

        it('detects run_bear when currBear && prevBear && curr.high > prev.high && curr.close < prev.close', () => {
            const candles = [
                { time: 1, open: 20, high: 20, low: 5, close: 15 }, // prev: Bearish, high: 20, close: 15
                { time: 2, open: 16, high: 25, low: 5, close: 10 }   // curr: Bearish, high: 25 > 20, close: 10 < 15 (but >= prev.low)
            ];
            const result = detectSuperEngulfing(candles);
            expect(result).toHaveLength(1);
            expect(result[0]).toMatchObject({
                type: 'run_bear',
                label: 'RUN',
                barIndex: 1,
                time: 2,
                price: 25,
                position: 'aboveBar',
                shape: 'arrowDown'
            });
        });

        it('detects run_bear_plus when plusBearCond (curr.close < prev.low) is also met', () => {
            const candles = [
                { time: 1, open: 20, high: 20, low: 12, close: 15 }, // prev: Bearish, low: 12
                { time: 2, open: 16, high: 25, low: 5, close: 10 }   // curr: Bearish, close: 10 < 12
            ];
            const result = detectSuperEngulfing(candles);
            expect(result).toHaveLength(1);
            expect(result[0]).toMatchObject({
                type: 'run_bear_plus',
                label: 'RUN+',
                color: '#FF1744'
            });
        });
    });

    describe('REV (Reversal) Patterns', () => {
        it('detects rev_bull when currBull && prevBear && curr.low < prev.low && curr.close > prev.open', () => {
            const candles = [
                { time: 1, open: 22, high: 25, low: 10, close: 15 }, // prev: Bearish, low: 10, open: 22, high: 25
                { time: 2, open: 14, high: 25, low: 5, close: 23 }   // curr: Bullish, low: 5 < 10, close: 23 > 22 (open), close 23 < 25 (high)
            ];
            const result = detectSuperEngulfing(candles);
            expect(result).toHaveLength(1);
            expect(result[0]).toMatchObject({
                type: 'rev_bull',
                label: 'REV',
                barIndex: 1,
                time: 2,
                price: 5,
                position: 'belowBar',
                shape: 'arrowUp'
            });
        });

        it('detects rev_bull_plus when plusBullCond (curr.close > prev.high) is also met', () => {
            const candles = [
                { time: 1, open: 20, high: 21, low: 10, close: 15 }, // prev: Bearish, high: 21
                { time: 2, open: 14, high: 25, low: 5, close: 22 }   // curr: Bullish, close: 22 > 21
            ];
            const result = detectSuperEngulfing(candles);
            expect(result).toHaveLength(1);
            expect(result[0]).toMatchObject({
                type: 'rev_bull_plus',
                label: 'REV+',
                color: '#00FF00'
            });
        });

        it('detects rev_bear when currBear && prevBull && curr.high > prev.high && curr.close < prev.open', () => {
            const candles = [
                { time: 1, open: 10, high: 20, low: 8, close: 15 }, // prev: Bullish, high: 20, open: 10
                { time: 2, open: 16, high: 25, low: 5, close: 8 }    // curr: Bearish, high: 25 > 20, close: 8 < 10 (but >= prev.low)
            ];
            const result = detectSuperEngulfing(candles);
            expect(result).toHaveLength(1);
            expect(result[0]).toMatchObject({
                type: 'rev_bear',
                label: 'REV',
                barIndex: 1,
                time: 2,
                price: 25,
                position: 'aboveBar',
                shape: 'arrowDown'
            });
        });

        it('detects rev_bear_plus when plusBearCond (curr.close < prev.low) is also met', () => {
            const candles = [
                { time: 1, open: 10, high: 20, low: 9, close: 15 },  // prev: Bullish, low: 9
                { time: 2, open: 16, high: 25, low: 5, close: 8 }    // curr: Bearish, close: 8 < 9
            ];
            const result = detectSuperEngulfing(candles);
            expect(result).toHaveLength(1);
            expect(result[0]).toMatchObject({
                type: 'rev_bear_plus',
                label: 'REV+',
                color: '#FF0000'
            });
        });
    });

    describe('Configuration variations', () => {
        it('ignores RUN patterns when showRun is false', () => {
            const candles = [
                { time: 1, open: 10, high: 20, low: 10, close: 15 }, // prev: Bullish
                { time: 2, open: 14, high: 25, low: 5, close: 18 }   // curr: Bullish RUN
            ];
            const result = detectSuperEngulfing(candles, { showRun: false });
            expect(result).toEqual([]);
        });

        it('ignores REV patterns when showRev is false', () => {
            const candles = [
                { time: 1, open: 20, high: 20, low: 10, close: 15 }, // prev: Bearish
                { time: 2, open: 14, high: 25, low: 5, close: 22 }   // curr: Bullish REV
            ];
            const result = detectSuperEngulfing(candles, { showRev: false });
            expect(result).toEqual([]);
        });
    });

    it('returns empty array when no patterns match', () => {
        const candles = [
            { time: 1, open: 10, high: 20, low: 10, close: 15 },
            { time: 2, open: 15, high: 22, low: 12, close: 18 }, // Not engulfing previous low
            { time: 3, open: 18, high: 20, low: 16, close: 16 }  // Bearish, but no prior setup matched
        ];
        const result = detectSuperEngulfing(candles);
        expect(result).toEqual([]);
    });
});
