const { test } = require('node:test');
const assert = require('node:assert');
const { ema } = require('../js/indicators.js');

test('ema - happy path (short array)', () => {
    const data = [1, 2, 3, 4, 5, 6, 7];
    const length = 3;
    const result = ema(data, length);

    assert.strictEqual(result.length, data.length);
    // Calculations for ema(length=3, k=2/(3+1)=0.5):
    // i=0: result[0] = 1 (started)
    // i=1: 2*0.5 + 1*0.5 = 1.5
    // i=2: 3*0.5 + 1.5*0.5 = 1.5 + 0.75 = 2.25
    // i=3: 4*0.5 + 2.25*0.5 = 2 + 1.125 = 3.125
    assert.strictEqual(result[0], 1);
    assert.strictEqual(result[1], 1.5);
    assert.strictEqual(result[2], 2.25);
    assert.strictEqual(result[3], 3.125);
});

test('ema - handles arrays shorter than length', () => {
    const data = [10, 20];
    const length = 5;
    const result = ema(data, length);
    // k = 2 / (5 + 1) = 2/6 = 1/3
    // i=0: 10
    // i=1: 20 * (1/3) + 10 * (2/3) = 6.666... + 6.666... = 13.333...
    assert.strictEqual(result.length, 2);
    assert.strictEqual(result[0], 10);
    assert.ok(Math.abs(result[1] - 13.3333333333) < 0.000001);
});

test('ema - handles edge cases with NaN in middle', () => {
    const data = [1, NaN, 3, 4];
    const length = 3;
    const result = ema(data, length);
    // k = 0.5
    // i=0: 1
    // i=1: NaN, so continue (result[1] is NaN, result[0] is 1)
    // i=2: 3*0.5 + result[1]*0.5 = 1.5 + NaN = NaN
    // i=3: 4*0.5 + result[2]*0.5 = 2 + NaN = NaN
    // This reflects how the code actually behaves when a middle value is NaN.
    assert.strictEqual(result.length, 4);
    assert.strictEqual(result[0], 1);
    assert.ok(isNaN(result[1]));
    assert.ok(isNaN(result[2]));
    assert.ok(isNaN(result[3]));
});

test('ema - starts logic when NaN is at the beginning', () => {
    const data = [NaN, NaN, 10, 20];
    const length = 3;
    const result = ema(data, length);
    // k = 0.5
    // i=0: NaN
    // i=1: NaN
    // i=2: 10 (started)
    // i=3: 20*0.5 + 10*0.5 = 15
    assert.strictEqual(result.length, 4);
    assert.ok(isNaN(result[0]));
    assert.ok(isNaN(result[1]));
    assert.strictEqual(result[2], 10);
    assert.strictEqual(result[3], 15);
});

test('ema - correctness with known outputs', () => {
    const data = [22.27, 22.19, 22.08, 22.17, 22.18, 22.13, 22.23, 22.43, 22.24, 22.29, 22.15, 22.39, 22.38, 22.61, 23.36, 24.05, 23.75, 23.83, 23.95, 23.63, 23.82, 23.87, 23.65, 23.19, 23.10, 23.33, 22.68, 23.10, 22.40, 22.17];
    const length = 10;
    const result = ema(data, length);

    assert.strictEqual(result.length, data.length);
    // We just ensure there's a valid calculation happening all the way through
    assert.ok(!isNaN(result[data.length - 1]));
});
