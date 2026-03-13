// ============================================================
// chart.js — Chart Rendering with Lightweight Charts
// ============================================================

class ChartInstance {
    constructor(mainContainerId, rsiContainerId) {
        this.mainChart = null;
        this.rsiChart = null;
        this.candleSeries = null;
        this.rsiSeries = null;
        this.rsiMASeries = null;
        this.overboughtLine = null;
        this.oversoldLine = null;
        this.midLine = null;
        this.volumeSeries = null;

        this.biasHighLine = null;
        this.biasLowLine = null;
        this.storedCandles = [];
        this.resizeObserver = null;

        this.CHART_COLORS = {
            bg: '#0a0e17',
            grid: '#1a1e2e',
            text: '#848e9c',
            upColor: '#0ecb81',
            downColor: '#f6465d',
            borderUp: '#0ecb81',
            borderDown: '#f6465d',
            wickUp: '#0ecb81',
            wickDown: '#f6465d',
            rsiLine: '#d1d4dc',
            rsiMA: '#f0b90b',
            overbought: '#f6465d44',
            oversold: '#0ecb8144',
            volumeUp: 'rgba(14, 203, 129, 0.3)',
            volumeDown: 'rgba(246, 70, 93, 0.3)'
        };

        this.init(mainContainerId, rsiContainerId);
    }

    /**
     * Initialize both charts
     */
    init(mainContainerId, rsiContainerId) {
        const mainContainer = document.getElementById(mainContainerId);
        const rsiContainer = document.getElementById(rsiContainerId);

        // ---- MAIN CHART ----
        this.mainChart = LightweightCharts.createChart(mainContainer, {
            layout: {
                background: { type: 'solid', color: this.CHART_COLORS.bg },
                textColor: this.CHART_COLORS.text,
                fontFamily: "'Inter', sans-serif"
            },
            grid: {
                vertLines: { color: this.CHART_COLORS.grid },
                horzLines: { color: this.CHART_COLORS.grid }
            },
            crosshair: {
                mode: LightweightCharts.CrosshairMode.Normal,
                vertLine: { color: '#ffffff33', width: 1, style: 3 },
                horzLine: { color: '#ffffff33', width: 1, style: 3 }
            },
            rightPriceScale: {
                borderColor: this.CHART_COLORS.grid,
                scaleMargins: { top: 0.05, bottom: 0.15 }
            },
            timeScale: {
                borderColor: this.CHART_COLORS.grid,
                timeVisible: true,
                secondsVisible: false
            },
            handleScroll: { vertTouchDrag: false }
        });

        this.candleSeries = this.mainChart.addCandlestickSeries({
            upColor: this.CHART_COLORS.upColor,
            downColor: this.CHART_COLORS.downColor,
            borderUpColor: this.CHART_COLORS.borderUp,
            borderDownColor: this.CHART_COLORS.borderDown,
            wickUpColor: this.CHART_COLORS.wickUp,
            wickDownColor: this.CHART_COLORS.wickDown
        });

        this.volumeSeries = this.mainChart.addHistogramSeries({
            priceFormat: { type: 'volume' },
            priceScaleId: 'volume',
        });
        this.mainChart.priceScale('volume').applyOptions({
            scaleMargins: { top: 0.85, bottom: 0 }
        });

        // ---- RSI CHART ----
        this.rsiChart = LightweightCharts.createChart(rsiContainer, {
            layout: {
                background: { type: 'solid', color: this.CHART_COLORS.bg },
                textColor: this.CHART_COLORS.text,
                fontFamily: "'Inter', sans-serif"
            },
            grid: {
                vertLines: { color: this.CHART_COLORS.grid },
                horzLines: { color: this.CHART_COLORS.grid }
            },
            crosshair: {
                mode: LightweightCharts.CrosshairMode.Normal
            },
            rightPriceScale: {
                borderColor: this.CHART_COLORS.grid,
                scaleMargins: { top: 0.05, bottom: 0.05 }
            },
            timeScale: {
                borderColor: this.CHART_COLORS.grid,
                timeVisible: true,
                secondsVisible: false,
                visible: false
            },
            handleScroll: { vertTouchDrag: false }
        });

        this.rsiSeries = this.rsiChart.addLineSeries({
            color: this.CHART_COLORS.rsiLine,
            lineWidth: 1.5,
            priceFormat: { type: 'custom', formatter: (v) => v.toFixed(1) }
        });

        this.rsiMASeries = this.rsiChart.addLineSeries({
            color: this.CHART_COLORS.rsiMA,
            lineWidth: 1,
            lineStyle: 0,
            priceFormat: { type: 'custom', formatter: (v) => v.toFixed(1) }
        });

        // Overbought / Oversold / Mid lines
        this.overboughtLine = this.rsiChart.addLineSeries({
            color: '#f6465d55',
            lineWidth: 1,
            lineStyle: 2,
            crosshairMarkerVisible: false,
            lastValueVisible: false,
            priceLineVisible: false
        });

        this.oversoldLine = this.rsiChart.addLineSeries({
            color: '#0ecb8155',
            lineWidth: 1,
            lineStyle: 2,
            crosshairMarkerVisible: false,
            lastValueVisible: false,
            priceLineVisible: false
        });

        this.midLine = this.rsiChart.addLineSeries({
            color: '#848e9c33',
            lineWidth: 1,
            lineStyle: 2,
            crosshairMarkerVisible: false,
            lastValueVisible: false,
            priceLineVisible: false
        });

        // Sync time scales
        this.mainChart.timeScale().subscribeVisibleTimeRangeChange(() => {
            const mainRange = this.mainChart.timeScale().getVisibleLogicalRange();
            if (mainRange) this.rsiChart.timeScale().setVisibleLogicalRange(mainRange);
        });

        this.rsiChart.timeScale().subscribeVisibleTimeRangeChange(() => {
            const rsiRange = this.rsiChart.timeScale().getVisibleLogicalRange();
            if (rsiRange) this.mainChart.timeScale().setVisibleLogicalRange(rsiRange);
        });

        // Resize
        this.handleResize(mainContainer, rsiContainer);
    }

    handleResize(mainContainer, rsiContainer) {
        this.resizeObserver = new ResizeObserver(entries => {
            for (const entry of entries) {
                const { width, height } = entry.contentRect;
                if (entry.target === mainContainer && this.mainChart) {
                    this.mainChart.applyOptions({ width, height });
                }
                if (entry.target === rsiContainer && this.rsiChart) {
                    this.rsiChart.applyOptions({ width, height });
                }
            }
        });
        this.resizeObserver.observe(mainContainer);
        this.resizeObserver.observe(rsiContainer);
    }

    /**
     * Set candle data on both charts
     */
    setData(candles, rsi, rsiMA) {
        this.storedCandles = candles;

        // Candlestick data
        this.candleSeries.setData(candles.map(c => ({
            time: c.time,
            open: c.open,
            high: c.high,
            low: c.low,
            close: c.close
        })));

        // Volume
        this.volumeSeries.setData(candles.map(c => ({
            time: c.time,
            value: c.volume,
            color: c.close >= c.open ? this.CHART_COLORS.volumeUp : this.CHART_COLORS.volumeDown
        })));

        // RSI data
        const rsiData = [];
        const rsiMAData = [];
        for (let i = 0; i < candles.length; i++) {
            if (!isNaN(rsi[i])) {
                rsiData.push({ time: candles[i].time, value: rsi[i] });
            }
            if (!isNaN(rsiMA[i])) {
                rsiMAData.push({ time: candles[i].time, value: rsiMA[i] });
            }
        }
        this.rsiSeries.setData(rsiData);
        this.rsiMASeries.setData(rsiMAData);

        // Reference lines for RSI
        const timeBounds = [
            { time: candles[0].time },
            { time: candles[candles.length - 1].time }
        ];
        this.overboughtLine.setData(timeBounds.map(t => ({ ...t, value: 70 })));
        this.oversoldLine.setData(timeBounds.map(t => ({ ...t, value: 30 })));
        this.midLine.setData(timeBounds.map(t => ({ ...t, value: 50 })));

        // Fit content
        this.mainChart.timeScale().fitContent();
        this.rsiChart.timeScale().fitContent();
    }

    /**
     * Update the latest candle (live)
     */
    updateCandle(candle) {
        this.candleSeries.update({
            time: candle.time,
            open: candle.open,
            high: candle.high,
            low: candle.low,
            close: candle.close
        });

        this.volumeSeries.update({
            time: candle.time,
            value: candle.volume,
            color: candle.close >= candle.open ? this.CHART_COLORS.volumeUp : this.CHART_COLORS.volumeDown
        });
    }

    /**
     * Update RSI live
     */
    updateRSI(time, rsiValue, rsiMAValue) {
        if (!isNaN(rsiValue)) {
            this.rsiSeries.update({ time, value: rsiValue });
        }
        if (!isNaN(rsiMAValue)) {
            this.rsiMASeries.update({ time, value: rsiMAValue });
        }
    }

    /**
     * Set markers on the main chart (SuperEngulfing + RSI Divergence on price)
     */
    setMainMarkers(signals) {
        const markers = signals
            .filter(s => s.time)
            .map(s => ({
                time: s.time,
                position: s.position || (s.type.includes('bull') ? 'belowBar' : 'aboveBar'),
                color: s.color || '#fff',
                shape: s.position === 'belowBar' || s.type.includes('bull') ? 'arrowUp' : 'arrowDown',
                text: s.label || ''
            }))
            .sort((a, b) => a.time - b.time);

        this.candleSeries.setMarkers(markers);
    }

    /**
     * Set markers on the RSI chart (divergence dots)
     */
    setRSIMarkers(signals) {
        const markers = signals
            .filter(s => s.time && s.rsiValue !== undefined)
            .map(s => ({
                time: s.time,
                position: s.type.includes('bull') ? 'belowBar' : 'aboveBar',
                color: s.color || '#fff',
                shape: 'circle',
                text: s.label || ''
            }))
            .sort((a, b) => a.time - b.time);

        this.rsiSeries.setMarkers(markers);
    }

    /**
     * Draw ICT Bias lines on the main chart
     */
    drawICTBias(bias, prevHigh, prevLow, lastTime) {
        // Remove existing bias lines
        if (this.biasHighLine) {
            this.mainChart.removeSeries(this.biasHighLine);
            this.biasHighLine = null;
        }
        if (this.biasLowLine) {
            this.mainChart.removeSeries(this.biasLowLine);
            this.biasLowLine = null;
        }

        const biasColor = bias === 'Bullish' ? '#4CAF5088' : bias === 'Bearish' ? '#f4433688' : '#2196F388';

        this.biasHighLine = this.mainChart.addLineSeries({
            color: biasColor,
            lineWidth: 1,
            lineStyle: 2,
            crosshairMarkerVisible: false,
            lastValueVisible: true,
            priceLineVisible: false,
            title: `${bias} — High`
        });

        this.biasLowLine = this.mainChart.addLineSeries({
            color: biasColor,
            lineWidth: 1,
            lineStyle: 2,
            crosshairMarkerVisible: false,
            lastValueVisible: true,
            priceLineVisible: false,
            title: `${bias} — Low`
        });

        // Draw from a few bars back to a few bars forward
        const startTime = this.storedCandles.length > 5 ? this.storedCandles[this.storedCandles.length - 5].time : lastTime;
        this.biasHighLine.setData([
            { time: startTime, value: prevHigh },
            { time: lastTime, value: prevHigh }
        ]);
        this.biasLowLine.setData([
            { time: startTime, value: prevLow },
            { time: lastTime, value: prevLow }
        ]);
    }

    /**
     * Destroy charts
     */
    destroy() {
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
        }
        if (this.mainChart) { this.mainChart.remove(); this.mainChart = null; }
        if (this.rsiChart) { this.rsiChart.remove(); this.rsiChart = null; }
    }
}

window.ChartInstance = ChartInstance;
