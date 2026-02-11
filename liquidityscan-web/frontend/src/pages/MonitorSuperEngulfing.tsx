import { useState, useMemo, useCallback, useEffect } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
// import { signalsApi } from '../services/api'; // TODO: Re-enable when API service is recreated
import { Signal } from '../types';
import { StaticMiniChart } from '../components/StaticMiniChart';
import { FilterMenu } from '../components/shared/FilterMenu';
import { PatternFilter } from '../components/shared/PatternFilter';
import { SignalBadge } from '../components/shared/SignalBadge';
import { PageHeader } from '../components/layout/PageHeader';
import { AnimatedCard } from '../components/animations/AnimatedCard';
import { AnimatedList } from '../components/animations/AnimatedList';
import { useMarketData } from '../hooks/useMarketData';
import { fetchCandles } from '../services/candles';
import { useSignalFilter } from '../hooks/useSignalFilter';
import { listItemVariants, scaleInVariants } from '../utils/animations';
import { userApi } from '../services/userApi';
import { useAuthStore } from '../store/authStore';

// Component for signal card with static mini chart
function SignalCardWithChart({ signal, isLong }: { signal: Signal; isLong: boolean }) {
  const { data: candlesData } = useQuery({
    queryKey: ['candles', signal.symbol, signal.timeframe, 'mini'],
    queryFn: () => fetchCandles(signal.symbol, signal.timeframe, 50),
    enabled: !!signal?.symbol && !!signal?.timeframe,
    staleTime: 300000,
  });

  const candles = candlesData || [];

  return (
    <div className="h-40 w-full dark:bg-black/40 light:bg-gray-100 relative dark:border-y-white/5 light:border-y-green-200/30 border-y overflow-hidden group-hover:border-primary/20 transition-colors">
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent z-10 pointer-events-none" />
      <div
        className={`absolute inset-0 ${isLong
          ? 'bg-[radial-gradient(circle_at_50%_100%,rgba(19,236,55,0.1),transparent_70%)]'
          : 'bg-[radial-gradient(circle_at_50%_100%,rgba(239,68,68,0.1),transparent_70%)]'
          } opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none z-10`}
      ></div>
      <StaticMiniChart candles={candles} isLong={isLong} height={160} />
    </div>
  );
}

// Symbol Avatar Component
function SymbolAvatar({ symbol }: { symbol: string }) {
  const firstLetter = symbol.charAt(0).toUpperCase();
  const colors = [
    'bg-orange-500/20 text-orange-500 ring-orange-500/40',
    'bg-purple-500/20 text-purple-500 ring-purple-500/40',
    'bg-teal-500/20 text-teal-500 ring-teal-500/40',
    'bg-red-500/20 text-red-500 ring-red-500/40',
    'bg-blue-500/20 text-blue-500 ring-blue-500/40',
    'bg-green-500/20 text-green-500 ring-green-500/40',
    'bg-pink-500/20 text-pink-500 ring-pink-500/40',
    'bg-blue-600/20 text-blue-600 ring-blue-600/40',
  ];
  const colorIndex = symbol.charCodeAt(0) % colors.length;
  return (
    <div className={`w-6 h-6 rounded-full ${colors[colorIndex]} flex items-center justify-center text-[10px] font-bold ring-1`}>
      {firstLetter}
    </div>
  );
}

// Format time helper
function formatTime(dateString: string) {
  const date = new Date(dateString);
  return date.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export function MonitorSuperEngulfing() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [bullFilter, setBullFilter] = useState('All');
  const [bearFilter, setBearFilter] = useState('All');
  const [sortBy, setSortBy] = useState<'confidence' | 'time' | 'symbol'>('confidence');
  const [marketCapSort, setMarketCapSort] = useState<'high-low' | 'low-high' | null>(null);
  const [volumeSort, setVolumeSort] = useState<'high-low' | 'low-high' | null>(null);
  const [rankingFilter, setRankingFilter] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'closed'>('all'); // 'all' | 'active' | 'closed'
  const [filterMenuOpen, setFilterMenuOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  // By default, show all timeframes (don't filter)
  const [selectedTimeframe, setSelectedTimeframe] = useState<string | null>(searchParams.get('timeframe') || null);
  const [pageSize, setPageSize] = useState(50);
  const [currentPage, setCurrentPage] = useState(1);
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<string | null>(null);

  const { isAuthenticated } = useAuthStore();
  const { data: mySubscription } = useQuery({
    queryKey: ['mySubscription'],
    queryFn: () => userApi.getMySubscription(),
    enabled: isAuthenticated,
  });
  const isFreeForever = mySubscription?.subscription?.tier === 'SCOUT';
  const allowedPairs: string[] | undefined = mySubscription?.subscription?.limits?.pairs;

  // Free Forever: reset Rev+/Run+ to All when plan only allows Standard
  useEffect(() => {
    if (isFreeForever && (bullFilter === 'Run+' || bullFilter === 'Rev+' || bearFilter === 'Run+' || bearFilter === 'Rev+')) {
      setBullFilter('All');
      setBearFilter('All');
    }
  }, [isFreeForever]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync selectedTimeframe with URL
  useEffect(() => {
    const tf = searchParams.get('timeframe');
    setSelectedTimeframe(tf || null); // null means show all timeframes
  }, [searchParams]);

  // Use the new useMarketData hook
  const { signals, isLoading } = useMarketData({
    strategyType: 'SUPER_ENGULFING',
    limit: 5000, // Increased limit to show all signals
    refetchInterval: 60000,
  });

  // Use the new useSignalFilter hook
  // Don't filter by timeframe here - apply it separately so we can show all signals by default
  const filteredSignals = useSignalFilter({
    signals,
    searchQuery,
    activeTimeframe: undefined, // Don't filter by timeframe - show all timeframes
    bullFilter,
    bearFilter,
    sortBy,
    marketCapSort,
    volumeSort,
    rankingFilter,
    showClosedSignals: true, // Always show all signals, filter by status separately
    strategyType: 'SUPER_ENGULFING',
  });

  // Apply timeframe filter (if a specific timeframe is selected)
  const timeframeFilteredSignals = useMemo(() => {
    if (!selectedTimeframe) {
      return filteredSignals; // Show all timeframes if none selected
    }
    return filteredSignals.filter(s => s.timeframe.toLowerCase() === selectedTimeframe.toLowerCase());
  }, [filteredSignals, selectedTimeframe]);

  // Apply status filter
  const statusFilteredSignals = useMemo(() => {
    let result = timeframeFilteredSignals;
    if (statusFilter === 'active') {
      result = result.filter(s => s.status === 'ACTIVE');
    } else if (statusFilter === 'closed') {
      result = result.filter(s => s.status !== 'ACTIVE'); // CLOSED, EXPIRED, FILLED
    }
    return result;
  }, [timeframeFilteredSignals, statusFilter]);

  // Free Forever (SCOUT): restrict to allowed pairs only (BTC, ETH, EURUSD, XAUUSD)
  const subscriptionFilteredSignals = useMemo(() => {
    if (!isFreeForever || !allowedPairs?.length) return statusFilteredSignals;
    return statusFilteredSignals.filter((s) =>
      allowedPairs.some(
        (p) =>
          s.symbol === p ||
          s.symbol.toUpperCase().startsWith(p.toUpperCase()) ||
          s.symbol.toUpperCase().includes(p.toUpperCase())
      )
    );
  }, [statusFilteredSignals, isFreeForever, allowedPairs]);

  // Pagination
  const totalPages = Math.ceil(subscriptionFilteredSignals.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedSignals = subscriptionFilteredSignals.slice(startIndex, endIndex);

  // Debug: Log signals count (after statusFilteredSignals is defined)
  useEffect(() => {
    if (signals.length > 0) {
      console.log(`[SuperEngulfing] Total signals loaded: ${signals.length}`);
      const byStatus = signals.reduce((acc, s) => {
        acc[s.status] = (acc[s.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      console.log(`[SuperEngulfing] Signals by status:`, byStatus);
      const byTimeframe = signals.reduce((acc, s) => {
        const tf = s.timeframe.toLowerCase();
        acc[tf] = (acc[tf] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      console.log(`[SuperEngulfing] Signals by timeframe:`, byTimeframe);
      console.log(`[SuperEngulfing] Selected timeframe:`, selectedTimeframe);
      console.log(`[SuperEngulfing] Status filter:`, statusFilter);
      console.log(`[SuperEngulfing] Filtered signals count:`, subscriptionFilteredSignals.length);
    }
  }, [signals, selectedTimeframe, statusFilter, subscriptionFilteredSignals]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedTimeframe, searchQuery, bullFilter, bearFilter, sortBy, statusFilter]);

  // Calculate signals by timeframe - count ONLY ACTIVE signals for cards
  const timeframeStats = useMemo(() => {
    const stats: Record<string, number> = {
      '4h': 0,
      '1d': 0,
      '1w': 0,
    };

    // Count only ACTIVE signals for timeframe cards
    signals.forEach((signal) => {
      if (signal.status === 'ACTIVE') {
        const tf = signal.timeframe.toLowerCase();
        if (tf === '4h' || tf === '1d' || tf === '1w') {
          stats[tf] = (stats[tf] || 0) + 1;
        }
      }
    });

    return stats;
  }, [signals]);

  // Calculate Pattern Stats from actual signals
  const patternStats = useMemo(() => {
    // Get signals from last 24 hours
    const now = Date.now();
    const twentyFourHoursAgo = now - 24 * 60 * 60 * 1000;

    const recentSignals = signals.filter(s => {
      const signalTime = new Date(s.detectedAt).getTime();
      return signalTime >= twentyFourHoursAgo;
    });

    // Calculate success rate (closed signals that were profitable)
    const closedSignals = recentSignals.filter(s => s.status !== 'ACTIVE');
    const profitableSignals = closedSignals.filter(s => {
      // Check if signal was profitable (this would need to be calculated from actual price movements)
      // For now, we'll use a simple heuristic based on signal type and metadata
      const metadata = s.metadata as any;
      return metadata?.profitability === 'PROFIT' || metadata?.outcome === 'WIN';
    });

    const successRate = closedSignals.length > 0
      ? Math.round((profitableSignals.length / closedSignals.length) * 100)
      : 0;

    // Calculate average risk/reward ratio
    // Default to 1:2.5 if not available in metadata
    const riskRewardRatios = recentSignals
      .map(s => {
        const metadata = s.metadata as any;
        return metadata?.riskReward || metadata?.riskRewardRatio || '1:2.5';
      })
      .filter(rr => rr);

    const avgRiskReward = riskRewardRatios.length > 0
      ? riskRewardRatios[0] // For now, use first available or default
      : '1:2.5';

    // Calculate average duration (time from signal to close)
    const durations = closedSignals
      .map(s => {
        const detected = new Date(s.detectedAt).getTime();
        const closed = s.closedAt ? new Date(s.closedAt).getTime() : null;
        if (closed) {
          return Math.round((closed - detected) / (60 * 1000)); // Duration in minutes
        }
        return null;
      })
      .filter((d): d is number => d !== null);

    const avgDuration = durations.length > 0
      ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
      : 45; // Default 45 minutes

    // Calculate previous success rate for comparison
    const previousPeriod = now - 48 * 60 * 60 * 1000;
    const previousSignals = signals.filter(s => {
      const signalTime = new Date(s.detectedAt).getTime();
      return signalTime >= previousPeriod && signalTime < twentyFourHoursAgo;
    });
    const previousClosed = previousSignals.filter(s => s.status !== 'ACTIVE');
    const previousProfitable = previousClosed.filter(s => {
      const metadata = s.metadata as any;
      return metadata?.profitability === 'PROFIT' || metadata?.outcome === 'WIN';
    });
    const previousSuccessRate = previousClosed.length > 0
      ? Math.round((previousProfitable.length / previousClosed.length) * 100)
      : 0;

    const successRateChange = successRate - previousSuccessRate;

    return {
      successRate,
      successRateChange,
      avgRiskReward,
      avgDuration,
    };
  }, [signals]);

  const handleTimeframeChange = useCallback((tf: string) => {
    setSelectedTimeframe(tf);
    setSearchParams({ timeframe: tf });
  }, [setSearchParams]);

  const handleResetFilters = useCallback(() => {
    setSortBy('confidence');
    setMarketCapSort(null);
    setVolumeSort(null);
    setRankingFilter(null);
    setStatusFilter('all');
    setBullFilter('All');
    setBearFilter('All');
    setSearchQuery('');
    setSelectedTimeframe(null); // Reset timeframe filter to show all
    setSearchParams({}); // Clear URL params
  }, [setSearchParams]);

  const handleScanSuperEngulfing = useCallback(async () => {
    setIsScanning(true);
    setScanResult(null);
    try {
      const result = await signalsApi.scanSuperEngulfing(selectedTimeframe || undefined);
      setScanResult(
        `Scan completed! Generated ${result.totalSignals || 0} signals from ${result.symbolsScanned || 0} symbols across ${result.timeframesScanned || 0} timeframes.`
      );
      // Invalidate and refetch signals after scan
      await queryClient.invalidateQueries({ queryKey: ['signals', 'SUPER_ENGULFING'] });
      await queryClient.invalidateQueries({ queryKey: ['marketData'] });
    } catch (error: any) {
      setScanResult(`Error: ${error.message || 'Failed to start scan'}`);
    } finally {
      setIsScanning(false);
    }
  }, [selectedTimeframe]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="dark:text-white light:text-text-dark text-lg"
        >
          Loading signals...
        </motion.div>
      </div>
    );
  }

  return (
    <>
      {/* Header */}
      <PageHeader
        breadcrumbs={[
          { label: 'Monitor', path: '/monitor/superengulfing' },
          { label: 'SuperEngulfing' },
        ]}
        lastUpdated="Just now"
      />

      {/* Timeframe Cards - Only show in list view */}
      {viewMode === 'list' && (
        <motion.div
          initial="initial"
          animate="animate"
          variants={scaleInVariants}
          className="flex flex-col gap-6 px-8 pt-8 pb-4 shrink-0"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* 4H */}
            <AnimatedCard
              className={`group relative flex flex-col justify-between p-5 rounded-xl dark:backdrop-blur-md border transition-all cursor-pointer h-36 ${timeframeStats['4h'] > 0
                ? selectedTimeframe === '4h'
                  ? 'dark:bg-[rgba(19,236,55,0.15)] light:bg-green-100 dark:border-primary light:border-green-400 dark:shadow-[0_0_20px_rgba(19,236,55,0.3)] light:shadow-[0_0_15px_rgba(19,236,55,0.2)] ring-2 ring-primary/50 scale-[1.02]'
                  : 'dark:bg-[rgba(20,30,22,0.4)] light:bg-green-50 dark:border-[rgba(19,236,55,0.3)] light:border-green-400 hover:shadow-[0_0_20px_rgba(19,236,55,0.2)] hover:scale-[1.01]'
                : 'dark:bg-[rgba(20,30,22,0.2)] light:bg-green-50 dark:border-[#234829] light:border-green-300 opacity-50 cursor-not-allowed hover:opacity-60'
                }`}
              onClick={() => {
                if (timeframeStats['4h'] > 0) {
                  if (selectedTimeframe === '4h') {
                    // If already selected, deselect to show all
                    setSearchParams({});
                    setSelectedTimeframe(null);
                  } else {
                    setSearchParams({ timeframe: '4h' });
                    setSelectedTimeframe('4h');
                  }
                }
              }}
            >
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-bold ${timeframeStats['4h'] > 0 ? 'dark:text-white light:text-text-dark' : 'dark:text-gray-500 light:text-text-light-secondary'}`}>
                    4H Timeframe
                  </span>
                  {selectedTimeframe === '4h' && (
                    <span className="material-symbols-outlined text-primary text-base animate-pulse" title="Click again to show all">
                      check_circle
                    </span>
                  )}
                </div>
                {timeframeStats['4h'] > 0 ? (
                  <span className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border shadow-[0_0_10px_rgba(19,236,55,0.2)] ${selectedTimeframe === '4h'
                    ? 'text-primary bg-primary/20 border-primary/40'
                    : 'text-primary bg-primary/10 border-primary/20'
                    }`}>
                    <motion.span
                      className="w-1.5 h-1.5 rounded-full bg-primary"
                      animate={{ opacity: [1, 0.5, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    />
                    {selectedTimeframe === '4h' ? 'Selected' : 'Active'}
                  </span>
                ) : (
                  <span className="text-[10px] font-bold dark:text-gray-500 light:text-text-light-secondary uppercase tracking-wider dark:bg-white/5 light:bg-green-100 px-2 py-0.5 rounded-full dark:border-white/5 light:border-green-300">
                    No Signals
                  </span>
                )}
              </div>
              <div className="mt-auto">
                <span
                  className={`text-5xl font-black tracking-tight ${timeframeStats['4h'] > 0
                    ? 'text-primary drop-shadow-[0_0_12px_rgba(19,236,55,0.6)]'
                    : 'dark:text-gray-700 light:text-text-light-secondary'
                    }`}
                >
                  {timeframeStats['4h']}
                </span>
                <span className={`text-xs ml-1 font-medium uppercase tracking-wide ${timeframeStats['4h'] > 0 ? 'dark:text-gray-400 light:text-text-light-secondary' : 'dark:text-gray-600 light:text-text-light-secondary'}`}>
                  Signals Detected
                </span>
              </div>
            </AnimatedCard>

            {/* 1D */}
            <AnimatedCard
              className={`group relative flex flex-col justify-between p-5 rounded-xl dark:backdrop-blur-md border transition-all h-36 ${timeframeStats['1d'] > 0
                ? selectedTimeframe === '1d'
                  ? 'dark:bg-[rgba(19,236,55,0.15)] light:bg-green-100 dark:border-primary light:border-green-400 dark:shadow-[0_0_20px_rgba(19,236,55,0.3)] light:shadow-[0_0_15px_rgba(19,236,55,0.2)] ring-2 ring-primary/50 scale-[1.02] cursor-pointer'
                  : 'dark:bg-[rgba(20,30,22,0.4)] light:bg-green-50 dark:border-[rgba(19,236,55,0.3)] light:border-green-400 hover:shadow-[0_0_20px_rgba(19,236,55,0.2)] hover:scale-[1.01] cursor-pointer'
                : 'dark:bg-[rgba(20,30,22,0.2)] light:bg-green-50 dark:border-[#234829] light:border-green-300 opacity-50 cursor-not-allowed hover:opacity-60'
                }`}
              onClick={() => {
                if (timeframeStats['1d'] > 0) {
                  if (selectedTimeframe === '1d') {
                    // If already selected, deselect to show all
                    setSearchParams({});
                    setSelectedTimeframe(null);
                  } else {
                    setSearchParams({ timeframe: '1d' });
                    setSelectedTimeframe('1d');
                  }
                }
              }}
            >
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-bold ${timeframeStats['1d'] > 0 ? 'dark:text-white light:text-text-dark' : 'dark:text-gray-500 light:text-text-light-secondary'}`}>
                    1D Timeframe
                  </span>
                  {selectedTimeframe === '1d' && (
                    <span className="material-symbols-outlined text-primary text-base animate-pulse" title="Click again to show all">
                      check_circle
                    </span>
                  )}
                </div>
                {timeframeStats['1d'] > 0 ? (
                  <span className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border shadow-[0_0_10px_rgba(19,236,55,0.2)] ${selectedTimeframe === '1d'
                    ? 'text-primary bg-primary/20 border-primary/40'
                    : 'text-primary bg-primary/10 border-primary/20'
                    }`}>
                    <motion.span
                      className="w-1.5 h-1.5 rounded-full bg-primary"
                      animate={{ opacity: [1, 0.5, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    />
                    {selectedTimeframe === '1d' ? 'Selected' : 'Active'}
                  </span>
                ) : (
                  <span className="text-[10px] font-bold dark:text-gray-500 light:text-text-light-secondary uppercase tracking-wider dark:bg-white/5 light:bg-green-100 px-2 py-0.5 rounded-full dark:border-white/5 light:border-green-300">
                    No Signals
                  </span>
                )}
              </div>
              <div className="mt-auto">
                <span
                  className={`text-5xl font-black tracking-tight ${timeframeStats['1d'] > 0
                    ? 'text-primary drop-shadow-[0_0_12px_rgba(19,236,55,0.6)]'
                    : 'dark:text-gray-700 light:text-text-light-secondary'
                    }`}
                >
                  {timeframeStats['1d']}
                </span>
                <span className={`text-xs ml-1 font-medium uppercase tracking-wide ${timeframeStats['1d'] > 0 ? 'dark:text-gray-400 light:text-text-light-secondary' : 'dark:text-gray-600 light:text-text-light-secondary'}`}>
                  Signals Detected
                </span>
              </div>
            </AnimatedCard>

            {/* 1W - hidden for Free Forever (4H and Daily only) */}
            {!isFreeForever && (
            <AnimatedCard
              className={`group relative flex flex-col justify-between p-5 rounded-xl dark:backdrop-blur-md border transition-all h-36 ${timeframeStats['1w'] > 0
                ? selectedTimeframe === '1w'
                  ? 'dark:bg-[rgba(19,236,55,0.15)] light:bg-green-100 dark:border-primary light:border-green-400 dark:shadow-[0_0_20px_rgba(19,236,55,0.3)] light:shadow-[0_0_15px_rgba(19,236,55,0.2)] ring-2 ring-primary/50 scale-[1.02] cursor-pointer'
                  : 'dark:bg-[rgba(20,30,22,0.4)] light:bg-green-50 dark:border-[rgba(19,236,55,0.3)] light:border-green-400 hover:shadow-[0_0_20px_rgba(19,236,55,0.2)] hover:scale-[1.01] cursor-pointer'
                : 'dark:bg-[rgba(20,30,22,0.2)] light:bg-green-50 dark:border-[#234829] light:border-green-300 opacity-50 cursor-not-allowed hover:opacity-60'
                }`}
              onClick={() => {
                if (timeframeStats['1w'] > 0) {
                  if (selectedTimeframe === '1w') {
                    setSearchParams({});
                    setSelectedTimeframe(null);
                  } else {
                    setSearchParams({ timeframe: '1w' });
                    setSelectedTimeframe('1w');
                  }
                }
              }}
            >
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-bold ${timeframeStats['1w'] > 0 ? 'dark:text-white light:text-text-dark' : 'dark:text-gray-500 light:text-text-light-secondary'}`}>
                    1W Timeframe
                  </span>
                  {selectedTimeframe === '1w' && (
                    <span className="material-symbols-outlined text-primary text-base animate-pulse" title="Click again to show all">
                      check_circle
                    </span>
                  )}
                </div>
                {timeframeStats['1w'] > 0 ? (
                  <span className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border shadow-[0_0_10px_rgba(19,236,55,0.2)] ${selectedTimeframe === '1w'
                    ? 'text-primary bg-primary/20 border-primary/40'
                    : 'text-primary bg-primary/10 border-primary/20'
                    }`}>
                    <motion.span
                      className="w-1.5 h-1.5 rounded-full bg-primary"
                      animate={{ opacity: [1, 0.5, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    />
                    {selectedTimeframe === '1w' ? 'Selected' : 'Active'}
                  </span>
                ) : (
                  <span className="text-[10px] font-bold dark:text-gray-500 light:text-text-light-secondary uppercase tracking-wider dark:bg-white/5 light:bg-green-100 px-2 py-0.5 rounded-full dark:border-white/5 light:border-green-300">
                    No Signals
                  </span>
                )}
              </div>
              <div className="mt-auto">
                <span
                  className={`text-5xl font-black tracking-tight ${timeframeStats['1w'] > 0
                    ? 'text-primary drop-shadow-[0_0_12px_rgba(19,236,55,0.6)]'
                    : 'dark:text-gray-700 light:text-text-light-secondary'
                    }`}
                >
                  {timeframeStats['1w']}
                </span>
                <span className={`text-xs ml-1 font-medium uppercase tracking-wide ${timeframeStats['1w'] > 0 ? 'dark:text-gray-400 light:text-text-light-secondary' : 'dark:text-gray-600 light:text-text-light-secondary'}`}>
                  Signals Detected
                </span>
              </div>
            </AnimatedCard>
            )}
          </div>
        </motion.div>
      )}

      {/* Main Content */}
      <div className="flex-1 min-h-0 px-8 pb-8 flex flex-col">
        <div className="mx-auto w-full max-w-[1600px] flex flex-col gap-4 min-h-full">
          {/* Manual Scan Button */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between p-4 rounded-xl dark:bg-[rgba(19,236,55,0.05)] light:bg-green-50 dark:border border-primary/20 light:border-green-300"
          >
            <div className="flex flex-col">
              <span className="text-sm font-bold dark:text-white light:text-text-dark">Manual Scan</span>
              <span className="text-xs dark:text-gray-400 light:text-text-light-secondary">
                Run SuperEngulfing scan manually to test the logic
              </span>
              {scanResult && (
                <span className={`text-xs mt-1 ${scanResult.includes('Error') ? 'text-red-400' : 'text-primary'}`}>
                  {scanResult}
                </span>
              )}
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleScanSuperEngulfing}
              disabled={isScanning}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-all ${isScanning
                ? 'dark:bg-gray-700 light:bg-gray-300 dark:text-gray-400 light:text-text-light-secondary cursor-not-allowed'
                : 'bg-primary text-black hover:bg-primary/90 shadow-[0_0_15px_rgba(19,236,55,0.3)]'
                }`}
            >
              {isScanning ? (
                <>
                  <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                  <span>Scanning...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-lg">radar</span>
                  <span>Start Scan</span>
                </>
              )}
            </motion.button>
          </motion.div>

          {/* Filters Bar */}
          <div className="flex items-center gap-2.5 py-2 dark:bg-background-dark/50 dark:backdrop-blur-sm light:bg-green-50 sticky top-0 z-20 overflow-visible flex-nowrap shrink-0">
            {/* Search */}
            <motion.div
              whileFocus={{ scale: 1.02 }}
              className="relative w-32 shrink-0 transition-all duration-300 focus-within:w-48 group/search"
            >
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 dark:text-gray-500 light:text-text-light-secondary text-lg dark:group-focus-within/search:text-white light:group-focus-within/search:text-text-dark transition-colors">
                search
              </span>
              <input
                className="w-full pl-9 pr-3 py-1.5 rounded-full dark:bg-white/5 light:bg-white dark:border-white/10 light:border-green-300 dark:text-white light:text-text-dark text-xs dark:placeholder:text-gray-600 light:placeholder:text-text-light-secondary focus:border-primary focus:ring-primary focus:ring-1 transition-all outline-none"
                placeholder="Search..."
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </motion.div>
            <div className="w-px h-5 dark:bg-white/10 light:bg-green-300 mx-1 shrink-0"></div>

            {/* Bull Filter */}
            <PatternFilter
              type="bull"
              value={bullFilter}
              onChange={setBullFilter}
              standardOnly={isFreeForever}
            />
            <div className="w-px h-5 dark:bg-white/10 light:bg-green-300 mx-1 shrink-0"></div>

            {/* Bear Filter */}
            <PatternFilter
              type="bear"
              value={bearFilter}
              onChange={setBearFilter}
              standardOnly={isFreeForever}
            />
            <div className="w-px h-5 dark:bg-white/10 light:bg-green-300 mx-1 shrink-0"></div>

            {/* Filter Menu */}
            <div className="relative group/more">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setFilterMenuOpen(!filterMenuOpen)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold transition-colors group whitespace-nowrap ${filterMenuOpen
                  ? 'dark:bg-white/10 light:bg-green-100 border-primary/30 dark:text-white light:text-text-dark active:bg-primary/10 active:border-primary/30'
                  : 'dark:bg-white/5 light:bg-green-50 dark:border-white/10 light:border-green-300 dark:text-gray-300 light:text-text-light-secondary dark:hover:bg-white/10 light:hover:bg-green-100 dark:hover:text-white light:hover:text-text-dark'
                  }`}
              >
                <span className={`material-symbols-outlined text-sm ${filterMenuOpen ? 'text-primary' : 'group-hover:text-primary transition-colors'}`}>
                  filter_list
                </span>
                Filter
              </motion.button>
              <FilterMenu
                isOpen={filterMenuOpen}
                sortBy={sortBy}
                onSortChange={setSortBy}
                marketCapSort={marketCapSort}
                onMarketCapSortChange={setMarketCapSort}
                volumeSort={volumeSort}
                onVolumeSortChange={setVolumeSort}
                rankingFilter={rankingFilter}
                onRankingFilterChange={setRankingFilter}
                statusFilter={statusFilter}
                onStatusFilterChange={setStatusFilter}
                onReset={handleResetFilters}
              />
            </div>
            <div className="w-px h-5 dark:bg-white/10 light:bg-green-300 mx-1 shrink-0"></div>

            {/* View Toggle */}
            <div className="flex p-1 gap-1 rounded-lg dark:bg-white/5 light:bg-green-50 dark:border-white/10 light:border-green-300 shrink-0">
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded transition-all ${viewMode === 'list' ? 'bg-primary text-black' : 'dark:text-gray-400 light:text-text-light-secondary dark:hover:text-white light:hover:text-text-dark'
                  }`}
                title="List View"
              >
                <span className="material-symbols-outlined text-base">view_list</span>
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded transition-all ${viewMode === 'grid' ? 'bg-primary text-black' : 'dark:text-gray-400 light:text-text-light-secondary dark:hover:text-white light:hover:text-text-dark'
                  }`}
                title="Grid View"
              >
                <span className="material-symbols-outlined text-base">grid_view</span>
              </motion.button>
            </div>
            <div className="w-px h-5 dark:bg-white/10 light:bg-green-300 mx-1 shrink-0"></div>

            {/* Download */}
            <motion.button
              whileHover={{ scale: 1.1, rotate: 5 }}
              whileTap={{ scale: 0.9 }}
              className="p-1.5 rounded-lg dark:bg-white/5 light:bg-green-50 dark:border-white/10 light:border-green-300 dark:text-gray-400 light:text-text-light-secondary hover:text-primary transition-colors shrink-0"
            >
              <span className="material-symbols-outlined text-base">download</span>
            </motion.button>
          </div>

          {/* Content Container */}
          <div className="flex-1 min-h-0 relative flex gap-4">
            {viewMode === 'list' ? (
              /* List View - Table */
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex-1 flex flex-col min-w-0 rounded-xl glass-panel overflow-hidden"
              >
                <div className="flex-1 overflow-y-auto custom-scrollbar min-h-0">
                  <table className="w-full text-sm text-left dark:text-gray-400 light:text-text-light-secondary">
                    <thead className="text-[11px] uppercase dark:text-gray-500 light:text-text-light-secondary font-bold sticky top-0 dark:bg-[#0a140d] light:bg-green-50 dark:border-b-white/10 light:border-b-green-300 z-10 tracking-wider">
                      <tr>
                        <th className="px-6 py-3" scope="col">Symbol</th>
                        <th className="px-6 py-3" scope="col">Exchange</th>
                        <th className="px-6 py-3" scope="col">Pattern</th>
                        <th className="px-6 py-3 text-center" scope="col">Setup Quality</th>
                        <th className="px-6 py-3 text-right" scope="col">Detected</th>
                        <th className="px-6 py-3 text-right" scope="col">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="dark:divide-y-white/5 light:divide-y-green-200/30 text-xs font-medium">
                      {paginatedSignals.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-6 py-12 text-center dark:text-gray-500 light:text-text-light-secondary">
                            No signals found
                          </td>
                        </tr>
                      ) : (
                        paginatedSignals.map((signal, index) => (
                          <motion.tr
                            key={signal.id}
                            initial={{ opacity: 0, y: 20, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            transition={{ delay: index * 0.03, duration: 0.3 }}
                            className="dark:hover:bg-white/[0.03] light:hover:bg-green-50 transition-all cursor-pointer group hover:shadow-[0_0_20px_rgba(0,0,0,0.2)] border-b border-transparent hover:border-primary/10 relative"
                            onClick={() => navigate(`/signals/${signal.id}`)}
                          >
                            <td className="px-6 py-2.5 font-bold dark:text-white light:text-text-dark whitespace-nowrap">
                              <div className="flex items-center gap-3">
                                <SymbolAvatar symbol={signal.symbol} />
                                <span className="text-sm">{signal.symbol}</span>
                              </div>
                            </td>
                            <td className="px-6 py-2.5 whitespace-nowrap dark:text-gray-400 light:text-text-light-secondary dark:group-hover:text-gray-300 light:group-hover:text-text-dark">
                              Binance Perp
                            </td>
                            <td className="px-6 py-2.5 whitespace-nowrap dark:text-white light:text-text-dark">
                              {(() => {
                                const pattern = signal.metadata?.type || signal.metadata?.pattern || 'RUN';
                                const direction = signal.signalType === 'BUY' ? 'Bullish' : 'Bearish';

                                if (pattern === 'RUN_PLUS') {
                                  return `${direction} Run+`;
                                }
                                if (pattern === 'REV_PLUS') {
                                  return `${direction} Rev+`;
                                }
                                if (pattern === 'REV') {
                                  return `${direction} Rev`;
                                }
                                return `${direction} Run`;
                              })()}
                            </td>
                            <td className="px-6 py-2.5 text-center">
                              <SignalBadge signal={signal} />
                            </td>
                            <td className="px-6 py-2.5 text-right font-mono dark:text-gray-400 light:text-text-light-secondary">{formatTime(signal.detectedAt)}</td>
                            <td className="px-6 py-2.5 text-right">
                              <Link
                                to={`/signals/${signal.id}`}
                                className="text-primary opacity-0 group-hover:opacity-100 transition-opacity dark:hover:text-white light:hover:text-text-dark"
                              >
                                Analyze
                              </Link>
                            </td>
                          </motion.tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                {/* Pagination */}
                {filteredSignals.length > 0 && (
                  <div className="flex items-center justify-between px-6 py-4 border-t dark:border-white/5 light:border-green-300 shrink-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs dark:text-gray-400 light:text-text-light-secondary">Show:</span>
                      <select
                        value={pageSize}
                        onChange={(e) => {
                          setPageSize(Number(e.target.value));
                          setCurrentPage(1);
                        }}
                        className="px-2 py-1 rounded dark:bg-white/5 light:bg-white dark:border-white/10 light:border-green-300 dark:text-white light:text-text-dark text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                      >
                        <option value={10}>10</option>
                        <option value={20}>20</option>
                        <option value={30}>30</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                      </select>
                      <span className="text-xs dark:text-gray-400 light:text-text-light-secondary">
                        of {subscriptionFilteredSignals.length} signals
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                        className="px-3 py-1 rounded dark:bg-white/5 light:bg-green-50 dark:border-white/10 light:border-green-300 dark:text-white light:text-text-dark text-xs disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/10 transition-colors"
                      >
                        Previous
                      </button>
                      <span className="text-xs dark:text-gray-400 light:text-text-light-secondary">
                        Page {currentPage} of {totalPages}
                      </span>
                      <button
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                        className="px-3 py-1 rounded dark:bg-white/5 light:bg-green-50 dark:border-white/10 light:border-green-300 dark:text-white light:text-text-dark text-xs disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/10 transition-colors"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            ) : (
              /* Grid View - Cards */
              <div className="flex-1 overflow-y-auto custom-scrollbar p-6 min-h-0">
                <AnimatedList className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-[1600px] mx-auto">
                  {paginatedSignals.length === 0 ? (
                    <div className="col-span-full text-center py-12 dark:text-gray-500 light:text-text-light-secondary">No signals found</div>
                  ) : (
                    paginatedSignals.map((signal) => {
                      const timeAgo = Math.floor((Date.now() - new Date(signal.detectedAt).getTime()) / 60000);
                      const isLong = signal.signalType === 'BUY';
                      const entryPrice = Number(signal.price);
                      const stopLoss = isLong ? entryPrice * 0.99 : entryPrice * 1.01;
                      const confidence = signal.metadata?.confidence || 'MED';

                      return (
                        <AnimatedCard
                          key={signal.id}
                          onClick={() => navigate(`/signals/${signal.id}`)}
                          className={`glass-panel rounded-2xl overflow-hidden relative group cursor-pointer flex flex-col ${isLong ? 'long-glow' : 'short-glow'
                            }`}
                        >
                          <div className="p-5 flex justify-between items-start z-10 relative">
                            <div className="flex flex-col">
                              <h3 className="text-xl font-bold dark:text-white light:text-text-dark tracking-tight">{signal.symbol}</h3>
                              <span className="text-xs dark:text-gray-400 light:text-text-light-secondary font-mono mt-1">Binance Perp</span>
                            </div>
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-bold tracking-wider shadow-[0_0_10px_rgba(19,236,55,0.2)] ${isLong
                                ? 'bg-primary/10 border border-primary/20 text-primary'
                                : 'bg-danger/10 border border-danger/20 text-danger'
                                }`}
                            >
                              {isLong ? 'LONG' : 'SHORT'}
                            </span>
                          </div>
                          <SignalCardWithChart signal={signal} isLong={isLong} />
                          <div className="p-4 dark:bg-surface-dark/50 light:bg-green-50 flex justify-between items-center text-sm mt-auto">
                            <div className="flex flex-col">
                              <span className="text-[10px] uppercase dark:text-gray-500 light:text-text-light-secondary font-bold tracking-wider mb-0.5">Entry</span>
                              <span className="font-mono dark:text-white light:text-text-dark font-medium">${entryPrice.toFixed(2)}</span>
                            </div>
                            <div className="flex flex-col items-end">
                              <span className="text-[10px] uppercase dark:text-gray-500 light:text-text-light-secondary font-bold tracking-wider mb-0.5">Stop Loss</span>
                              <span className="font-mono dark:text-gray-400 light:text-text-light-secondary">${stopLoss.toFixed(2)}</span>
                            </div>
                          </div>
                          <div className="px-4 py-2 dark:bg-black/20 light:bg-green-50 dark:border-t-white/5 light:border-t-green-300 flex justify-between items-center">
                            <div className="flex items-center gap-1.5">
                              {confidence === 'HIGH' ? (
                                <>
                                  <motion.div
                                    className="w-1.5 h-1.5 rounded-full bg-primary"
                                    animate={{ opacity: [1, 0.5, 1] }}
                                    transition={{ duration: 2, repeat: Infinity }}
                                  />
                                  <span className="text-[10px] text-primary font-bold uppercase">Active Signal</span>
                                </>
                              ) : (
                                <>
                                  <div className={`w-1.5 h-1.5 rounded-full ${isLong ? 'bg-primary' : 'bg-danger'}`}></div>
                                  <span className="text-[10px] dark:text-gray-400 light:text-text-light-secondary font-bold uppercase">Breakout</span>
                                </>
                              )}
                            </div>
                            <span className="text-[10px] dark:text-gray-500 light:text-text-light-secondary font-medium">
                              {timeAgo < 60 ? `${timeAgo}m ago` : `${Math.floor(timeAgo / 60)}h ${timeAgo % 60}m ago`}
                            </span>
                          </div>
                        </AnimatedCard>
                      );
                    })
                  )}
                </AnimatedList>
                {/* Pagination */}
                {filteredSignals.length > 0 && (
                  <div className="flex items-center justify-between px-6 py-4 border-t dark:border-white/5 light:border-green-300 shrink-0 mt-6">
                    <div className="flex items-center gap-2">
                      <span className="text-xs dark:text-gray-400 light:text-text-light-secondary">Show:</span>
                      <select
                        value={pageSize}
                        onChange={(e) => {
                          setPageSize(Number(e.target.value));
                          setCurrentPage(1);
                        }}
                        className="px-2 py-1 rounded dark:bg-white/5 light:bg-white dark:border-white/10 light:border-green-300 dark:text-white light:text-text-dark text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                      >
                        <option value={10}>10</option>
                        <option value={20}>20</option>
                        <option value={30}>30</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                      </select>
                      <span className="text-xs dark:text-gray-400 light:text-text-light-secondary">
                        of {subscriptionFilteredSignals.length} signals
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                        className="px-3 py-1 rounded dark:bg-white/5 light:bg-green-50 dark:border-white/10 light:border-green-300 dark:text-white light:text-text-dark text-xs disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/10 transition-colors"
                      >
                        Previous
                      </button>
                      <span className="text-xs dark:text-gray-400 light:text-text-light-secondary">
                        Page {currentPage} of {totalPages}
                      </span>
                      <button
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                        className="px-3 py-1 rounded dark:bg-white/5 light:bg-green-50 dark:border-white/10 light:border-green-300 dark:text-white light:text-text-dark text-xs disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/10 transition-colors"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Stats Sidebar - Only show in list view */}
            {viewMode === 'list' && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="w-72 dark:bg-[#112214] dark:backdrop-blur-md light:bg-white dark:border-[#234829] light:border-green-300 border rounded-xl hidden lg:flex flex-col shadow-xl overflow-hidden"
              >
                <div className="p-4 dark:border-b-white/5 light:border-b-green-300 border-b flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider dark:text-gray-400 light:text-text-light-secondary">Pattern Stats</span>
                  <span className="material-symbols-outlined dark:text-gray-500 light:text-text-light-secondary text-sm">analytics</span>
                </div>
                <div className="p-4 flex flex-col gap-4">
                  <div className="flex flex-col gap-1">
                    <span className="text-xs dark:text-gray-500 light:text-text-light-secondary">Success Rate (24h)</span>
                    <div className="flex items-end gap-2">
                      <span className="text-2xl font-bold dark:text-white light:text-text-dark">{patternStats.successRate}%</span>
                      {patternStats.successRateChange !== 0 && (
                        <span className={`text-xs mb-1 ${patternStats.successRateChange > 0 ? 'text-primary' : 'text-red-500'}`}>
                          {patternStats.successRateChange > 0 ? '+' : ''}{patternStats.successRateChange}%
                        </span>
                      )}
                    </div>
                    <div className="w-full h-1 dark:bg-white/10 light:bg-green-200/50 rounded-full mt-1 overflow-hidden">
                      <motion.div
                        className="h-full bg-primary"
                        initial={{ width: 0 }}
                        animate={{ width: `${patternStats.successRate}%` }}
                        transition={{ duration: 1, ease: 'easeOut' }}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      className="p-3 rounded-lg dark:bg-white/5 light:bg-green-50 dark:border-white/5 light:border-green-300 border"
                    >
                      <span className="block text-[10px] dark:text-gray-500 light:text-text-light-secondary uppercase">Avg Risk</span>
                      <span className="block text-lg font-bold dark:text-white light:text-text-dark mt-1">{patternStats.avgRiskReward}</span>
                    </motion.div>
                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      className="p-3 rounded-lg dark:bg-white/5 light:bg-green-50 dark:border-white/5 light:border-green-300 border"
                    >
                      <span className="block text-[10px] dark:text-gray-500 light:text-text-light-secondary uppercase">Avg Dur.</span>
                      <span className="block text-lg font-bold dark:text-white light:text-text-dark mt-1">{patternStats.avgDuration}m</span>
                    </motion.div>
                  </div>
                  <div className="mt-4 pt-4 dark:border-t-white/5 light:border-t-green-200/30">
                    <span className="text-xs font-bold uppercase tracking-wider dark:text-gray-400 light:text-text-light-secondary mb-3 block">Quick Risk</span>
                    <div className="flex flex-col gap-2">
                      <div className="flex justify-between items-center text-xs dark:text-gray-400 light:text-text-light-secondary">
                        <span>Account</span>
                        <span className="font-mono dark:text-white light:text-text-dark">$10,000</span>
                      </div>
                      <div className="flex justify-between items-center text-xs dark:text-gray-400 light:text-text-light-secondary">
                        <span>Risk %</span>
                        <span className="font-mono dark:text-white light:text-text-dark">1.0%</span>
                      </div>
                      <div className="p-2 rounded bg-primary/10 border border-primary/20 flex justify-between items-center mt-1">
                        <span className="text-xs font-bold text-primary">Position Size</span>
                        <span className="text-sm font-bold dark:text-white light:text-text-dark font-mono">$1,250</span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
