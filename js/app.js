// ============================================================
// app.js — Main Application Controller
// ============================================================

const App = (() => {
    // Multi-chart state
    let charts = [];
    let activeChartId = null;
    let chartCounter = 0;
    let isGridView = true;

    // Popular symbols list (quick access)
    const POPULAR_SYMBOLS = [
        'BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'XRPUSDT',
        'DOGEUSDT', 'ADAUSDT', 'AVAXUSDT', 'DOTUSDT', 'MATICUSDT',
        'LINKUSDT', 'LTCUSDT', 'UNIUSDT', 'ATOMUSDT', 'NEARUSDT'
    ];

    const INTERVALS = [
        { value: '1m', label: '1m' },
        { value: '5m', label: '5m' },
        { value: '15m', label: '15m' },
        { value: '30m', label: '30m' },
        { value: '1h', label: '1H' },
        { value: '4h', label: '4H' },
        { value: '1d', label: '1D' },
        { value: '1w', label: '1W' }
    ];

    /**
     * Initialize the app
     */
    async function init() {
        // Populate UI
        populateIntervals();
        populateSymbols();

        // Toolbar
        document.getElementById('add-chart-btn').addEventListener('click', () => addChart());
        document.getElementById('grid-view-btn').addEventListener('click', () => setGridView(true));
        document.getElementById('single-view-btn').addEventListener('click', () => setGridView(false));

        // Event listeners
        document.getElementById('symbol-input').addEventListener('change', onSymbolChange);
        document.getElementById('symbol-input').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') onSymbolChange();
        });
        document.getElementById('load-btn').addEventListener('click', onSymbolChange);

        // Quick symbol buttons
        document.querySelectorAll('.symbol-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.getElementById('symbol-input').value = btn.dataset.symbol;
                onSymbolChange();
            });
        });

        // Interval buttons
        document.querySelectorAll('.interval-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                if (!activeChartId || !btn.dataset.interval) return;
                const cObj = getActiveChart();
                if (cObj) {
                    cObj.interval = btn.dataset.interval;
                    updateToolbarUI();
                    loadDataForChart(cObj);
                }
            });
        });

        // Settings toggles
        document.getElementById('toggle-bull-div').addEventListener('change', () => runIndicatorsAll());
        document.getElementById('toggle-bear-div').addEventListener('change', () => runIndicatorsAll());
        document.getElementById('toggle-hidden-bull').addEventListener('change', () => runIndicatorsAll());
        document.getElementById('toggle-hidden-bear').addEventListener('change', () => runIndicatorsAll());
        document.getElementById('toggle-run').addEventListener('change', () => runIndicatorsAll());
        document.getElementById('toggle-rev').addEventListener('change', () => runIndicatorsAll());

        // Add initial chart
        await addChart('BTCUSDT', '1h');
    }

    function addChart(symbol = 'BTCUSDT', interval = '1h') {
        const id = 'chart-' + (++chartCounter);
        const container = document.getElementById('charts-container');

        const wrapper = document.createElement('div');
        wrapper.className = 'chart-wrapper';
        wrapper.id = id;
        wrapper.innerHTML = `
            <div class="chart-header">
                <div class="chart-header-left">
                    <span style="font-weight:bold; color:var(--text-primary)">${symbol}</span>
                    <span style="color:var(--text-muted)">${interval.toUpperCase()}</span>
                </div>
                <div class="chart-header-right">
                    <button class="chart-remove-btn" title="Remove Chart">×</button>
                </div>
            </div>
            <div id="main-${id}" class="main-chart"></div>
            <div class="rsi-chart">
                <span class="rsi-label">RSI (14)</span>
                <div id="rsi-${id}" style="height:100%"></div>
            </div>
        `;

        container.appendChild(wrapper);

        // Init lightweight charts instance
        const instance = new ChartInstance(`main-${id}`, `rsi-${id}`);

        const chartObj = {
            id,
            symbol,
            interval,
            instance,
            candles: [],
            wrapper,
            ws: null
        };

        charts.push(chartObj);

        // Click wrapper to set active
        wrapper.addEventListener('mousedown', () => {
            setActiveChart(id);
        });

        // Remove button
        wrapper.querySelector('.chart-remove-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            removeChart(id);
        });

        setActiveChart(id);
        loadDataForChart(chartObj);
    }

    function removeChart(id) {
        const index = charts.findIndex(c => c.id === id);
        if (index === -1) return;

        const cObj = charts[index];

        // Cleanup WS
        if (cObj.ws) {
            cObj.ws.close();
            cObj.ws = null;
        }

        cObj.instance.destroy();
        cObj.wrapper.remove();

        charts.splice(index, 1);

        if (activeChartId === id) {
            if (charts.length > 0) {
                setActiveChart(charts[charts.length - 1].id);
            } else {
                activeChartId = null;
                document.getElementById('current-symbol').textContent = '—';
                document.getElementById('current-interval').textContent = '—';
            }
        }
    }

    function setActiveChart(id) {
        activeChartId = id;
        document.querySelectorAll('.chart-wrapper').forEach(el => {
            el.style.border = el.id === id ? '1px solid var(--accent-blue)' : '1px solid transparent';
            if (!isGridView) {
                el.classList.toggle('active-chart', el.id === id);
            }
        });

        updateToolbarUI();

        // Refresh global sidebar with active chart's current state
        const cObj = getActiveChart();
        if (cObj && cObj.candles.length) {
            runIndicators(cObj, false); // false = don't send alerts, just re-render sidebar
        }
    }

    function getActiveChart() {
        return charts.find(c => c.id === activeChartId);
    }

    function setGridView(grid) {
        isGridView = grid;
        const container = document.getElementById('charts-container');
        if (grid) {
            container.className = 'grid-view';
            document.getElementById('grid-view-btn').classList.add('active');
            document.getElementById('single-view-btn').classList.remove('active');
            document.querySelectorAll('.chart-wrapper').forEach(el => el.classList.remove('active-chart'));
        } else {
            container.className = 'single-view';
            document.getElementById('grid-view-btn').classList.remove('active');
            document.getElementById('single-view-btn').classList.add('active');
            if (activeChartId) setActiveChart(activeChartId); // refresh visibility
        }

        // Trigger resize for all
        setTimeout(() => {
            charts.forEach(c => c.instance.mainChart.timeScale().fitContent());
        }, 50);
    }

    function updateToolbarUI() {
        const cObj = getActiveChart();
        if (!cObj) return;

        document.getElementById('symbol-input').value = cObj.symbol;
        document.getElementById('current-symbol').textContent = cObj.symbol;
        document.getElementById('current-interval').textContent = cObj.interval.toUpperCase();

        document.querySelectorAll('.interval-btn').forEach(b => {
            if (b.dataset.interval) {
                b.classList.toggle('active', b.dataset.interval === cObj.interval);
            }
        });

        document.querySelectorAll('.symbol-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.symbol === cObj.symbol);
        });
    }

    function runIndicatorsAll() {
        charts.forEach(cObj => runIndicators(cObj));
    }

    function populateIntervals() {
        const container = document.getElementById('interval-buttons');
        container.innerHTML = '';
        INTERVALS.forEach(iv => {
            const btn = document.createElement('button');
            btn.className = 'interval-btn';
            btn.dataset.interval = iv.value;
            btn.textContent = iv.label;
            container.appendChild(btn);
        });
    }

    function populateSymbols() {
        const container = document.getElementById('quick-symbols');
        container.innerHTML = '';
        POPULAR_SYMBOLS.forEach(sym => {
            const btn = document.createElement('button');
            btn.className = 'symbol-btn';
            btn.dataset.symbol = sym;
            btn.textContent = sym.replace('USDT', '');
            btn.addEventListener('click', () => {
                if (!activeChartId) return;
                document.getElementById('symbol-input').value = sym;
                onSymbolChange();
            });
            container.appendChild(btn);
        });
    }

    function onSymbolChange() {
        const cObj = getActiveChart();
        if (!cObj) return;

        const input = document.getElementById('symbol-input');
        const symbol = input.value.toUpperCase().trim();
        if (symbol && symbol !== cObj.symbol) {
            cObj.symbol = symbol;
            updateToolbarUI();
            loadDataForChart(cObj);
        }
    }

    /**
     * Load candle data and run indicators for a specific chart
     */
    async function loadDataForChart(cObj) {
        setLoading(true);
        try {
            // Update the chart header
            const headerLeft = cObj.wrapper.querySelector('.chart-header-left');
            headerLeft.innerHTML = `
                <span style="font-weight:bold; color:var(--text-primary)">${cObj.symbol}</span>
                <span style="color:var(--text-muted)">${cObj.interval.toUpperCase()}</span>
            `;

            // Fetch data
            cObj.candles = await BinanceAPI.fetchKlines(cObj.symbol, cObj.interval, 500);
            if (!cObj.candles.length) throw new Error('No data received');

            // Run indicators and render
            runIndicators(cObj);

            // Subscribe to live updates
            if (cObj.ws) {
                cObj.ws.close();
            }
            cObj.ws = subscribeChartKlines(cObj);

            // Update price display if it's the active chart
            if (activeChartId === cObj.id) {
                const lastCandle = cObj.candles[cObj.candles.length - 1];
                updatePriceDisplay(lastCandle, cObj.candles);
            }

        } catch (err) {
            console.error('Failed to load data:', err);
            showError(`Failed to load ${cObj.symbol}: ${err.message}`);
        }
        setLoading(false);
    }

    function subscribeChartKlines(cObj) {
        const stream = `${cObj.symbol.toLowerCase()}@kline_${cObj.interval}`;
        const ws = new WebSocket(`wss://stream.binance.com:9443/ws/${stream}`);

        ws.onopen = () => {
            setConnectionStatus(true);
        };

        ws.onmessage = (event) => {
            const msg = JSON.parse(event.data);
            if (msg.e === 'kline') {
                const k = msg.k;
                const candle = {
                    time: Math.floor(k.t / 1000),
                    open: parseFloat(k.o),
                    high: parseFloat(k.h),
                    low: parseFloat(k.l),
                    close: parseFloat(k.c),
                    volume: parseFloat(k.v),
                    isFinal: k.x
                };
                onLiveCandle(cObj, candle);
            }
        };

        ws.onerror = (err) => {
            console.error('[Binance WS] Error:', err);
        };

        return ws;
    }

    /**
     * Run all indicators on current candle data for a chart
     */
    function runIndicators(cObj, isNewClosedCandle = false) {
        if (!cObj || !cObj.candles.length) return;

        // Read settings
        const config = {
            plotBull: document.getElementById('toggle-bull-div').checked,
            plotBear: document.getElementById('toggle-bear-div').checked,
            plotHiddenBull: document.getElementById('toggle-hidden-bull').checked,
            plotHiddenBear: document.getElementById('toggle-hidden-bear').checked
        };

        const engulfConfig = {
            showRun: document.getElementById('toggle-run').checked,
            showRev: document.getElementById('toggle-rev').checked
        };

        // 1. RSI Divergence
        const rsiResult = Indicators.detectRSIDivergence(cObj.candles, config);

        // 2. SuperEngulfing
        const engulfSignals = Indicators.detectSuperEngulfing(cObj.candles, engulfConfig);

        // 3. ICT Bias
        const ictResult = Indicators.detectICTBias(cObj.candles);

        // Set chart data
        cObj.instance.setData(cObj.candles, rsiResult.rsi, rsiResult.rsiMA);

        // Combine all signals for the main chart
        const allMainSignals = [
            ...engulfSignals,
            ...rsiResult.signals.map(s => ({
                ...s,
                position: s.type.includes('bull') ? 'belowBar' : 'aboveBar',
                shape: s.type.includes('bull') ? 'arrowUp' : 'arrowDown'
            }))
        ];
        cObj.instance.setMainMarkers(allMainSignals);

        // RSI chart markers
        cObj.instance.setRSIMarkers(rsiResult.signals);

        // ICT Bias
        if (ictResult.bias !== 'Ranging' || ictResult.prevHigh > 0) {
            const lastTime = cObj.candles[cObj.candles.length - 1].time;
            cObj.instance.drawICTBias(ictResult.bias, ictResult.prevHigh, ictResult.prevLow, lastTime);
        }

        // Handle alerts for newly formed signals on a freshly closed candle
        if (isNewClosedCandle) {
            handleAlerts(cObj, rsiResult.signals, engulfSignals, ictResult);
        }

        // Only update global sidebar if this is the active chart
        if (activeChartId === cObj.id) {
            updateSignalPanel(rsiResult.signals, engulfSignals, ictResult);
            updateBiasDisplay(ictResult.bias);

            const lastRSI = rsiResult.rsi[rsiResult.rsi.length - 1];
            if (!isNaN(lastRSI)) {
                document.getElementById('rsi-value').textContent = lastRSI.toFixed(1);
                const rsiEl = document.getElementById('rsi-value');
                rsiEl.className = lastRSI > 70 ? 'stat-value overbought' : lastRSI < 30 ? 'stat-value oversold' : 'stat-value';
            }
        }
    }

    /**
     * Trigger alerts for newly detected signals on a closed candle
     */
    function handleAlerts(cObj, rsiSignals, engulfSignals, ictResult) {
        const lastCandle = cObj.candles[cObj.candles.length - 1];

        // Find signals that fired on this exact candle (or the one before it, depending on confirmation logic)
        // Usually signals are confirmed 1 candle later, or at the exact time of the closed candle.

        const newRsiSignals = rsiSignals.filter(s => s.time === lastCandle.time);
        const newEngulfSignals = engulfSignals.filter(s => s.time === lastCandle.time);

        let newSignalsCount = 0;

        newRsiSignals.forEach(s => {
            showToast(`🔔 [${cObj.symbol} ${cObj.interval}] RSI Divergence: ${s.label}`);
            newSignalsCount++;
        });

        newEngulfSignals.forEach(s => {
            showToast(`🔔 [${cObj.symbol} ${cObj.interval}] SuperEngulfing: ${s.label}`);
            newSignalsCount++;
        });

        // For ICT Bias, maybe only alert if it CHANGED, but for simplicity,
        // if you want alerts on Bias change, you can track previous bias.

        if (newSignalsCount > 0) {
            playAlertSound();
        }

        // --- BACKEND INTEGRATION: Save signals ---
        // Post new confirmed signals to our backend API if they match allowed timeframes
        const allowedTimeframesRsi = ['1h', '4h', '1d'];
        const allowedTimeframesEngulf = ['4h', '1d', '1w'];

        newRsiSignals.forEach(s => {
            if (allowedTimeframesRsi.includes(cObj.interval)) {
                postSignalToBackend({
                    strategyType: 'RSI_DIVERGENCE',
                    symbol: cObj.symbol,
                    timeframe: cObj.interval,
                    signalType: s.type.includes('bull') ? 'BUY' : 'SELL',
                    price: s.price || lastCandle.close,
                    detectedAt: new Date(s.time * 1000).toISOString(),
                    metadata: { rsiValue: s.rsiValue, type: s.type, pattern: s.label }
                });
            }
        });

        newEngulfSignals.forEach(s => {
            if (allowedTimeframesEngulf.includes(cObj.interval)) {
                postSignalToBackend({
                    strategyType: 'SUPER_ENGULFING',
                    symbol: cObj.symbol,
                    timeframe: cObj.interval,
                    signalType: s.direction === 'BUY' ? 'BUY' : 'SELL',
                    price: s.price || lastCandle.close,
                    detectedAt: new Date(s.time * 1000).toISOString(),
                    metadata: { pattern: s.pattern || s.label }
                });
            }
        });
    }

    /**
     * Send signal payload to backend API (Variant B implementation)
     */
    async function postSignalToBackend(payload) {
        try {
            // We use the new /api/signals/client endpoint on our backend which does not require a hardcoded
            // webhook secret, removing the security flaw.
            const apiUrl = '/api/signals/client';

            // Format as the backend signal parser expects (similar to webhook but hitting client endpoint)
            const webhookBody = {
                signals: [
                    {
                        symbol: payload.symbol,
                        price: payload.price,
                        signals_by_timeframe: {
                            [payload.timeframe]: {
                                signals: [
                                    payload.metadata?.pattern || (payload.signalType === 'SELL' ? 'Bearish' : 'Bullish')
                                ],
                                price: payload.price,
                                time: payload.detectedAt
                            }
                        }
                    }
                ]
            };

            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(webhookBody)
            });

            if (!response.ok) {
                console.warn('Failed to post signal to backend:', response.status);
            } else {
                console.log(`Successfully saved ${payload.strategyType} signal for ${payload.symbol} to backend.`);
            }
        } catch (err) {
            console.error('Error posting signal to backend:', err);
        }
    }

    // Global Audio Context to prevent memory leaks (browsers limit to ~6 per page)
    let globalAudioCtx = null;

    /**
     * Play a short audio alert
     */
    function playAlertSound() {
        // Create an oscillator tone as a simple alert
        try {
            if (!globalAudioCtx) {
                globalAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
            }
            // Resume if it was suspended by browser autoplay policies
            if (globalAudioCtx.state === 'suspended') {
                globalAudioCtx.resume();
            }

            const oscillator = globalAudioCtx.createOscillator();
            const gainNode = globalAudioCtx.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(globalAudioCtx.destination);

            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(880, globalAudioCtx.currentTime); // A5

            gainNode.gain.setValueAtTime(0.1, globalAudioCtx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.00001, globalAudioCtx.currentTime + 0.5);

            oscillator.start(globalAudioCtx.currentTime);
            oscillator.stop(globalAudioCtx.currentTime + 0.5);
        } catch (e) {
            console.error('AudioContext not supported or blocked', e);
        }
    }

    /**
     * Show a transient toast notification
     */
    function showToast(message) {
        let toastContainer = document.getElementById('toast-container');
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.id = 'toast-container';
            toastContainer.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                display: flex;
                flex-direction: column;
                gap: 10px;
                z-index: 9999;
            `;
            document.body.appendChild(toastContainer);
        }

        const toast = document.createElement('div');
        toast.style.cssText = `
            background: var(--bg-card);
            border-left: 4px solid var(--accent-blue);
            color: var(--text-primary);
            padding: 12px 16px;
            border-radius: 4px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.5);
            font-size: 13px;
            font-weight: 500;
            opacity: 0;
            transform: translateX(100%);
            transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
        `;
        toast.textContent = message;

        toastContainer.appendChild(toast);

        // Animate in
        requestAnimationFrame(() => {
            toast.style.opacity = '1';
            toast.style.transform = 'translateX(0)';
        });

        // Remove after 5 seconds
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(100%)';
            setTimeout(() => toast.remove(), 300);
        }, 5000);
    }

    /**
     * Handle live candle updates
     */
    function onLiveCandle(cObj, candle) {
        // Update or add candle
        if (cObj.candles.length > 0 && cObj.candles[cObj.candles.length - 1].time === candle.time) {
            cObj.candles[cObj.candles.length - 1] = candle;
        } else {
            cObj.candles.push(candle);
        }

        // Update price chart
        cObj.instance.updateCandle(candle);

        if (activeChartId === cObj.id) {
            updatePriceDisplay(candle, cObj.candles);
        }

        // Optimization: To save performance with multiple charts, we only run full heavy indicators on candle close.
        // But we DO want to calculate the latest RSI value so the live chart stays updated.
        const closes = cObj.candles.map(c => c.close);
        const rsi = Indicators.calculateRSI(closes, 14);
        const rsiMA = Indicators.calculateMA(rsi, 14, 'SMA');
        const lastRSI = rsi[rsi.length - 1];
        const lastRSIMA = rsiMA[rsiMA.length - 1];

        cObj.instance.updateRSI(candle.time, lastRSI, lastRSIMA);

        // Update RSI value display in sidebar if active
        if (activeChartId === cObj.id && !isNaN(lastRSI)) {
            document.getElementById('rsi-value').textContent = lastRSI.toFixed(1);
            const rsiEl = document.getElementById('rsi-value');
            rsiEl.className = lastRSI > 70 ? 'stat-value overbought' : lastRSI < 30 ? 'stat-value oversold' : 'stat-value';
        }

        if (candle.isFinal) {
            runIndicators(cObj, true); // true = notify for new signals
        }
    }

    /**
     * Update the signal panel
     */
    function updateSignalPanel(rsiSignals, engulfSignals, ictResult) {
        const container = document.getElementById('signal-list');
        container.innerHTML = '';

        // Get recent signals (last 20)
        const allSignals = [
            ...rsiSignals.map(s => ({
                ...s,
                indicator: 'RSI Div',
                direction: s.type.includes('bull') ? 'bull' : 'bear'
            })),
            ...engulfSignals.map(s => ({
                ...s,
                indicator: 'Engulfing',
                direction: s.type.includes('bull') ? 'bull' : 'bear'
            }))
        ].sort((a, b) => b.time - a.time).slice(0, 30);

        if (allSignals.length === 0) {
            container.innerHTML = '<div class="no-signals">No signals detected for current settings</div>';
            return;
        }

        allSignals.forEach(signal => {
            const div = document.createElement('div');
            div.className = `signal-item ${signal.direction}`;
            const date = new Date(signal.time * 1000);
            const timeStr = date.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

            div.innerHTML = `
                <div class="signal-header">
                    <span class="signal-badge ${signal.direction}">${signal.label}</span>
                    <span class="signal-indicator">${signal.indicator}</span>
                </div>
                <div class="signal-details">
                    <span class="signal-time">${timeStr}</span>
                    ${signal.price ? `<span class="signal-price">$${formatNumber(signal.price)}</span>` : ''}
                </div>
            `;
            container.appendChild(div);
        });

        // Update signal count
        document.getElementById('signal-count').textContent = allSignals.length;
    }

    /**
     * Update price display
     */
    function updatePriceDisplay(candle, candleArray) {
        const priceEl = document.getElementById('current-price');
        const changeEl = document.getElementById('price-change');

        priceEl.textContent = '$' + formatNumber(candle.close);

        if (candleArray && candleArray.length >= 2) {
            const prevClose = candleArray[candleArray.length - 2]?.close || candle.open;
            const change = ((candle.close - prevClose) / prevClose) * 100;
            changeEl.textContent = (change >= 0 ? '+' : '') + change.toFixed(2) + '%';
            changeEl.className = 'price-change ' + (change >= 0 ? 'positive' : 'negative');
        }
    }

    function updateBiasDisplay(bias) {
        const el = document.getElementById('bias-value');
        el.textContent = bias;
        el.className = 'stat-value bias-' + bias.toLowerCase();
    }

    function setConnectionStatus(connected) {
        const dot = document.getElementById('connection-dot');
        const text = document.getElementById('connection-text');
        dot.className = 'status-dot ' + (connected ? 'connected' : 'disconnected');
        text.textContent = connected ? 'Live' : 'Disconnected';
    }

    function setLoading(loading) {
        document.getElementById('loading-overlay').style.display = loading ? 'flex' : 'none';
    }

    function showError(message) {
        const el = document.getElementById('error-toast');
        el.textContent = message;
        el.style.display = 'block';
        setTimeout(() => el.style.display = 'none', 5000);
    }

    function formatNumber(num) {
        if (num >= 1000) return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        if (num >= 1) return num.toFixed(4);
        return num.toFixed(6);
    }

    return {
        init,
        setConnectionStatus,
        runIndicators
    };
})();

window.App = App;

// Start the app when DOM is ready
document.addEventListener('DOMContentLoaded', () => App.init());
