const { detectICTBias } = require('../js/indicators.js');

describe('detectICTBias', () => {
    it('returns Ranging and empty signals when fewer than 3 candles are provided', () => {
        const candles = [
            { time: 1, open: 10, high: 15, low: 5, close: 12 },
            { time: 2, open: 12, high: 18, low: 10, close: 14 }
        ];

        const result = detectICTBias(candles);

        expect(result).toEqual({
            bias: 'Ranging',
            prevHigh: 0,
            prevLow: 0,
            signals: []
        });
    });

    it('detects a Bearish bias when the previous close is lower than the low of two candles ago', () => {
        // Candle i-2: high: 100, low: 90
        // Candle i-1: close: 80 (< 90) => Bearish
        // Candle i: forming
        const candles = [
            { time: 1, open: 95, high: 100, low: 90, close: 95 }, // i-2
            { time: 2, open: 95, high: 95, low: 75, close: 80 },  // i-1 (prev)
            { time: 3, open: 80, high: 85, low: 75, close: 82 }   // i (curr)
        ];

        const result = detectICTBias(candles);

        expect(result.bias).toBe('Bearish');
        expect(result.prevHigh).toBe(95);
        expect(result.prevLow).toBe(75);
        expect(result.signals.length).toBe(1);
        expect(result.signals[0]).toEqual({
            type: 'ict_bias',
            bias: 'Bearish',
            barIndex: 2,
            time: 3,
            prevHigh: 95,
            prevLow: 75
        });
    });

    it('detects a Bullish bias when the previous close is higher than the high of two candles ago', () => {
        // Candle i-2: high: 100, low: 90
        // Candle i-1: close: 110 (> 100) => Bullish
        // Candle i: forming
        const candles = [
            { time: 1, open: 95, high: 100, low: 90, close: 95 }, // i-2
            { time: 2, open: 95, high: 115, low: 95, close: 110 }, // i-1 (prev)
            { time: 3, open: 110, high: 120, low: 105, close: 115 } // i (curr)
        ];

        const result = detectICTBias(candles);

        expect(result.bias).toBe('Bullish');
        expect(result.prevHigh).toBe(115);
        expect(result.prevLow).toBe(95);
        expect(result.signals.length).toBe(1);
        expect(result.signals[0]).toEqual({
            type: 'ict_bias',
            bias: 'Bullish',
            barIndex: 2,
            time: 3,
            prevHigh: 115,
            prevLow: 95
        });
    });

    it('detects a Ranging bias when the previous close is within the high/low of two candles ago', () => {
        // Candle i-2: high: 100, low: 90
        // Candle i-1: close: 95 (>= 90 and <= 100) => Ranging
        // Candle i: forming
        const candles = [
            { time: 1, open: 95, high: 100, low: 90, close: 95 }, // i-2
            { time: 2, open: 95, high: 100, low: 90, close: 95 }, // i-1 (prev)
            { time: 3, open: 95, high: 100, low: 90, close: 95 }  // i (curr)
        ];

        const result = detectICTBias(candles);

        expect(result.bias).toBe('Ranging');
        expect(result.prevHigh).toBe(100);
        expect(result.prevLow).toBe(90);
        expect(result.signals.length).toBe(1);
        expect(result.signals[0]).toEqual({
            type: 'ict_bias',
            bias: 'Ranging',
            barIndex: 2,
            time: 3,
            prevHigh: 100,
            prevLow: 90
        });
    });

    it('evaluates multiple candles and returns the latest bias properly', () => {
        // Sequence:
        // C0: H100 L90
        // C1: C110 (>100) => Bullish
        // C2: forming (will give Bullish at index 2) - let's set it to C2: H120 L100 C80
        // C3: C2 C=80 (<90) wait, C1 was H115 L95. So C2=80 (<95) => Bearish
        // Let's trace carefully:
        // i=2: prevClose=C1.close(110), prevPrevHigh=C0.high(100), prevPrevLow=C0.low(90) -> 110 > 100 -> Bullish
        // i=3: prevClose=C2.close(80), prevPrevHigh=C1.high(115), prevPrevLow=C1.low(95) -> 80 < 95 -> Bearish
        // i=4: prevClose=C3.close(85), prevPrevHigh=C2.high(85), prevPrevLow=C2.low(75) -> 85 is Ranging
        const candles = [
            { time: 0, open: 95, high: 100, low: 90, close: 95 },   // i-4 (index 0)
            { time: 1, open: 95, high: 115, low: 95, close: 110 },  // i-3 (index 1)
            { time: 2, open: 110, high: 115, low: 75, close: 80 },  // i-2 (index 2) -> bias Bullish
            { time: 3, open: 80, high: 90, low: 75, close: 85 },    // i-1 (index 3) -> bias Bearish
            { time: 4, open: 85, high: 90, low: 80, close: 85 }     // i   (index 4) -> bias Ranging
        ];

        const result = detectICTBias(candles);

        expect(result.bias).toBe('Ranging');
        expect(result.prevHigh).toBe(90); // C3 high
        expect(result.prevLow).toBe(75);  // C3 low

        expect(result.signals.length).toBe(3);

        expect(result.signals[0].bias).toBe('Bullish');
        expect(result.signals[0].barIndex).toBe(2);

        expect(result.signals[1].bias).toBe('Bearish');
        expect(result.signals[1].barIndex).toBe(3);

        expect(result.signals[2].bias).toBe('Ranging');
        expect(result.signals[2].barIndex).toBe(4);
    });
});
