import { useState, useMemo, useCallback, useEffect } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { StatusTabs } from '../components/shared/StatusTabs';
import { WinRatePanel } from '../components/shared/WinRatePanel';
import { SignalStatusBadge } from '../components/shared/SignalStatusBadge';
import { Signal, Timeframe } from '../types';
import { scanAll, fetchLiveBias } from '../services/signalsApi';
import { StaticMiniChart } from '../components/StaticMiniChart';
import { FilterMenu } from '../components/shared/FilterMenu';
import { PatternFilter } from '../components/shared/PatternFilter';
import { SignalBadge } from '../components/shared/SignalBadge';
import { TrendIndicator } from '../components/shared/TrendIndicator';
import { PageHeader } from '../components/layout/PageHeader';
import { AnimatedCard } from '../components/animations/AnimatedCard';
import { useMarketData } from '../hooks/useMarketData';
import { fetchCandles } from '../services/candles';
import { useSignalFilter } from '../hooks/useSignalFilter';
import { useLifecycleFilter } from '../hooks/useLifecycleFilter';
import { scaleInVariants } from '../utils/animations';

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
    <div className="h-32 w-full dark:bg-black/40 light:bg-gray-100 relative dark:border-y-white/5 light:border-y-green-200/30 border-y overflow-hidden">
      <div
        className={`absolute inset-0 ${isLong
          ? 'bg-[radial-gradient(circle_at_50%_100%,rgba(19,236,55,0.05),transparent_70%)]'
          : 'bg-[radial-gradient(circle_at_50%_100%,rgba(239,68,68,0.05),transparent_70%)]'
          } opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none z-10`}
      ></div>
      <StaticMiniChart candles={candles} isLong={isLong} height={128} />
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

// Helper functions for Bias signals
function getBiasType(signal: Signal): string {
  const metadata = signal.metadata as any;
  if (metadata?.biasType) {
    return metadata.biasType;
  }
  const bias = metadata?.bias || signal.signalType;
  if (bias === 'BULLISH' || bias === 'BUY') {
    return 'Bullish Confirmation';
  } else if (bias === 'BEARISH' || bias === 'SELL') {
    return 'Bearish Reversal';
  }
  return 'Trend Continuation';
}

function getTrendStrength(signal: Signal): { label: string; color: string; icon: string } {
  const metadata = signal.metadata as any;
  const confidence = metadata?.confidence || 'MED';
  const bias = metadata?.bias || signal.signalType;
  const isBullish = bias === 'BULLISH' || bias === 'BUY';

  if (confidence === 'HIGH') {
    return {
      label: isBullish ? 'Strong' : 'High',
      color: isBullish ? 'primary' : 'red-500',
      icon: isBullish ? 'trending_up' : 'trending_down',
    };
  } else if (confidence === 'MED') {
    return {
      label: 'Med',
      color: 'yellow-500',
      icon: 'trending_flat',
    };
  } else {
    return {
      label: isBullish ? 'High' : 'Weak',
      color: isBullish ? 'primary' : 'red-500',
      icon: isBullish ? 'trending_up' : 'trending_down',
    };
  }
}

export function MonitorBias() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [activeTimeframe, setActiveTimeframe] = useState<Timeframe | 'all'>(
    (searchParams.get('timeframe') as Timeframe) || 'all',
  );
  const [bullFilter, setBullFilter] = useState('All');
  const [bearFilter, setBearFilter] = useState('All');
  const [sortBy, setSortBy] = useState<'confidence' | 'time' | 'symbol'>('confidence');
  const [marketCapSort, setMarketCapSort] = useState<'high-low' | 'low-high' | null>(null);
  const [volumeSort, setVolumeSort] = useState<'high-low' | 'low-high' | null>(null);
  const [rankingFilter, setRankingFilter] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<any>('ALL');
  const [filterMenuOpen, setFilterMenuOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [pageSize, setPageSize] = useState(50);
  const [currentPage, setCurrentPage] = useState(1);
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<string | null>(null);

  // Use the new useMarketData hook
  const { signals: rawSignals, isLoading, refetch } = useMarketData({
    strategyType: 'ICT_BIAS',
    timeframe: activeTimeframe === 'all' ? undefined : activeTimeframe,
    limit: 5000, // Increased limit to show all signals
    refetchInterval: 60000,
  });

  // Fetch live bias for the active timeframe (recalculates from latest candles)
  const { data: liveBiasMap } = useQuery({
    queryKey: ['live-bias', activeTimeframe],
    queryFn: () => fetchLiveBias(activeTimeframe === 'all' ? '4h' : activeTimeframe),
    refetchInterval: 65000, // Slightly above the 60s backend cache TTL
    staleTime: 30000,
  });

  // Override saved bias with live bias when available
  const signals = useMemo(() => {
    if (!liveBiasMap || Object.keys(liveBiasMap).length === 0) return rawSignals;
    return rawSignals.map(signal => {
      const live = liveBiasMap[signal.symbol];
      if (!live) return signal;
      // Override metadata.bias and signalType with live values
      const newSignalType = live.direction === 'NEUTRAL'
        ? signal.signalType
        : (live.direction as 'BUY' | 'SELL');
      return {
        ...signal,
        signalType: newSignalType,
        metadata: {
          ...(signal.metadata || {}),
          bias: live.bias,
          prevHigh: live.prevHigh,
          prevLow: live.prevLow,
        },
      };
    });
  }, [rawSignals, liveBiasMap]);

  // Use the new useSignalFilter hook
  const filteredSignals = useSignalFilter({
    signals,
    searchQuery,
    activeTimeframe,
    bullFilter,
    bearFilter,
    sortBy,
    marketCapSort,
    volumeSort,
    rankingFilter,
    showClosedSignals: true, // Always show all signals, filter by status separately
    strategyType: 'ICT_BIAS',
  });

  // Apply status filter
  const statusFilteredSignals = useLifecycleFilter({
    signals: filteredSignals,
    tab: statusFilter,
  });

  // Pagination
  const totalPages = Math.ceil(statusFilteredSignals.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedSignals = statusFilteredSignals.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTimeframe, searchQuery, bullFilter, bearFilter, sortBy, statusFilter]);

  // Calculate signals by timeframe - count ONLY ACTIVE signals for cards
  // ICT Bias uses only 4h, 1d, 1w timeframes
  const timeframeStats = useMemo(() => {
    // Initialize with 0 for all required timeframes to satisfy the type
    const stats: Record<Timeframe | 'all', number> = {
      all: statusFilteredSignals.length,
      '5m': 0,
      '15m': 0,
      '1h': 0,
      '4h': 0,
      '1d': 0,
      '1w': 0,
    };
    statusFilteredSignals.forEach((signal) => {
      if (signal.timeframe === '4h' || signal.timeframe === '1d' || signal.timeframe === '1w') {
        if (stats[signal.timeframe] !== undefined) {
          stats[signal.timeframe]++;
        }
      }
    });
    return stats;
  }, [statusFilteredSignals]);

  const handleTimeframeClick = useCallback((timeframe: Timeframe | 'all') => {
    setActiveTimeframe(timeframe);
    if (timeframe === 'all') {
      searchParams.delete('timeframe');
    } else {
      searchParams.set('timeframe', timeframe);
    }
    setSearchParams(searchParams);
  }, [searchParams, setSearchParams]);

  const handleResetFilters = useCallback(() => {
    setSortBy('confidence');
    setMarketCapSort(null);
    setVolumeSort(null);
    setRankingFilter(null);
    setStatusFilter('ALL');
    setBullFilter('All');
    setBearFilter('All');
    setSearchQuery('');
  }, []);

  const handleScanIctBias = useCallback(async () => {
    setIsScanning(true);
    setScanResult(null);
    try {
      const result: any = await scanAll();
      setScanResult(
        `Scan completed! Generated ${result.totalSignals || 0} signals from ${result.symbolsScanned || 0} symbols across ${result.timeframesScanned || 0} timeframes.`
      );
      // Invalidate and refetch signals after scan
      await queryClient.invalidateQueries({ queryKey: ['signals', 'ICT_BIAS'] });
      await queryClient.invalidateQueries({ queryKey: ['marketData'] });
    } catch (error: any) {
      setScanResult(`Error: ${error.message || 'Failed to start scan'}`);
    } finally {
      setIsScanning(false);
    }
  }, [activeTimeframe, queryClient]);

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
          { label: 'Monitor', path: '/monitor/bias' },
          { label: 'Bias Shifts Scans' },
        ]}
        lastUpdated="Just now"
        onRefresh={refetch}
      />

      {/* Timeframe Cards */}
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
              ? activeTimeframe === '4h'
                ? 'dark:bg-[rgba(20,30,22,0.6)] light:bg-green-50 dark:border-[rgba(19,236,55,0.5)] light:border-green-400 dark:shadow-[0_0_15px_rgba(19,236,55,0.15)] light:shadow-[0_0_10px_rgba(19,236,55,0.1)] hover:shadow-[0_0_25px_rgba(19,236,55,0.25)] ring-1 ring-primary/20'
                : 'dark:bg-[rgba(20,30,22,0.4)] light:bg-green-50 dark:border-[rgba(19,236,55,0.3)] light:border-green-400 hover:shadow-[0_0_20px_rgba(19,236,55,0.2)]'
              : 'dark:bg-[rgba(20,30,22,0.2)] light:bg-green-50 dark:border-[#234829] light:border-green-300 opacity-50 cursor-not-allowed hover:opacity-60'
              }`}
            onClick={() => {
              if (timeframeStats['4h'] > 0) {
                handleTimeframeClick('4h');
              }
            }}
          >
            <div className="flex justify-between items-start">
              <span className={`text-sm font-bold ${timeframeStats['4h'] > 0 ? 'dark:text-white light:text-text-dark' : 'dark:text-gray-500 light:text-text-light-secondary'}`}>
                4H Timeframe
              </span>
              {timeframeStats['4h'] > 0 ? (
                <span className="flex items-center gap-1.5 text-[10px] font-bold text-primary uppercase tracking-wider bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20 shadow-[0_0_10px_rgba(19,236,55,0.2)]">
                  <motion.span
                    className="w-1.5 h-1.5 rounded-full bg-primary"
                    animate={{ opacity: [1, 0.5, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                  Active
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
            className={`group relative flex flex-col justify-between p-5 rounded-xl dark:backdrop-blur-md border transition-all cursor-pointer h-36 ${timeframeStats['1d'] > 0
              ? activeTimeframe === '1d'
                ? 'dark:bg-[rgba(20,30,22,0.6)] light:bg-green-50 dark:border-[rgba(19,236,55,0.5)] light:border-green-400 dark:shadow-[0_0_15px_rgba(19,236,55,0.15)] light:shadow-[0_0_10px_rgba(19,236,55,0.1)] hover:shadow-[0_0_25px_rgba(19,236,55,0.25)] ring-1 ring-primary/20'
                : 'dark:bg-[rgba(20,30,22,0.4)] light:bg-green-50 dark:border-[rgba(19,236,55,0.3)] light:border-green-400 hover:shadow-[0_0_20px_rgba(19,236,55,0.2)]'
              : 'dark:bg-[rgba(20,30,22,0.2)] light:bg-green-50 dark:border-[#234829] light:border-green-300 opacity-50 cursor-not-allowed hover:opacity-60'
              }`}
            onClick={() => {
              if (timeframeStats['1d'] > 0) {
                handleTimeframeClick('1d');
              }
            }}
          >
            <div className="flex justify-between items-start">
              <span className={`text-sm font-bold ${timeframeStats['1d'] > 0 ? 'dark:text-white light:text-text-dark' : 'dark:text-gray-500 light:text-text-light-secondary'}`}>
                1D Timeframe
              </span>
              {timeframeStats['1d'] > 0 ? (
                <span className="flex items-center gap-1.5 text-[10px] font-bold text-primary uppercase tracking-wider bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20 shadow-[0_0_10px_rgba(19,236,55,0.2)]">
                  <motion.span
                    className="w-1.5 h-1.5 rounded-full bg-primary"
                    animate={{ opacity: [1, 0.5, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                  Active
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
                  ? 'text-primary drop-shadow-[0_0_8px_rgba(19,236,55,0.5)]'
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

          {/* 1W */}
          <AnimatedCard
            className={`group relative flex flex-col justify-between p-5 rounded-xl dark:backdrop-blur-md border transition-all cursor-pointer h-36 ${timeframeStats['1w'] > 0
              ? activeTimeframe === '1w'
                ? 'dark:bg-[rgba(20,30,22,0.6)] light:bg-green-50 dark:border-[rgba(19,236,55,0.5)] light:border-green-400 dark:shadow-[0_0_15px_rgba(19,236,55,0.15)] light:shadow-[0_0_10px_rgba(19,236,55,0.1)] hover:shadow-[0_0_25px_rgba(19,236,55,0.25)] ring-1 ring-primary/20'
                : 'dark:bg-[rgba(20,30,22,0.4)] light:bg-green-50 dark:border-[rgba(19,236,55,0.3)] light:border-green-400 hover:shadow-[0_0_20px_rgba(19,236,55,0.2)]'
              : 'dark:bg-[rgba(20,30,22,0.2)] light:bg-green-50 dark:border-[#234829] light:border-green-300 opacity-50 cursor-not-allowed hover:opacity-60'
              }`}
            onClick={() => {
              if (timeframeStats['1w'] > 0) {
                handleTimeframeClick('1w');
              }
            }}
          >
            <div className="flex justify-between items-start">
              <span className={`text-sm font-bold ${timeframeStats['1w'] > 0 ? 'dark:text-white light:text-text-dark' : 'dark:text-gray-500 light:text-text-light-secondary'}`}>
                1W Timeframe
              </span>
              {timeframeStats['1w'] > 0 ? (
                <span className="flex items-center gap-1.5 text-[10px] font-bold text-primary uppercase tracking-wider bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20 shadow-[0_0_10px_rgba(19,236,55,0.2)]">
                  <motion.span
                    className="w-1.5 h-1.5 rounded-full bg-primary"
                    animate={{ opacity: [1, 0.5, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                  Active
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
                  ? 'text-primary drop-shadow-[0_0_8px_rgba(19,236,55,0.5)]'
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
        </div>
      </motion.div>

      {/* Status Tabs */}
      <div className="px-8 pb-2">
        <StatusTabs
          strategyType="ICT_BIAS"
          activeStatus={statusFilter}
          onStatusChange={setStatusFilter}
        />
      </div>

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
              <span className="text-sm font-bold dark:text-white light:text-text-dark">Manual ICT Bias Scan</span>
              <span className="text-xs dark:text-gray-400 light:text-text-light-secondary">
                Run daily bias analysis manually for all symbols
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
              onClick={handleScanIctBias}
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
          <div className="flex items-center gap-2.5 py-2 dark:bg-background-dark/50 dark:backdrop-blur-sm light:bg-green-50 sticky top-0 z-20 overflow-visible flex-nowrap">
            {/* Search */}
            <motion.div
              whileFocus={{ scale: 1.02 }}
              className="relative w-32 shrink-0 transition-all duration-300 focus-within:w-48 group/search"
            >
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 dark:text-gray-500 light:text-text-light-secondary text-lg dark:group-focus-within/search:text-white light:group-focus-within/search:text-text-dark transition-colors">
                search
              </span>
              <input
                className="w-full pl-9 pr-3 py-1.5 rounded-full dark:bg-white/5 light:bg-white dark:border-white/10 light:border-green-300 dark:text-white light:text-text-dark text-xs dark:placeholder:dark:text-gray-600 light:text-slate-400 light:placeholder:text-text-light-secondary focus:border-primary focus:ring-primary focus:ring-1 transition-all outline-none"
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
              strategyType="ICT_BIAS"
            />
            <div className="w-px h-5 dark:bg-white/10 light:bg-green-300 mx-1 shrink-0"></div>

            {/* Bear Filter */}
            <PatternFilter
              type="bear"
              value={bearFilter}
              onChange={setBearFilter}
              strategyType="ICT_BIAS"
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
              <div className="flex-1 flex flex-col min-w-0 rounded-xl table-glass-panel dark:border-[#234829] light:border-green-300 overflow-hidden">
                <div className="flex-1 overflow-y-auto custom-scrollbar min-h-0">
                  <table className="w-full text-sm text-left dark:text-gray-400 light:text-text-light-secondary">
                    <thead className="text-[11px] uppercase dark:text-gray-500 light:text-text-light-secondary font-bold sticky top-0 dark:bg-[#0a140d] light:bg-green-50 dark:border-b-white/10 light:border-b-green-300 z-10 tracking-wider">
                      <tr>
                        <th className="px-6 py-3" scope="col">Symbol</th>
                        <th className="px-6 py-3" scope="col">Exchange</th>
                        <th className="px-6 py-3" scope="col">Bias Type</th>
                        <th className="px-6 py-3 text-center" scope="col">Status</th>
                        <th className="px-6 py-3 text-center" scope="col">Trend</th>
                        <th className="px-6 py-3 text-right" scope="col">Detected</th>
                        <th className="px-6 py-3 text-right" scope="col">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="dark:divide-y-white/5 light:divide-y-green-200/30 text-xs font-medium">
                      {filteredSignals.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-6 py-12 text-center dark:text-gray-500 light:text-text-light-secondary">
                            No signals found
                          </td>
                        </tr>
                      ) : (
                        paginatedSignals.map((signal, index) => {
                          const trend = getTrendStrength(signal);
                          const biasType = getBiasType(signal);

                          return (
                            <motion.tr
                              key={signal.id}
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: index * 0.05, duration: 0.3 }}
                              className="dark:hover:bg-white/5 light:hover:bg-green-100 transition-colors cursor-pointer group"
                              onClick={() => navigate(`/signals/${signal.id}`)}
                            >
                              <td className="px-6 py-2.5 font-bold dark:text-white light:text-text-dark whitespace-nowrap">
                                <div className="flex items-center gap-3">
                                  <SymbolAvatar symbol={signal.symbol} />
                                  <span className="text-sm">{signal.symbol}</span>
                                </div>
                              </td>
                              <td className="px-6 py-2.5 whitespace-nowrap dark:text-gray-400 light:text-text-light-secondary dark:group-hover:dark:text-gray-300 light:text-slate-600 light:group-hover:text-text-dark">
                                Binance Perp
                              </td>
                              <td className="px-6 py-2.5 whitespace-nowrap dark:text-white light:text-text-dark">{biasType}</td>
                              <td className="px-6 py-2.5 text-center">
                                <SignalStatusBadge signal={signal} />
                              </td>
                              <td className="px-6 py-2.5 text-center">
                                <TrendIndicator signal={signal} />
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
                          );
                        })
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
                        of {statusFilteredSignals.length} signals
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
            ) : (
              /* Grid View - Cards */
              <div className="flex-1 overflow-y-auto custom-scrollbar p-6 min-h-0">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-[1600px] mx-auto">
                  {filteredSignals.length === 0 ? (
                    <div className="col-span-full text-center py-12 dark:text-gray-500 light:text-text-light-secondary">No signals found</div>
                  ) : (
                    paginatedSignals.map((signal, index) => {
                      const timeAgo = Math.floor((Date.now() - new Date(signal.detectedAt).getTime()) / 60000);
                      const trend = getTrendStrength(signal);
                      const biasType = getBiasType(signal);
                      const metadata = signal.metadata as any;
                      const bias = metadata?.bias || signal.signalType;
                      const isLong = bias === 'BULLISH' || bias === 'BUY';

                      return (
                        <motion.div
                          key={signal.id}
                          initial={{ opacity: 0, y: 20, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          transition={{ delay: index * 0.05, duration: 0.3 }}
                        >
                          <AnimatedCard
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
                                  : 'bg-red-500/10 border border-red-500/20 text-red-500'
                                  }`}
                              >
                                {biasType}
                              </span>
                            </div>
                            <SignalCardWithChart signal={signal} isLong={isLong} />
                            <div className="p-4 dark:bg-surface-dark/50 light:bg-green-50 flex justify-between items-center text-sm mt-auto">
                              <div className="flex flex-col">
                                <span className="text-[10px] uppercase dark:text-gray-500 light:text-text-light-secondary font-bold tracking-wider mb-0.5">Bias</span>
                                <span className="font-mono dark:text-white light:text-text-dark font-medium">{biasType}</span>
                              </div>
                              <div className="flex flex-col items-end">
                                <span className="text-[10px] uppercase dark:text-gray-500 light:text-text-light-secondary font-bold tracking-wider mb-0.5">Trend</span>
                                <span
                                  className={`font-mono font-bold ${trend.color === 'primary'
                                    ? 'text-primary'
                                    : trend.color === 'red-500'
                                      ? 'text-red-500'
                                      : 'text-yellow-500'
                                    }`}
                                >
                                  {trend.label}
                                </span>
                              </div>
                            </div>
                            <div className="px-4 py-2 dark:bg-black/20 light:bg-green-50 dark:border-t-white/5 light:border-t-green-300 flex justify-between items-center">
                              <div className="flex items-center gap-1.5">
                                {signal.metadata?.confidence === 'HIGH' ? (
                                  <>
                                    <motion.div
                                      className={`w-1.5 h-1.5 rounded-full ${isLong ? 'bg-primary' : 'bg-red-500'}`}
                                      animate={{ opacity: [1, 0.5, 1] }}
                                      transition={{ duration: 2, repeat: Infinity }}
                                    />
                                    <span className={`text-[10px] font-bold uppercase ${isLong ? 'text-primary' : 'text-red-500'}`}>Active Signal</span>
                                  </>
                                ) : (
                                  <>
                                    <div className={`w-1.5 h-1.5 rounded-full ${isLong ? 'bg-primary' : 'bg-red-500'}`}></div>
                                    <span className="text-[10px] dark:text-gray-400 light:text-text-light-secondary font-bold uppercase">Bias Shift</span>
                                  </>
                                )}
                              </div>
                              <span className="text-[10px] dark:text-gray-500 light:text-text-light-secondary font-medium">
                                {timeAgo < 60 ? `${timeAgo}m ago` : `${Math.floor(timeAgo / 60)}h ${timeAgo % 60}m ago`}
                              </span>
                            </div>
                          </AnimatedCard>
                        </motion.div>
                      );
                    })
                  )}
                </div>
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
                        of {statusFilteredSignals.length} signals
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

            {/* Win Rate Sidebar - Only show in list view */}
            {viewMode === 'list' && (
              <div className="hidden lg:block">
                <WinRatePanel strategyType="ICT_BIAS" />
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
