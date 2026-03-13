const BinanceAPI = require('../js/binance.js');

describe('BinanceAPI.fetchKlines', () => {
    // Mocking global.fetch before each test
    beforeEach(() => {
        global.fetch = jest.fn();
    });

    afterEach(() => {
        jest.resetAllMocks();
    });

    test('should fetch klines successfully and format data correctly', async () => {
        // Mock successful response from fetch
        const mockData = [
            [
                1672531200000, // Open time
                "16500.00",    // Open
                "16600.00",    // High
                "16450.00",    // Low
                "16550.00",    // Close
                "1500.50",     // Volume
                1672534799999, // Close time
                "24825775.00", // Quote asset volume
                50000,         // Number of trades
                "750.25",      // Taker buy base asset volume
                "12412887.50", // Taker buy quote asset volume
                "0"            // Ignore
            ]
        ];

        global.fetch.mockResolvedValue({
            ok: true,
            json: async () => mockData
        });

        const klines = await BinanceAPI.fetchKlines('BTCUSDT', '1h', 1);

        expect(global.fetch).toHaveBeenCalledTimes(1);
        expect(global.fetch).toHaveBeenCalledWith(
            'https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=1h&limit=1'
        );

        // Verify formatted output
        expect(klines).toHaveLength(1);
        expect(klines[0]).toEqual({
            time: 1672531200, // converted ms to seconds
            open: 16500.00,
            high: 16600.00,
            low: 16450.00,
            close: 16550.00,
            volume: 1500.50
        });
    });

    test('should use default parameters when only symbol is provided', async () => {
        global.fetch.mockResolvedValue({
            ok: true,
            json: async () => []
        });

        await BinanceAPI.fetchKlines('ethusdt');

        expect(global.fetch).toHaveBeenCalledTimes(1);
        expect(global.fetch).toHaveBeenCalledWith(
            'https://api.binance.com/api/v3/klines?symbol=ETHUSDT&interval=1h&limit=500'
        );
    });

    test('should throw an error when API response is not ok', async () => {
        global.fetch.mockResolvedValue({
            ok: false,
            status: 400
        });

        await expect(BinanceAPI.fetchKlines('INVALID', '1h', 500)).rejects.toThrow(
            'Binance API error: 400'
        );

        expect(global.fetch).toHaveBeenCalledTimes(1);
    });
});
