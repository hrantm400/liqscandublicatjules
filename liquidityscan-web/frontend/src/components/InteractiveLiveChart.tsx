import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { createChart, ColorType, Time } from 'lightweight-charts';
import { wsService } from '../services/websocket';
import { useTheme } from '../contexts/ThemeContext';
import { TradingViewWidget } from './TradingViewWidget';
// import { api } from '../services/api'; // TODO: Re-enable when API service is recreated

// Type definitions for lightweight-charts
type IChartApi = ReturnType<typeof createChart>;
type ISeriesApi<T> = any; // Simplified type for series

// ============================================================
// RSI CALCULATION (Wilder's smoothing — matches TradingView)
// ============================================================
function calculateRSI(closes: number[], length = 14): number[] {
  const rsi = new Array(closes.length).fill(NaN);
  if (closes.length < length + 1) return rsi;

  const gains: number[] = [];
  const losses: number[] = [];
  for (let i = 1; i < closes.length; i++) {
    const change = closes[i] - closes[i - 1];
    gains.push(change > 0 ? change : 0);
    losses.push(change < 0 ? -change : 0);
  }

  let avgGain = 0;
  let avgLoss = 0;
  for (let i = 0; i < length; i++) {
    avgGain += gains[i];
    avgLoss += losses[i];
  }
  avgGain /= length;
  avgLoss /= length;

  if (avgLoss === 0) rsi[length] = 100;
  else {
    const rs = avgGain / avgLoss;
    rsi[length] = 100 - 100 / (1 + rs);
  }

  for (let i = length; i < gains.length; i++) {
    avgGain = (avgGain * (length - 1) + gains[i]) / length;
    avgLoss = (avgLoss * (length - 1) + losses[i]) / length;
    if (avgLoss === 0) rsi[i + 1] = 100;
    else {
      const rs = avgGain / avgLoss;
      rsi[i + 1] = 100 - 100 / (1 + rs);
    }
  }
  return rsi;
}

// ============================================================
// PIVOT DETECTION — ported from indicators.js
// ============================================================
function findPivotLows(data: number[], lbL = 5, lbR = 5): boolean[] {
  const pivots = new Array(data.length).fill(false);
  for (let i = lbL; i < data.length - lbR; i++) {
    if (isNaN(data[i])) continue;
    let isPivot = true;
    for (let j = 1; j <= lbL; j++) {
      if (isNaN(data[i - j]) || data[i - j] <= data[i]) { isPivot = false; break; }
    }
    if (!isPivot) continue;
    for (let j = 1; j <= lbR; j++) {
      if (isNaN(data[i + j]) || data[i + j] <= data[i]) { isPivot = false; break; }
    }
    if (isPivot) pivots[i] = true;
  }
  return pivots;
}

function findPivotHighs(data: number[], lbL = 5, lbR = 5): boolean[] {
  const pivots = new Array(data.length).fill(false);
  for (let i = lbL; i < data.length - lbR; i++) {
    if (isNaN(data[i])) continue;
    let isPivot = true;
    for (let j = 1; j <= lbL; j++) {
      if (isNaN(data[i - j]) || data[i - j] >= data[i]) { isPivot = false; break; }
    }
    if (!isPivot) continue;
    for (let j = 1; j <= lbR; j++) {
      if (isNaN(data[i + j]) || data[i + j] >= data[i]) { isPivot = false; break; }
    }
    if (isPivot) pivots[i] = true;
  }
  return pivots;
}

// Detect the LAST divergence from candle data (matching the signal)
interface DivergenceResult {
  prevPivotIdx: number;
  currPivotIdx: number;
  prevPivotPrice: number;
  currPivotPrice: number;
  prevPivotRsi: number;
  currPivotRsi: number;
  type: 'bullish' | 'bearish';
}

function detectLastDivergence(
  candles: { high: number; low: number; close: number; openTime: string | number }[],
  rsiValues: number[],
  signalType: 'BUY' | 'SELL',
  divergenceType: string
): DivergenceResult | null {
  const lbL = 5, lbR = 5;
  const rangeLower = 5, rangeUpper = 60;
  const limitUpper = 70, limitLower = 30;

  const isBullish = signalType === 'BUY' || divergenceType?.includes('bullish');

  if (isBullish) {
    // Bullish: look for pivot lows on RSI
    const pivotLows = findPivotLows(rsiValues, lbL, lbR);
    const positions: number[] = [];
    for (let i = 0; i < pivotLows.length; i++) {
      if (pivotLows[i]) positions.push(i);
    }
    // Search from the end to find the LAST matching divergence
    for (let k = positions.length - 1; k >= 1; k--) {
      const curr = positions[k];
      const prev = positions[k - 1];
      const barsBetween = curr - prev;
      if (barsBetween < rangeLower || barsBetween > rangeUpper) continue;

      const oscCurr = rsiValues[curr];
      const oscPrev = rsiValues[prev];
      const priceCurr = candles[curr].low;
      const pricePrev = candles[prev].low;

      // Regular bullish: price lower low, RSI higher low, prev RSI in oversold zone
      if (priceCurr < pricePrev && oscCurr > oscPrev && oscPrev < limitLower) {
        return {
          prevPivotIdx: prev, currPivotIdx: curr,
          prevPivotPrice: pricePrev, currPivotPrice: priceCurr,
          prevPivotRsi: oscPrev, currPivotRsi: oscCurr,
          type: 'bullish'
        };
      }
    }
  } else {
    // Bearish: look for pivot highs on RSI
    const pivotHighs = findPivotHighs(rsiValues, lbL, lbR);
    const positions: number[] = [];
    for (let i = 0; i < pivotHighs.length; i++) {
      if (pivotHighs[i]) positions.push(i);
    }
    for (let k = positions.length - 1; k >= 1; k--) {
      const curr = positions[k];
      const prev = positions[k - 1];
      const barsBetween = curr - prev;
      if (barsBetween < rangeLower || barsBetween > rangeUpper) continue;

      const oscCurr = rsiValues[curr];
      const oscPrev = rsiValues[prev];
      const priceCurr = candles[curr].high;
      const pricePrev = candles[prev].high;

      // Regular bearish: price higher high, RSI lower high, prev RSI in overbought zone
      if (priceCurr > pricePrev && oscCurr < oscPrev && oscPrev > limitUpper) {
        return {
          prevPivotIdx: prev, currPivotIdx: curr,
          prevPivotPrice: pricePrev, currPivotPrice: priceCurr,
          prevPivotRsi: oscPrev, currPivotRsi: oscCurr,
          type: 'bearish'
        };
      }
    }
  }
  return null;
}

interface Candle {
  id?: string;
  symbol: string;
  timeframe: string;
  openTime: Date | string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  quoteVolume?: number | null;
}

// ============================================================
// DYNAMIC PRICE PRECISION — adapts to any coin price level
// ============================================================
function computePricePrecision(price: number): { precision: number; minMove: number } {
  const absPrice = Math.abs(price);
  if (absPrice === 0) return { precision: 8, minMove: 0.00000001 };
  if (absPrice >= 1000) return { precision: 2, minMove: 0.01 };
  if (absPrice >= 1) return { precision: 4, minMove: 0.0001 };
  if (absPrice >= 0.01) return { precision: 6, minMove: 0.000001 };
  if (absPrice >= 0.0001) return { precision: 8, minMove: 0.00000001 };
  // Ultra-low price (meme coins etc.)
  return { precision: 10, minMove: 0.0000000001 };
}

interface Signal {
  id: string;
  symbol: string;
  timeframe: string;
  signalType: 'BUY' | 'SELL';
  detectedAt: Date | string;
  price: number | string;
  metadata?: Record<string, unknown>;
}

interface InteractiveLiveChartProps {
  candles: Candle[];
  signal?: Signal;
  symbol: string;
  timeframe: string;
  height?: number;
  isFullscreen?: boolean;
  onCandleUpdate?: (candle: Candle) => void;
}

export function InteractiveLiveChart({
  candles,
  signal,
  symbol,
  timeframe,
  height = 600,
  isFullscreen = false,
  onCandleUpdate,
}: InteractiveLiveChartProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candlestickSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  // RSI sub-chart refs
  const rsiContainerRef = useRef<HTMLDivElement>(null);
  const rsiChartRef = useRef<IChartApi | null>(null);
  const rsiSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [showTradingView, setShowTradingView] = useState(false);
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [priceChange, setPriceChange] = useState<number>(0);
  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null);
  const [ictBias, setIctBias] = useState<{ bias: string; message: string } | null>(null);
  const candlesRef = useRef<Candle[]>([]);
  const updateQueueRef = useRef<Candle[]>([]);
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch ICT Bias
  // TODO: Re-enable when API service is recreated
  // useEffect(() => {
  //   if (!candles || candles.length < 3) return;

  //   const fetchBias = async () => {
  //     try {
  //       // Send last 10 candles to optimize payload
  //       const recentCandles = candles.slice(-10);
  //       const result = await api.post<any>('/strategies/ict-bias', recentCandles);
  //       setIctBias(result);
  //     } catch (error) {
  //       console.error('Error fetching ICT bias:', error);
  //     }
  //   };

  //   // Debounce fetch
  //   const timeout = setTimeout(fetchBias, 2000);
  //   return () => clearTimeout(timeout);
  // }, [candles.length, symbol, timeframe]); // Only re-fetch when candle count changes (new candle) or context changes

  // Initialize chart
  useEffect(() => {
    if (showTradingView || !chartContainerRef.current) return;

    // Clean up previous chart
    if (chartRef.current) {
      try {
        chartRef.current.remove();
      } catch (error) {
        // Ignore cleanup errors
      }
      chartRef.current = null;
      candlestickSeriesRef.current = null;
      setIsInitialized(false);
    }

    // Wait for container to have dimensions
    let retryCount = 0;
    const maxRetries = 50; // Max 5 seconds (50 * 100ms)

    const initChart = () => {
      if (!chartContainerRef.current) {
        if (retryCount < maxRetries) {
          retryCount++;
          setTimeout(initChart, 100);
        } else {
          console.error('Chart container ref is null after max retries');
        }
        return;
      }

      const container = chartContainerRef.current;
      const containerWidth = container.clientWidth;
      const containerHeight = container.clientHeight || (isFullscreen ? window.innerHeight - 100 : height);

      if (containerWidth === 0 || containerHeight === 0) {
        if (retryCount < maxRetries) {
          retryCount++;
          setTimeout(initChart, 100);
        } else {
          console.error(`Chart container has zero dimensions after max retries: width=${containerWidth}, height=${containerHeight}`);
        }
        return;
      }

      // Ensure minimum dimensions
      const chartWidth = Math.max(containerWidth, 100);
      const isRsi = signal?.id?.startsWith('RSI_DIVERGENCE');
      // Don't subtract RSI panel height here — the CSS layout handles container sizing.
      // The chart fills whatever height its container has.
      const chartHeight = Math.max(containerHeight, 200);

      try {
        // Verify createChart is available
        if (typeof createChart !== 'function') {
          console.error('createChart is not a function. Check lightweight-charts import.');
          console.error('createChart type:', typeof createChart);
          console.error('Available imports:', { createChart, IChartApi, ISeriesApi, ColorType });
          return;
        }

        console.log(`Creating chart with dimensions: ${chartWidth}x${chartHeight} for container: ${containerWidth}x${containerHeight}`);

        const chart = createChart(container, {
          layout: {
            background: { type: ColorType.Solid, color: isDark ? '#0a0e0b' : '#ffffff' },
            textColor: isDark ? '#ffffff' : '#1a1a1a',
            fontSize: 11,
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
            attributionLogo: false,
          },
          grid: {
            vertLines: {
              color: isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(19, 236, 55, 0.05)',
              style: 0,
              visible: true,
            },
            horzLines: {
              color: isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(19, 236, 55, 0.05)',
              style: 0,
              visible: true,
            },
          },
          width: chartWidth,
          height: chartHeight,
          timeScale: {
            timeVisible: true,
            secondsVisible: false,
            borderColor: isRsi ? 'transparent' : (isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(19, 236, 55, 0.15)'),
            rightOffset: 5,
            barSpacing: 10,
            minBarSpacing: 3,
            visible: !isRsi,
          },
          rightPriceScale: {
            borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(19, 236, 55, 0.15)',
            scaleMargins: {
              top: 0.1,
              bottom: 0.1,
            },
          },
          crosshair: {
            mode: 1, // Normal mode
            vertLine: {
              color: isDark ? 'rgba(255, 255, 255, 0.3)' : 'rgba(19, 236, 55, 0.4)',
              width: 1,
              style: 0,
              labelBackgroundColor: isDark ? '#13ec37' : '#13ec37',
            },
            horzLine: {
              color: isDark ? 'rgba(255, 255, 255, 0.3)' : 'rgba(19, 236, 55, 0.4)',
              width: 1,
              style: 0,
              labelBackgroundColor: isDark ? '#13ec37' : '#13ec37',
            },
          },
        });

        if (!chart) {
          console.error('createChart returned null or undefined');
          return;
        }

        // Add candlestick series using v4.x API
        // Price format will be set dynamically when data arrives
        let candlestickSeries;
        try {
          candlestickSeries = chart.addCandlestickSeries({
            upColor: '#13ec37',
            downColor: '#ff4444',
            borderVisible: true,
            borderUpColor: '#13ec37',
            borderDownColor: '#ff4444',
            wickUpColor: '#13ec37',
            wickDownColor: '#ff4444',
          });
          console.log('Candlestick series added successfully');
        } catch (seriesError) {
          console.error('Error adding candlestick series:', seriesError);
          return;
        }

        chartRef.current = chart;
        candlestickSeriesRef.current = candlestickSeries;

        // === RSI SUB-CHART (only for RSI_DIVERGENCE signals) ===
        const isRsiSignal = signal?.id?.startsWith('RSI_DIVERGENCE');
        if (isRsiSignal && rsiContainerRef.current) {
          const rsiHeight = isFullscreen ? 200 : 180;
          const rsiChart = createChart(rsiContainerRef.current, {
            layout: {
              background: { type: ColorType.Solid, color: isDark ? '#0a0e0b' : '#ffffff' },
              textColor: isDark ? '#9ca3af' : '#6b7280',
              fontSize: 10,
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
              attributionLogo: false,
            },
            grid: {
              vertLines: { color: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.03)', visible: true },
              horzLines: { color: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.03)', visible: true },
            },
            width: containerWidth,
            height: rsiHeight,
            timeScale: {
              timeVisible: true,
              secondsVisible: false,
              borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.1)',
              rightOffset: 5,
              barSpacing: 10,
              minBarSpacing: 3,
            },
            rightPriceScale: {
              borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.1)',
              scaleMargins: { top: 0.05, bottom: 0.05 },
            },
            crosshair: {
              mode: 1,
              vertLine: { color: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)', width: 1, style: 0, labelBackgroundColor: isDark ? '#eab308' : '#eab308' },
              horzLine: { color: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)', width: 1, style: 0, labelBackgroundColor: isDark ? '#eab308' : '#eab308' },
            },
          });

          // Add RSI line series (yellow like TradingView)
          const rsiLine = rsiChart.addLineSeries({
            color: '#eab308',
            lineWidth: 2,
            priceLineVisible: false,
            lastValueVisible: true,
            title: 'RSI 14',
          });

          // Add horizontal levels (30, 50, 70)
          const level30 = rsiChart.addLineSeries({ color: isDark ? 'rgba(34,197,94,0.4)' : 'rgba(34,197,94,0.5)', lineWidth: 1, lineStyle: 2, priceLineVisible: false, lastValueVisible: false, title: '' });
          const level50 = rsiChart.addLineSeries({ color: isDark ? 'rgba(156,163,175,0.3)' : 'rgba(156,163,175,0.4)', lineWidth: 1, lineStyle: 2, priceLineVisible: false, lastValueVisible: false, title: '' });
          const level70 = rsiChart.addLineSeries({ color: isDark ? 'rgba(239,68,68,0.4)' : 'rgba(239,68,68,0.5)', lineWidth: 1, lineStyle: 2, priceLineVisible: false, lastValueVisible: false, title: '' });

          rsiChartRef.current = rsiChart;
          rsiSeriesRef.current = rsiLine;
          (rsiChart as any).level30 = level30;
          (rsiChart as any).level50 = level50;
          (rsiChart as any).level70 = level70;

          // Sync time scales between price and RSI charts
          chart.timeScale().subscribeVisibleLogicalRangeChange((range: any) => {
            if (range && rsiChartRef.current) {
              rsiChartRef.current.timeScale().setVisibleLogicalRange(range);
            }
          });
          rsiChart.timeScale().subscribeVisibleLogicalRangeChange((range: any) => {
            if (range && chartRef.current) {
              chartRef.current.timeScale().setVisibleLogicalRange(range);
            }
          });
        }

        setIsInitialized(true);
        console.log('Chart initialization completed successfully');

        // Handle resize
        const handleResize = () => {
          if (chartContainerRef.current && chartRef.current) {
            chartRef.current.applyOptions({
              width: chartContainerRef.current.clientWidth,
              height: chartContainerRef.current.clientHeight || 200,
            });
          }
          if (rsiContainerRef.current && rsiChartRef.current) {
            rsiChartRef.current.applyOptions({
              width: rsiContainerRef.current.clientWidth,
              height: rsiContainerRef.current.clientHeight || 180,
            });
          }
        };

        window.addEventListener('resize', handleResize);

        // Cleanup function
        return () => {
          window.removeEventListener('resize', handleResize);
          if (chartRef.current) {
            try {
              // Clean up special lines
              if ((chartRef.current as any).seSLLine) {
                chartRef.current.removeSeries((chartRef.current as any).seSLLine);
              }
              if ((chartRef.current as any).seTP1Line) {
                chartRef.current.removeSeries((chartRef.current as any).seTP1Line);
              }
              if ((chartRef.current as any).seTP2Line) {
                chartRef.current.removeSeries((chartRef.current as any).seTP2Line);
              }
              if ((chartRef.current as any).displacementLine) {
                chartRef.current.removeSeries((chartRef.current as any).displacementLine);
              }
              if ((chartRef.current as any).divergencePriceLine) {
                chartRef.current.removeSeries((chartRef.current as any).divergencePriceLine);
              }
              chartRef.current.remove();
            } catch (error) {
              console.error('Error removing chart:', error);
            }
            chartRef.current = null;
            candlestickSeriesRef.current = null;
          }
          // Clean up RSI chart
          if (rsiChartRef.current) {
            try { rsiChartRef.current.remove(); } catch (e) { /* ignore */ }
            rsiChartRef.current = null;
            rsiSeriesRef.current = null;
          }
          setIsInitialized(false);
        };
      } catch (error) {
        console.error('Error creating chart:', error);
        return;
      }
    };

    const timeoutId = setTimeout(initChart, 50);

    return () => {
      clearTimeout(timeoutId);
      if (chartRef.current) {
        try { chartRef.current.remove(); } catch (e) { /* ignore */ }
        chartRef.current = null;
        candlestickSeriesRef.current = null;
      }
      if (rsiChartRef.current) {
        try { rsiChartRef.current.remove(); } catch (e) { /* ignore */ }
        rsiChartRef.current = null;
        rsiSeriesRef.current = null;
      }
      setIsInitialized(false);
    };
  }, [height, isFullscreen, theme, isDark, showTradingView]);

  // Update chart with candles data (with performance optimization)
  useEffect(() => {
    if (!isInitialized || !candlestickSeriesRef.current || candles.length === 0) {
      return;
    }

    // Limit candles to prevent performance issues (keep last 3000 candles for better chart view)
    const maxCandles = 3000;
    const candlesToUse = candles.length > maxCandles ? candles.slice(-maxCandles) : candles;

    try {
      // Prepare candlestick data
      const rawChartData = candlesToUse.map((candle) => ({
        time: Math.floor(new Date(candle.openTime).getTime() / 1000) as Time,
        open: candle.open,
        high: candle.high,
        low: candle.low,
        close: candle.close,
      }));

      // Deduplicate by timestamp — lightweight-charts crashes on duplicate times
      const seenTimes = new Set<number>();
      const chartData = rawChartData.filter(c => {
        const t = c.time as number;
        if (seenTimes.has(t)) return false;
        seenTimes.add(t);
        return true;
      });

      // Dynamically compute price precision from the data
      const samplePrice = chartData.length > 0 ? chartData[chartData.length - 1].close : 1;
      const { precision: dynamicPrecision, minMove: dynamicMinMove } = computePricePrecision(samplePrice);
      try {
        candlestickSeriesRef.current.applyOptions({
          priceFormat: {
            type: 'price',
            precision: dynamicPrecision,
            minMove: dynamicMinMove,
          },
        });
      } catch (e) { /* ignore if applyOptions fails */ }

      // Update series
      candlestickSeriesRef.current.setData(chartData);

      // Clean up previous Strategy 1 Risk/Reward lines if exist
      if ((chartRef.current as any).slLine) {
        try { chartRef.current.removeSeries((chartRef.current as any).slLine); } catch (e) { }
      }
      if ((chartRef.current as any).tp1Line) {
        try { chartRef.current.removeSeries((chartRef.current as any).tp1Line); } catch (e) { }
      }
      if ((chartRef.current as any).tp2Line) {
        try { chartRef.current.removeSeries((chartRef.current as any).tp2Line); } catch (e) { }
      }

      // Draw TP and SL lines if Strategy 1
      if (signal?.id?.startsWith('STRATEGY_1') && signal.metadata) {
        const lineStartIdx = Math.max(0, chartData.length - 100); // Draw across recent candles
        const lineStart = chartData[lineStartIdx].time as any;
        const lineEnd = chartData[chartData.length - 1].time as any;

        if (lineStart < lineEnd) {
          if (signal.metadata.stopLoss) {
            const slLine = chartRef.current.addLineSeries({
              color: '#ff4444',
              lineWidth: 2,
              lineStyle: 2,
              priceLineVisible: true,
              lastValueVisible: true,
              title: 'Stop Loss',
            });
            slLine.setData([
              { time: lineStart, value: Number(signal.metadata.stopLoss) },
              { time: lineEnd, value: Number(signal.metadata.stopLoss) },
            ]);
            (chartRef.current as any).slLine = slLine;
          }

          if (signal.metadata.tp1) {
            const tp1Line = chartRef.current.addLineSeries({
              color: '#13ec37',
              lineWidth: 2,
              lineStyle: 1, // Dotted
              priceLineVisible: true,
              lastValueVisible: true,
              title: 'TP1',
            });
            tp1Line.setData([
              { time: lineStart, value: Number(signal.metadata.tp1) },
              { time: lineEnd, value: Number(signal.metadata.tp1) },
            ]);
            (chartRef.current as any).tp1Line = tp1Line;
          }

          if (signal.metadata.tp2) {
            const tp2Line = chartRef.current.addLineSeries({
              color: '#13ec37',
              lineWidth: 2,
              lineStyle: 0, // Solid
              priceLineVisible: true,
              lastValueVisible: true,
              title: 'TP2',
            });
            tp2Line.setData([
              { time: lineStart, value: Number(signal.metadata.tp2) },
              { time: lineEnd, value: Number(signal.metadata.tp2) },
            ]);
            (chartRef.current as any).tp2Line = tp2Line;
          }
        }
      }

      // Update current price
      if (candlesToUse.length > 0) {
        const lastCandle = candlesToUse[candlesToUse.length - 1];
        const prevCandle = candlesToUse.length > 1 ? candlesToUse[candlesToUse.length - 2] : null;

        setCurrentPrice(lastCandle.close);
        if (prevCandle) {
          setPriceChange(((lastCandle.close - prevCandle.close) / prevCandle.close) * 100);
        }
      }

      // Add signal marker and special visual elements if signal exists
      if (signal && chartRef.current && chartData.length > 0) {
        // Find the candle that matches the signal detection time
        const signalDetectedTime = Math.floor(new Date(signal.detectedAt).getTime() / 1000);

        // Search ALL candles for the one closest to signal time
        let signalCandleIndex = -1;
        let bestDiff = Infinity;

        for (let i = 0; i < chartData.length; i++) {
          const candleTime = chartData[i].time as number;
          const diff = Math.abs(candleTime - signalDetectedTime);
          if (diff < bestDiff) {
            bestDiff = diff;
            signalCandleIndex = i;
          }
        }

        console.log('Signal info:', {
          signalDetectedTime: new Date(signalDetectedTime * 1000).toISOString(),
          foundCandleIndex: signalCandleIndex,
          foundCandleTime: signalCandleIndex >= 0 ? new Date((chartData[signalCandleIndex].time as number) * 1000).toISOString() : null,
          timeDiffSeconds: bestDiff,
          signalType: signal.signalType,
          pattern: signal.metadata?.type || signal.metadata?.pattern
        });

        if (signalCandleIndex >= 0) {
          const signalTime = chartData[signalCandleIndex].time;

          // Get pattern type from metadata for better label
          const patternType = signal.metadata?.type || signal.metadata?.pattern || '';
          const direction = signal.signalType === 'BUY' ? 'LONG' : 'SHORT';

          // Format pattern label
          let patternLabel = '';
          if (typeof patternType === 'string' && patternType) {
            // Remove XL and 2X from label logic
            const formattedType = patternType
              .replace('_PLUS', '+')
              .replace('_XL', '')
              .replace('_2X', '')
              .replace('_', ' ');
            patternLabel = formattedType;
          } else {
            patternLabel = direction;
          }

          // Always use arrows for clear visibility
          const markerShape = signal.signalType === 'BUY' ? 'arrowUp' as const : 'arrowDown' as const;

          const marker = {
            time: signalTime,
            position: signal.signalType === 'BUY' ? 'belowBar' as const : 'aboveBar' as const,
            color: signal.signalType === 'BUY' ? '#13ec37' : '#ff4444',
            shape: markerShape,
            text: patternLabel || direction,
            size: 2, // Size 2 is good for arrows
          };

          try {
            candlestickSeriesRef.current.setMarkers([marker]);
          } catch (error) {
            console.error('Error setting marker:', error);
          }

          // Add SL / TP1 / TP2 / TP3 lines for SuperEngulfing signals (v3)
          const isSESignal = signal?.id?.startsWith('SUPER_ENGULFING');
          if (isSESignal && signal && chartRef.current && signalCandleIndex >= 0) {
            // Get SE targets — prefer v3 fields, fallback to legacy
            const seSL = signal.current_sl_price ?? signal.sl_price ?? signal.se_current_sl ?? signal.se_sl ?? (signal.metadata as any)?.se_sl;
            const seTP1 = signal.tp1_price ?? signal.se_tp1 ?? (signal.metadata as any)?.se_tp1;
            const seTP2 = signal.tp2_price ?? signal.se_tp2 ?? (signal.metadata as any)?.se_tp2;
            const seTP3 = signal.tp3_price ?? (signal.metadata as any)?.tp3_price;

            const lineStartIdx = Math.max(0, signalCandleIndex - 5);
            const lineStart = chartData[lineStartIdx].time as any;
            const lineEnd = chartData[chartData.length - 1].time as any;

            // Clean up previous SE lines
            if ((chartRef.current as any).seSLLine) {
              try { chartRef.current.removeSeries((chartRef.current as any).seSLLine); } catch (e) { }
            }
            if ((chartRef.current as any).seTP1Line) {
              try { chartRef.current.removeSeries((chartRef.current as any).seTP1Line); } catch (e) { }
            }
            if ((chartRef.current as any).seTP2Line) {
              try { chartRef.current.removeSeries((chartRef.current as any).seTP2Line); } catch (e) { }
            }
            if ((chartRef.current as any).seTP3Line) {
              try { chartRef.current.removeSeries((chartRef.current as any).seTP3Line); } catch (e) { }
            }

            if (lineStart < lineEnd) {
              // SL line (red dashed)
              if (seSL) {
                const slLine = chartRef.current.addLineSeries({
                  color: '#ff4444',
                  lineWidth: 2,
                  lineStyle: 2, // Dashed
                  priceLineVisible: true,
                  lastValueVisible: true,
                  title: signal.tp1_hit ? 'SL (BE)' : 'SL',
                });
                slLine.setData([
                  { time: lineStart, value: Number(seSL) },
                  { time: lineEnd, value: Number(seSL) },
                ]);
                (chartRef.current as any).seSLLine = slLine;
              }

              // TP1 line (amber dotted) — 1.5R
              if (seTP1) {
                const tp1Line = chartRef.current.addLineSeries({
                  color: '#f59e0b',
                  lineWidth: 1,
                  lineStyle: 1, // Dotted
                  priceLineVisible: true,
                  lastValueVisible: true,
                  title: signal.tp1_hit ? 'TP1 (1.5R) ✓' : 'TP1 (1.5R)',
                });
                tp1Line.setData([
                  { time: lineStart, value: Number(seTP1) },
                  { time: lineEnd, value: Number(seTP1) },
                ]);
                (chartRef.current as any).seTP1Line = tp1Line;
              }

              // TP2 line (cyan dotted) — 2R
              if (seTP2) {
                const tp2Line = chartRef.current.addLineSeries({
                  color: '#22d3ee',
                  lineWidth: 1,
                  lineStyle: 1, // Dotted
                  priceLineVisible: true,
                  lastValueVisible: true,
                  title: signal.tp2_hit ? 'TP2 (2R) ✓' : 'TP2 (2R)',
                });
                tp2Line.setData([
                  { time: lineStart, value: Number(seTP2) },
                  { time: lineEnd, value: Number(seTP2) },
                ]);
                (chartRef.current as any).seTP2Line = tp2Line;
              }

              // TP3 line (green solid) — 3R
              if (seTP3) {
                const tp3Line = chartRef.current.addLineSeries({
                  color: '#13ec37',
                  lineWidth: 2,
                  lineStyle: 0, // Solid
                  priceLineVisible: true,
                  lastValueVisible: true,
                  title: signal.tp3_hit ? 'TP3 (3R) ✓' : 'TP3 (3R)',
                });
                tp3Line.setData([
                  { time: lineStart, value: Number(seTP3) },
                  { time: lineEnd, value: Number(seTP3) },
                ]);
                (chartRef.current as any).seTP3Line = tp3Line;
              }
            }
          }

          // Add displacement line (from signal point)
          if (signalCandleIndex >= 0 && signalCandleIndex < chartData.length) {
            const signalCandle = chartData[signalCandleIndex];

            // Clean up previous line if exists
            if ((chartRef.current as any).displacementLine) {
              try {
                chartRef.current.removeSeries((chartRef.current as any).displacementLine);
              } catch (e) {
                // Ignore cleanup errors
              }
            }

            const displacementLine = chartRef.current.addLineSeries({
              color: signal.signalType === 'BUY' ? '#13ec37' : '#ff4444',
              lineWidth: 2,
              lineStyle: 0, // Solid
              priceLineVisible: true,
              lastValueVisible: true,
              title: 'Entry Price',
            });

            // Use signal price if available, otherwise use candle close
            const entryPrice = typeof signal.price === 'number' ? signal.price : signalCandle.close;

            // Fix type error for Time arithmetic in v4
            const entryStartTime = signalTime as any;
            const entryEndTime = chartData[chartData.length - 1].time as any;

            if (entryStartTime < entryEndTime) {
              displacementLine.setData([
                { time: entryStartTime, value: entryPrice },
                { time: entryEndTime, value: entryPrice },
              ]);
              // Store reference for cleanup
              (chartRef.current as any).displacementLine = displacementLine;
            } else {
              chartRef.current.removeSeries(displacementLine);
            }
          }

          // === ICT BIAS LEVEL LINES ===
          const isBiasSignal = signal?.id?.startsWith('ICT_BIAS');
          if (isBiasSignal && chartRef.current) {
            const biasMetadata = signal.metadata as any;
            const biasUpperLevel = biasMetadata?.prevHigh;
            const biasLowerLevel = biasMetadata?.prevLow;
            const biasType = biasMetadata?.bias; // 'BULLISH' | 'BEARISH'
            const biasLevel = signal.bias_level ?? biasMetadata?.bias_level;

            // Clean up previous bias lines
            if ((chartRef.current as any).biasUpperLine) {
              try { chartRef.current.removeSeries((chartRef.current as any).biasUpperLine); } catch (e) { /* ignore */ }
            }
            if ((chartRef.current as any).biasLowerLine) {
              try { chartRef.current.removeSeries((chartRef.current as any).biasLowerLine); } catch (e) { /* ignore */ }
            }
            if ((chartRef.current as any).biasLevelLine) {
              try { chartRef.current.removeSeries((chartRef.current as any).biasLevelLine); } catch (e) { /* ignore */ }
            }

            // Start line ~20 candles before signal for better visual context
            const lineStartIdx = Math.max(0, signalCandleIndex - 20);
            const lineStart = chartData[lineStartIdx].time as any;
            const lineEnd = chartData[chartData.length - 1].time as any;

            // Strict inequality — lightweight-charts crashes if start === end
            if (lineStart < lineEnd) {
              if (biasUpperLevel && biasLowerLevel) {
                // Upper level line (Candle B's high)
                const biasUpperLine = chartRef.current.addLineSeries({
                  color: biasType === 'BULLISH' ? '#13ec37' : '#888888',
                  lineWidth: 2,
                  lineStyle: 2, // Dashed
                  priceLineVisible: true,
                  lastValueVisible: true,
                  title: biasType === 'BULLISH'
                    ? '▲ Bullish — Expect higher'
                    : 'Upper Level',
                });
                biasUpperLine.setData([
                  { time: lineStart, value: Number(biasUpperLevel) },
                  { time: lineEnd, value: Number(biasUpperLevel) },
                ]);
                (chartRef.current as any).biasUpperLine = biasUpperLine;

                // Lower level line (Candle B's low)
                const biasLowerLine = chartRef.current.addLineSeries({
                  color: biasType === 'BEARISH' ? '#ff4444' : '#888888',
                  lineWidth: 2,
                  lineStyle: 2, // Dashed
                  priceLineVisible: true,
                  lastValueVisible: true,
                  title: biasType === 'BEARISH'
                    ? '▼ Bearish — Expect lower'
                    : 'Lower Level',
                });
                biasLowerLine.setData([
                  { time: lineStart, value: Number(biasLowerLevel) },
                  { time: lineEnd, value: Number(biasLowerLevel) },
                ]);
                (chartRef.current as any).biasLowerLine = biasLowerLine;
              }

              // Bias Level line (the close price that confirmed bias — validation level)
              if (biasLevel) {
                const biasLevelLine = chartRef.current.addLineSeries({
                  color: '#00bcd4', // Cyan
                  lineWidth: 2,
                  lineStyle: 1, // Dotted
                  priceLineVisible: true,
                  lastValueVisible: true,
                  title: '📍 Bias Level',
                });
                biasLevelLine.setData([
                  { time: chartData[signalCandleIndex].time as any, value: Number(biasLevel) },
                  { time: lineEnd, value: Number(biasLevel) },
                ]);
                (chartRef.current as any).biasLevelLine = biasLevelLine;
              }
            }
          }

          // === RSI DIVERGENCE TREND LINES (computed from candle data) ===
          const metadata = signal.metadata as any;
          const isRsiDiv = signal?.id?.startsWith('RSI_DIVERGENCE');
          if (isRsiDiv && candlesToUse.length > 30) {
            const closes = candlesToUse.map(c => c.close);
            const rsiVals = calculateRSI(closes, 14);
            const divResult = detectLastDivergence(
              candlesToUse as any, rsiVals,
              signal.signalType as 'BUY' | 'SELL',
              metadata?.divergenceType || ''
            );

            if (divResult) {
              // Clean up previous divergence line if exists
              if ((chartRef.current as any).divergencePriceLine) {
                try { chartRef.current.removeSeries((chartRef.current as any).divergencePriceLine); } catch (e) { /* ignore */ }
              }

              const prevPivotTimeSec = Math.floor(new Date(candlesToUse[divResult.prevPivotIdx].openTime).getTime() / 1000) as Time;
              const currPivotTimeSec = Math.floor(new Date(candlesToUse[divResult.currPivotIdx].openTime).getTime() / 1000) as Time;
              const isBullish = divResult.type === 'bullish';
              const lineColor = isBullish ? '#13ec37' : '#ff4444';
              const isHidden = metadata?.divergenceType?.includes('hidden');

              const divergencePriceLine = chartRef.current.addLineSeries({
                color: lineColor,
                lineWidth: 3,
                lineStyle: isHidden ? 2 : 0,
                priceLineVisible: false,
                lastValueVisible: false,
                title: isHidden
                  ? (isBullish ? '↗ Hidden Bull Div' : '↘ Hidden Bear Div')
                  : (isBullish ? '↗ Bullish Divergence' : '↘ Bearish Divergence'),
              });

              divergencePriceLine.setData([
                { time: prevPivotTimeSec, value: divResult.prevPivotPrice },
                { time: currPivotTimeSec, value: divResult.currPivotPrice },
              ]);
              (chartRef.current as any).divergencePriceLine = divergencePriceLine;

              // Add markers at both pivot points + signal marker
              const allMarkers = [
                {
                  time: signalTime,
                  position: signal.signalType === 'BUY' ? 'belowBar' as const : 'aboveBar' as const,
                  color: signal.signalType === 'BUY' ? '#13ec37' : '#ff4444',
                  shape: signal.signalType === 'BUY' ? 'arrowUp' as const : 'arrowDown' as const,
                  text: patternLabel || direction,
                  size: 2,
                },
                {
                  time: prevPivotTimeSec,
                  position: isBullish ? 'belowBar' as const : 'aboveBar' as const,
                  color: lineColor, shape: 'circle' as const, text: 'Pivot 1', size: 1,
                },
                {
                  time: currPivotTimeSec,
                  position: isBullish ? 'belowBar' as const : 'aboveBar' as const,
                  color: lineColor, shape: 'circle' as const, text: 'Pivot 2', size: 1,
                },
              ].sort((a, b) => (a.time as number) - (b.time as number));

              try { candlestickSeriesRef.current.setMarkers(allMarkers); } catch (e) { /* ignore */ }
            }
          }

          // Zoom to signal area — show ~70 candles before and ~30 after
          const zoomBefore = 70;
          const zoomAfter = 30; // 30% empty space on the right
          const logicalFrom = Math.max(0, signalCandleIndex - zoomBefore);
          const logicalTo = signalCandleIndex + zoomAfter; // Do not clamp to chartData.length - 1 to allow empty space
          try {
            chartRef.current.timeScale().setVisibleLogicalRange({
              from: logicalFrom,
              to: logicalTo,
            });
          } catch (e) {
            // Fallback to fitContent if setVisibleLogicalRange fails
            chartRef.current.timeScale().fitContent();
          }
        }
      }

      // === RSI SUB-CHART DATA ===
      const isRsiSignal = signal?.id?.startsWith('RSI_DIVERGENCE');
      if (isRsiSignal && rsiChartRef.current && rsiSeriesRef.current) {
        const closes = candlesToUse.map(c => c.close);
        const rsiValues = calculateRSI(closes, 14);
        const chartTimes = candlesToUse.map(c => Math.floor(new Date(c.openTime).getTime() / 1000) as Time);

        // RSI line data (skip NaN values)
        const rsiData: { time: Time; value: number }[] = [];
        for (let i = 0; i < rsiValues.length; i++) {
          if (!isNaN(rsiValues[i])) {
            rsiData.push({ time: chartTimes[i], value: rsiValues[i] });
          }
        }
        if (rsiData.length > 0) {
          rsiSeriesRef.current.setData(rsiData);

          // Set horizontal level lines (30, 50, 70) spanning the full time range
          const firstTime = rsiData[0].time;
          const lastTime = rsiData[rsiData.length - 1].time;
          const levelData30 = [{ time: firstTime, value: 30 }, { time: lastTime, value: 30 }];
          const levelData50 = [{ time: firstTime, value: 50 }, { time: lastTime, value: 50 }];
          const levelData70 = [{ time: firstTime, value: 70 }, { time: lastTime, value: 70 }];

          try {
            (rsiChartRef.current as any).level30?.setData(levelData30);
            (rsiChartRef.current as any).level50?.setData(levelData50);
            (rsiChartRef.current as any).level70?.setData(levelData70);
          } catch (e) { /* ignore level errors */ }

          // === DIVERGENCE TREND LINE ON RSI CHART (computed from candle data) ===
          const rsiMetadata = signal?.metadata as any;
          if (candlesToUse.length > 30) {
            const divResult = detectLastDivergence(
              candlesToUse as any, rsiValues,
              (signal?.signalType || 'BUY') as 'BUY' | 'SELL',
              rsiMetadata?.divergenceType || ''
            );

            if (divResult) {
              // Clean up previous RSI divergence line
              if ((rsiChartRef.current as any).rsiDivergenceLine) {
                try { rsiChartRef.current.removeSeries((rsiChartRef.current as any).rsiDivergenceLine); } catch (e) { /* ignore */ }
              }

              const prevPivotTimeSec = chartTimes[divResult.prevPivotIdx];
              const currPivotTimeSec = chartTimes[divResult.currPivotIdx];
              const isBullish = divResult.type === 'bullish';
              const isHidden = rsiMetadata?.divergenceType?.includes('hidden');
              const lineColor = isBullish ? '#13ec37' : '#ff4444';

              const rsiDivLine = rsiChartRef.current.addLineSeries({
                color: lineColor,
                lineWidth: 3,
                lineStyle: isHidden ? 2 : 0,
                priceLineVisible: false,
                lastValueVisible: false,
                title: '',
              });

              rsiDivLine.setData([
                { time: prevPivotTimeSec, value: divResult.prevPivotRsi },
                { time: currPivotTimeSec, value: divResult.currPivotRsi },
              ]);
              (rsiChartRef.current as any).rsiDivergenceLine = rsiDivLine;

              // Add circle markers on RSI divergence line
              rsiDivLine.setMarkers([
                { time: prevPivotTimeSec, position: isBullish ? 'belowBar' as const : 'aboveBar' as const, color: lineColor, shape: 'circle' as const, text: '', size: 1 },
                { time: currPivotTimeSec, position: isBullish ? 'belowBar' as const : 'aboveBar' as const, color: lineColor, shape: 'circle' as const, text: '', size: 1 },
              ]);
            }
          }

          // Fit RSI chart and sync with price chart
          rsiChartRef.current.timeScale().fitContent();
        }
      }
    } catch (error) {
      console.error('Error updating chart data:', error);
    }
  }, [candles, signal, isInitialized]);

  // Update chart theme when theme changes
  useEffect(() => {
    if (!chartRef.current || !isInitialized) return;

    try {
      chartRef.current.applyOptions({
        layout: {
          background: { type: ColorType.Solid, color: isDark ? '#0a0e0b' : '#ffffff' },
          textColor: isDark ? '#ffffff' : '#1a1a1a',
          fontSize: 11,
        },
        grid: {
          vertLines: {
            color: isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(19, 236, 55, 0.08)',
            style: 0,
            visible: true,
          },
          horzLines: {
            color: isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(19, 236, 55, 0.08)',
            style: 0,
            visible: true,
          },
        },
        timeScale: {
          borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(19, 236, 55, 0.15)',
        },
        rightPriceScale: {
          borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(19, 236, 55, 0.15)',
        },
        crosshair: {
          vertLine: {
            color: isDark ? 'rgba(255, 255, 255, 0.3)' : 'rgba(19, 236, 55, 0.4)',
          },
          horzLine: {
            color: isDark ? 'rgba(255, 255, 255, 0.3)' : 'rgba(19, 236, 55, 0.4)',
          },
        },
      });
    } catch (error) {
      console.error('Error updating chart theme:', error);
    }
  }, [theme, isDark, isInitialized]);

  // Update candles ref when candles prop changes
  useEffect(() => {
    candlesRef.current = candles;
  }, [candles]);

  // Handle real-time candle updates with batching and animation
  const handleCandleUpdate = useCallback((newCandle: Candle) => {
    if (newCandle.symbol === symbol && newCandle.timeframe === timeframe) {
      // Add to update queue
      updateQueueRef.current.push(newCandle);
      setLastUpdateTime(new Date());

      // Batch updates to avoid too frequent redraws
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }

      updateTimeoutRef.current = setTimeout(() => {
        const updates = [...updateQueueRef.current];
        updateQueueRef.current = [];

        if (updates.length > 0 && candlestickSeriesRef.current) {
          // Update candles array
          const updatedCandles = [...candlesRef.current];

          updates.forEach((update) => {
            const index = updatedCandles.findIndex(
              c => new Date(c.openTime).getTime() === new Date(update.openTime).getTime()
            );

            if (index >= 0) {
              // Update existing candle with animation
              updatedCandles[index] = update;
            } else {
              // Add new candle with animation
              updatedCandles.push(update);
              updatedCandles.sort((a, b) =>
                new Date(a.openTime).getTime() - new Date(b.openTime).getTime()
              );
            }
          });

          candlesRef.current = updatedCandles;

          // Prepare chart data
          const chartData = updatedCandles.map((candle) => ({
            time: Math.floor(new Date(candle.openTime).getTime() / 1000) as Time,
            open: candle.open,
            high: candle.high,
            low: candle.low,
            close: candle.close,
          }));

          // Smooth update with animation
          requestAnimationFrame(() => {
            if (candlestickSeriesRef.current) {
              candlestickSeriesRef.current.setData(chartData);

              // Re-add signal marker if signal exists (to maintain it after updates)
              if (signal && chartRef.current && chartData.length > 0) {
                const signalDetectedTime = Math.floor(new Date(signal.detectedAt).getTime() / 1000);

                // Search all candles for best match
                let bestIndex = -1;
                let bestDiff = Infinity;

                for (let i = 0; i < chartData.length; i++) {
                  const diff = Math.abs((chartData[i].time as number) - signalDetectedTime);
                  if (diff < bestDiff) {
                    bestDiff = diff;
                    bestIndex = i;
                  }
                }

                if (bestIndex >= 0) {
                  const signalTime = chartData[bestIndex].time;
                  const patternType = signal.metadata?.type || signal.metadata?.pattern || '';
                  const direction = signal.signalType === 'BUY' ? 'LONG' : 'SHORT';

                  // Format pattern label
                  let patternLabel = '';
                  if (patternType) {
                    const formattedType = patternType
                      .replace('_PLUS', '+')
                      .replace('_', ' ');
                    patternLabel = formattedType;
                  } else {
                    patternLabel = direction;
                  }

                  // Always use arrows for visibility
                  const markerShape = signal.signalType === 'BUY' ? 'arrowUp' as const : 'arrowDown' as const;

                  const marker = {
                    time: signalTime,
                    position: signal.signalType === 'BUY' ? 'belowBar' as const : 'aboveBar' as const,
                    color: signal.signalType === 'BUY' ? '#13ec37' : '#ff4444',
                    shape: markerShape,
                    text: patternLabel || direction,
                    size: 3,
                  };

                  try {
                    candlestickSeriesRef.current.setMarkers([marker]);
                  } catch (error) {
                    console.error('Error updating marker:', error);
                  }
                }
              }

              // Update price info
              if (updatedCandles.length > 0) {
                const lastCandle = updatedCandles[updatedCandles.length - 1];
                const prevCandle = updatedCandles.length > 1 ? updatedCandles[updatedCandles.length - 2] : null;

                setCurrentPrice(lastCandle.close);
                if (prevCandle) {
                  setPriceChange(((lastCandle.close - prevCandle.close) / prevCandle.close) * 100);
                }
              }

              // Notify parent component
              if (onCandleUpdate && updates.length > 0) {
                updates.forEach(update => onCandleUpdate(update));
              }
            }
          });
        }
      }, 100); // Batch updates every 100ms
    }
  }, [symbol, timeframe, onCandleUpdate, signal]);

  // Subscribe to WebSocket updates
  useEffect(() => {
    if (!symbol || !timeframe) return;

    // Subscribe to symbol updates
    wsService.subscribeToSymbol(symbol, timeframe);
    wsService.on('candle:update', handleCandleUpdate);

    return () => {
      wsService.off('candle:update', handleCandleUpdate);
      wsService.unsubscribeFromSymbol(symbol, timeframe);
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
    };
  }, [symbol, timeframe, handleCandleUpdate]);

  // Chart toolbar functions
  const handleZoomIn = useCallback(() => {
    if (chartRef.current) {
      const timeScale = chartRef.current.timeScale();
      const visibleRange = timeScale.getVisibleRange();
      if (visibleRange) {
        const from = visibleRange.from as any as number;
        const to = visibleRange.to as any as number;
        const range = to - from;
        const center = (from + to) / 2;
        timeScale.setVisibleRange({
          from: (center - range * 0.7) as any,
          to: (center + range * 0.7) as any,
        });
      }
    }
  }, []);

  const handleZoomOut = useCallback(() => {
    if (chartRef.current) {
      const timeScale = chartRef.current.timeScale();
      const visibleRange = timeScale.getVisibleRange();
      if (visibleRange) {
        const from = visibleRange.from as any as number;
        const to = visibleRange.to as any as number;
        const range = to - from;
        const center = (from + to) / 2;
        timeScale.setVisibleRange({
          from: (center - range * 1.4) as any,
          to: (center + range * 1.4) as any,
        });
      }
    }
  }, []);

  const handleResetZoom = useCallback(() => {
    if (chartRef.current) {
      chartRef.current.timeScale().fitContent();
    }
  }, []);

  // Convert timeframe to TradingView format
  const getTradingViewTimeframe = useCallback((tf: string): string => {
    const tfLower = tf.toLowerCase();
    if (tfLower === '1m') return '1';
    if (tfLower === '3m') return '3';
    if (tfLower === '5m') return '5';
    if (tfLower === '15m') return '15';
    if (tfLower === '30m') return '30';
    if (tfLower === '1h') return '60';
    if (tfLower === '2h') return '120';
    if (tfLower === '4h') return '240';
    if (tfLower === '6h') return '360';
    if (tfLower === '8h') return '480';
    if (tfLower === '12h') return '720';
    if (tfLower === '1d') return 'D';
    if (tfLower === '3d') return '3D';
    if (tfLower === '1w') return 'W';
    if (tfLower === '1M') return 'M';
    return '240'; // Default to 4h
  }, []);

  // Get TradingView URL
  const getTradingViewUrl = useCallback(() => {
    const tvTimeframe = getTradingViewTimeframe(timeframe);
    return `https://www.tradingview.com/chart/?symbol=BINANCE:${symbol}&interval=${tvTimeframe}`;
  }, [symbol, timeframe, getTradingViewTimeframe]);

  // Calculate volume for last 24h (optimized with memoization)
  const last24hVolume = useMemo(() => {
    if (candles.length === 0) return 0;
    const now = Date.now();
    const last24h = now - 24 * 60 * 60 * 1000;
    // Only check last 200 candles for performance
    const recentCandles = candles.slice(-200);
    return recentCandles
      .filter(c => new Date(c.openTime).getTime() >= last24h)
      .reduce((sum, c) => sum + c.volume, 0);
  }, [candles]);

  return (
    <div className="relative w-full h-full chart-container bg-background-dark/20 backdrop-blur-sm rounded-2xl overflow-hidden border dark:border-white/5 light:border-green-200 shadow-2xl">
      {/* Texture Overlay */}
      <div className="absolute inset-0 pointer-events-none z-0 opacity-20 bg-[url('/grid-texture.png')] bg-repeat opacity-[0.03]"></div>

      {/* Toolbar */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.2 }}
        className="absolute top-4 right-4 z-20 flex items-center gap-2 chart-toolbar pointer-events-auto"
      >
        <div className="flex items-center gap-1 px-2 py-1.5 rounded-xl glass-panel shadow-lg border dark:border-white/10 light:border-green-300">
          <motion.button
            whileHover={{ scale: 1.15, color: '#13ec37' }}
            whileTap={{ scale: 0.9 }}
            onClick={handleZoomIn}
            className="p-2 rounded-lg dark:hover:bg-white/10 light:hover:bg-green-100 dark:text-gray-400 light:text-text-dark transition-all duration-300 chart-toolbar-button"
            title="Zoom In"
          >
            <span className="material-symbols-outlined text-xl">add</span>
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.15, color: '#13ec37' }}
            whileTap={{ scale: 0.9 }}
            onClick={handleZoomOut}
            className="p-2 rounded-lg dark:hover:bg-white/10 light:hover:bg-green-100 dark:text-gray-400 light:text-text-dark transition-all duration-300 chart-toolbar-button"
            title="Zoom Out"
          >
            <span className="material-symbols-outlined text-xl">remove</span>
          </motion.button>
          <div className="w-px h-5 dark:bg-white/10 light:bg-green-300 mx-1"></div>
          <motion.button
            whileHover={{ scale: 1.15, color: '#13ec37' }}
            whileTap={{ scale: 0.9 }}
            onClick={handleResetZoom}
            className="p-2 rounded-lg dark:hover:bg-white/10 light:hover:bg-green-100 dark:text-gray-400 light:text-text-dark transition-all duration-300 chart-toolbar-button"
            title="Reset Zoom"
          >
            <span className="material-symbols-outlined text-xl">fit_screen</span>
          </motion.button>
        </div>
        {signal && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowTradingView(!showTradingView)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl backdrop-blur-xl transition-all duration-300 shadow-lg border group ${showTradingView
              ? 'bg-primary/20 border-primary/50 text-primary shadow-[0_0_15px_rgba(19,236,55,0.2)]'
              : 'glass-panel dark:border-white/10 light:border-green-300 dark:text-gray-300 light:text-text-dark hover:border-primary/30 hover:text-primary'
              }`}
            title={showTradingView ? "Switch to Native Chart" : "Switch to TradingView"}
          >
            <span className="material-symbols-outlined text-xl transition-transform group-hover:rotate-180 duration-500">
              {showTradingView ? 'candlestick_chart' : 'change_history'}
            </span>
            <span className="text-xs font-bold hidden sm:inline uppercase tracking-wider">
              {showTradingView ? 'Native Chart' : 'TradingView'}
            </span>
          </motion.button>
        )}
      </motion.div>

      {/* Price Info Overlay - Bottom Left */}
      {currentPrice !== null && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="absolute bottom-6 left-6 z-20 flex flex-col gap-3 pointer-events-none"
        >
          <div className="flex items-end gap-4">
            <div className="flex flex-col">
              <div className="flex items-baseline gap-3">
                <span className="text-5xl font-black tracking-tighter dark:text-white light:text-text-dark drop-shadow-lg font-mono">
                  {currentPrice.toFixed(computePricePrecision(currentPrice).precision)}
                </span>
                <div className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-sm font-bold backdrop-blur-md border ${priceChange >= 0
                  ? 'bg-green-500/10 border-green-500/20 text-green-500'
                  : 'bg-red-500/10 border-red-500/20 text-red-500'
                  }`}>
                  <span className="material-symbols-outlined text-sm font-black">
                    {priceChange >= 0 ? 'arrow_upward' : 'arrow_downward'}
                  </span>
                  <span>{Math.abs(priceChange).toFixed(2)}%</span>
                </div>
              </div>
              <div className="flex items-center gap-4 mt-1">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${lastUpdateTime && (Date.now() - lastUpdateTime.getTime()) < 5000 ? 'bg-primary animate-pulse shadow-[0_0_8px_#13ec37]' : 'bg-gray-500'}`}></span>
                  <span className="text-xs font-mono uppercase tracking-widest dark:text-gray-400 light:text-text-light-secondary opacity-70">
                    Real-time Data • {symbol} • {timeframe}
                  </span>
                </div>

                {/* ICT Bias Indicator */}
                {ictBias && (
                  <div className="flex items-center gap-2 pl-4 border-l border-white/10">
                    <span className="text-xs font-mono dark:text-gray-400 light:text-slate-500 uppercase tracking-widest opacity-70">BIAS:</span>
                    <span className={`text-xs font-bold px-1.5 py-0.5 rounded border ${ictBias.bias === 'BULLISH' ? 'bg-[#13ec37]/10 text-[#13ec37] border-[#13ec37]/20 shadow-[0_0_10px_rgba(19,236,55,0.1)]' :
                      ictBias.bias === 'BEARISH' ? 'bg-[#ff4444]/10 text-[#ff4444] border-[#ff4444]/20 shadow-[0_0_10px_rgba(255,68,68,0.1)]' :
                        'bg-gray-500/10 dark:text-gray-400 light:text-slate-500 border-gray-500/20'
                      }`}>
                      {ictBias.bias}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      )
      }
      {/* TradingView Widget Overlay */}
      {
        showTradingView && (
          <div className="absolute inset-0 z-10 bg-background-dark/95 backdrop-blur-sm">
            <TradingViewWidget
              symbol={symbol}
              interval={getTradingViewTimeframe(timeframe)}
              theme={isDark ? 'dark' : 'light'}
              height="100%"
            />
          </div>
        )
      }

      {/* Charts Container */}
      <div className="w-full" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        {/* Main Price Chart — its height is set via CSS calc so the chart fills it exactly */}
        <div
          ref={chartContainerRef}
          className="w-full"
          style={signal?.id?.startsWith('RSI_DIVERGENCE')
            ? { height: `calc(100% - ${isFullscreen ? 200 : 180}px)` }
            : { height: '100%' }
          }
        />

        {/* RSI Sub-Chart (only for RSI divergence signals) */}
        {signal?.id?.startsWith('RSI_DIVERGENCE') && (
          <div className="w-full" style={{ height: isFullscreen ? 200 : 180, borderTop: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.1)' }}>
            <div className="relative w-full h-full">
              <div className="absolute top-1 left-2 z-10 flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-1.5 py-0.5 rounded" style={{ background: isDark ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.7)', color: isDark ? '#eab308' : '#ca8a04', border: isDark ? '1px solid rgba(234,179,8,0.2)' : '1px solid rgba(202,138,4,0.3)' }}>
                  RSI 14
                </span>
              </div>
              <div ref={rsiContainerRef} className="w-full h-full" />
            </div>
          </div>
        )}
      </div>
    </div >
  );
}
