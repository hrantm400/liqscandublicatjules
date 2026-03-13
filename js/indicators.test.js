const { sma } = require('./indicators');

describe('sma function', () => {
    it('should calculate the Simple Moving Average correctly for normal inputs', () => {
        const data = [10, 20, 30, 40, 50, 60];
        const length = 3;
        const result = sma(data, length);

        // Expected:
        // [NaN, NaN, (10+20+30)/3=20, (20+30+40)/3=30, (30+40+50)/3=40, (40+50+60)/3=50]

        expect(result).toHaveLength(6);
        expect(Number.isNaN(result[0])).toBe(true);
        expect(Number.isNaN(result[1])).toBe(true);
        expect(result[2]).toBe(20);
        expect(result[3]).toBe(30);
        expect(result[4]).toBe(40);
        expect(result[5]).toBe(50);
    });

    it('should return an array of NaNs if array length is smaller than SMA length', () => {
        const data = [10, 20];
        const length = 3;
        const result = sma(data, length);

        expect(result).toHaveLength(2);
        expect(Number.isNaN(result[0])).toBe(true);
        expect(Number.isNaN(result[1])).toBe(true);
    });

    it('should handle SMA length of 1 by returning the same data array', () => {
        const data = [5, 15, 25];
        const length = 1;
        const result = sma(data, length);

        expect(result).toHaveLength(3);
        expect(result[0]).toBe(5);
        expect(result[1]).toBe(15);
        expect(result[2]).toBe(25);
    });

    it('should handle an empty data array', () => {
        const data = [];
        const length = 5;
        const result = sma(data, length);

        expect(result).toEqual([]);
    });

    it('should handle zero values in data', () => {
        const data = [0, 0, 0, 0];
        const length = 2;
        const result = sma(data, length);

        expect(result).toHaveLength(4);
        expect(Number.isNaN(result[0])).toBe(true);
        expect(result[1]).toBe(0);
        expect(result[2]).toBe(0);
        expect(result[3]).toBe(0);
    });

    it('should handle negative values in data', () => {
        const data = [-10, -20, -30, -40];
        const length = 2;
        const result = sma(data, length);

        expect(result).toHaveLength(4);
        expect(Number.isNaN(result[0])).toBe(true);
        expect(result[1]).toBe(-15);
        expect(result[2]).toBe(-25);
        expect(result[3]).toBe(-35);
    });
});
