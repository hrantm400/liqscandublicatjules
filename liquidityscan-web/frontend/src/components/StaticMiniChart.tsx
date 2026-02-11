import { useTheme } from '../contexts/ThemeContext';

interface StaticMiniChartProps {
  candles: Array<{
    openTime: Date | string;
    open: number;
    high: number;
    low: number;
    close: number;
  }>;
  isLong: boolean;
  height?: number;
}

export function StaticMiniChart({ candles, isLong, height = 128 }: StaticMiniChartProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  if (!candles || candles.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <span className={`material-symbols-outlined text-2xl ${isDark ? 'text-gray-600' : 'text-green-300'}`}>show_chart</span>
      </div>
    );
  }

  // Use last 20-30 candles for visualization
  const displayCandles = candles.slice(-30);
  
  // Calculate min and max prices for scaling
  const allPrices = displayCandles.flatMap(c => [c.high, c.low]);
  const minPrice = Math.min(...allPrices);
  const maxPrice = Math.max(...allPrices);
  const priceRange = maxPrice - minPrice || 1;

  // Chart dimensions
  const chartWidth = 100;
  const chartHeight = height - 8; // Padding
  const padding = 4;
  const candleWidth = Math.max(2, (chartWidth - padding * 2) / displayCandles.length - 1);
  const candleSpacing = candleWidth + 1;

  // Color scheme - адаптировано для светлой темы
  const upColor = isLong ? '#13ec37' : '#ff4444';
  const downColor = isLong ? '#ff4444' : '#13ec37';
  const bgColor = isDark ? 'transparent' : '#ffffff';

  // Generate SVG path for candlesticks
  const candleElements = displayCandles.map((candle, index) => {
    const x = padding + index * candleSpacing + candleWidth / 2;
    
    // Scale prices to chart height
    const highY = padding + ((maxPrice - candle.high) / priceRange) * (chartHeight - padding * 2);
    const lowY = padding + ((maxPrice - candle.low) / priceRange) * (chartHeight - padding * 2);
    const openY = padding + ((maxPrice - candle.open) / priceRange) * (chartHeight - padding * 2);
    const closeY = padding + ((maxPrice - candle.close) / priceRange) * (chartHeight - padding * 2);
    
    const isUp = candle.close >= candle.open;
    const bodyTop = Math.min(openY, closeY);
    const bodyBottom = Math.max(openY, closeY);
    const bodyHeight = Math.max(1, bodyBottom - bodyTop);
    
    const color = isUp ? upColor : downColor;

    return (
      <g key={index}>
        {/* Wick */}
        <line
          x1={x}
          y1={highY}
          x2={x}
          y2={lowY}
          stroke={color}
          strokeWidth="1"
          opacity="0.8"
        />
        {/* Body */}
        <rect
          x={x - candleWidth / 2}
          y={bodyTop}
          width={candleWidth}
          height={bodyHeight}
          fill={color}
          opacity="0.9"
        />
      </g>
    );
  });

  return (
    <div className="w-full h-full flex items-center justify-center" style={{ height: `${height}px`, backgroundColor: bgColor }}>
      <svg
        width="100%"
        height={chartHeight}
        viewBox={`0 0 ${chartWidth} ${chartHeight}`}
        preserveAspectRatio="none"
        className="w-full h-full"
      >
        {candleElements}
      </svg>
    </div>
  );
}
