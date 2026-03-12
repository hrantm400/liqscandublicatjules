import { useState, useMemo, useCallback, useEffect } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { StatusTabs } from '../components/shared/StatusTabs';
import { WinRatePanel } from '../components/shared/WinRatePanel';
import { SignalStatusBadge } from '../components/shared/SignalStatusBadge';
import { Signal, Timeframe } from '../types';
import { FilterMenu } from '../components/shared/FilterMenu';
import { PatternFilter } from '../components/shared/PatternFilter';
import { TrendIndicator } from '../components/shared/TrendIndicator';
import { PageHeader } from '../components/layout/PageHeader';
import { AnimatedCard } from '../components/animations/AnimatedCard';
import { useMarketData } from '../hooks/useMarketData';
import { useSignalFilter } from '../hooks/useSignalFilter';
import { useLifecycleFilter } from '../hooks/useLifecycleFilter';
import { scaleInVariants } from '../utils/animations';
import { userApi } from '../services/userApi';
import { useAuthStore } from '../store/authStore';
import { useVolumeData } from '../hooks/useVolumeData';
import { useMarketCapData } from '../hooks/useMarketCapData';
import { VolumeBadge } from '../components/shared/VolumeFilter';
import { useTierGating } from '../hooks/useTierGating';
import { ProOverlay } from '../components/ProOverlay';

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

export function MonitorRSI() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isSymbolAllowed, isPaid: isTierPaid } = useTierGating();
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
  const [statusFilter, setStatusFilter] = useState<any>('ACTIVE');
  const [filterMenuOpen, setFilterMenuOpen] = useState(false);
  const [pageSize, setPageSize] = useState(50);
  const [currentPage, setCurrentPage] = useState(1);


  const { volumeMap, getVolume, isLowVolume, formatVolume, isLoading: isVolumeLoading } = useVolumeData();
  const { marketCapMap, getRank } = useMarketCapData();

  const { isAuthenticated } = useAuthStore();
  const { data: mySubscription } = useQuery({
    queryKey: ['mySubscription'],
    queryFn: () => userApi.getMySubscription(),
    enabled: isAuthenticated,
  });
  const isFreeForever = mySubscription?.subscription?.tier === 'SCOUT';
  const allowedPairs: string[] | undefined = mySubscription?.subscription?.limits?.pairs;

  // Use the new useMarketData hook
  const { signals, isLoading: isSignalsLoading, refetch } = useMarketData({
    strategyType: 'RSI_DIVERGENCE',
    timeframe: activeTimeframe === 'all' ? undefined : activeTimeframe,
    limit: 5000, // Increased limit to show all signals
    refetchInterval: 60000,
  });

  const isLoading = isSignalsLoading || isVolumeLoading;

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
    showClosedSignals: true,
    strategyType: 'RSI_DIVERGENCE',

    volumeMap,
    marketCapMap,
  });

  // Apply status filter
  const statusFilteredSignals = useLifecycleFilter({
    signals: filteredSignals,
    tab: statusFilter,
  });

  // Free Forever (SCOUT): RSI Divergence is a context filter — restrict to allowed pairs and 4H/Daily only
  const subscriptionFilteredSignals = useMemo(() => {
    if (!isFreeForever) return statusFilteredSignals;
    return statusFilteredSignals.filter((s) => {
      const tf = s.timeframe?.toLowerCase();
      const allowedTf = tf === '4h' || tf === '1d' || tf === 'daily';
      if (!allowedTf) return false;
      if (!allowedPairs?.length) return true;
      return allowedPairs.some(
        (p) =>
          s.symbol === p ||
          s.symbol.toUpperCase().startsWith(p.toUpperCase()) ||
          s.symbol.toUpperCase().includes(p.toUpperCase())
      );
    });
  }, [statusFilteredSignals, isFreeForever, allowedPairs]);

  // Pagination
  const totalPages = Math.ceil(subscriptionFilteredSignals.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedSignals = subscriptionFilteredSignals.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTimeframe, searchQuery, bullFilter, bearFilter, sortBy, statusFilter]);

  // Calculate signals by timeframe - count ONLY ACTIVE signals for cards
  // RSI Divergence uses only 1h, 4h, 1d timeframes
  const timeframeStats = useMemo(() => {
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
      if (signal.timeframe === '1h' || signal.timeframe === '4h' || signal.timeframe === '1d') {
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


  const getDivergenceType = (signal: Signal): string => {
    const metadata = signal.metadata as any;
    if (metadata?.divergenceType) {
      return metadata.divergenceType;
    }
    const rsiValue = Number(metadata?.rsiValue || metadata?.rsiHigh || metadata?.rsiLow || 50);
    const isBullish = signal.signalType === 'BUY';
    if (isBullish) {
      return rsiValue < 40 ? 'Regular Bullish' : 'Hidden Bullish';
    } else {
      return rsiValue > 60 ? 'Regular Bearish' : 'Hidden Bearish';
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

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
          { label: 'Monitor', path: '/monitor/rsi' },
          { label: 'RSI Divergence Scans' },
        ]}
        lastUpdated="Just now"
        onRefresh={refetch}
      />

      {/* Free Forever: RSI Divergence is a context filter — info only */}
      {isFreeForever && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-8 mt-4 p-4 rounded-xl dark:bg-primary/10 light:bg-green-100 dark:border border-primary/30 light:border-green-400 flex flex-wrap items-center justify-between gap-3"
        >
          <span className="text-sm dark:text-gray-200 light:text-text-dark">
            RSI Divergence is a context filter. Free Forever shows 4H and Daily only for BTC, ETH, EURUSD, XAUUSD.
          </span>
          <Link
            to="/subscriptions"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-black font-bold text-sm hover:bg-primary/90 transition-colors"
          >
            Plan details
          </Link>
        </motion.div>
      )}

      {/* Timeframe Cards */}
      <motion.div
        initial="initial"
        animate="animate"
        variants={scaleInVariants}
        className="flex flex-col gap-6 px-4 md:px-8 pt-4 md:pt-8 pb-2 md:pb-4 shrink-0"
      >
        <div className="flex overflow-x-auto snap-x no-scrollbar gap-4 md:grid md:grid-cols-2 lg:grid-cols-4 pb-2 md:pb-0">
          {/* 1H - hidden for Free Forever (4H and Daily only) */}
          {!isFreeForever && (
            <AnimatedCard
              className={`group relative flex flex-col justify-between p-5 rounded-xl dark:backdrop-blur-md border transition-all cursor-pointer h-36 min-w-[85vw] md:min-w-0 snap-center md:snap-align-none ${timeframeStats['1h'] > 0
                ? activeTimeframe === '1h'
                  ? 'dark:bg-[rgba(20,30,22,0.6)] light:bg-green-50 dark:border-[rgba(19,236,55,0.5)] light:border-green-400 dark:shadow-[0_0_15px_rgba(19,236,55,0.15)] light:shadow-[0_0_10px_rgba(19,236,55,0.1)] hover:shadow-[0_0_25px_rgba(19,236,55,0.25)] ring-1 ring-primary/20'
                  : 'dark:bg-[rgba(20,30,22,0.4)] light:bg-green-50 dark:border-[rgba(19,236,55,0.3)] light:border-green-400 hover:shadow-[0_0_20px_rgba(19,236,55,0.2)]'
                : 'dark:bg-[rgba(20,30,22,0.2)] light:bg-green-50 dark:border-[#234829] light:border-green-300 opacity-50 cursor-not-allowed hover:opacity-60'
                }`}
              onClick={() => {
                if (timeframeStats['1h'] > 0) {
                  handleTimeframeClick('1h');
                }
              }}
            >
              <div className="flex justify-between items-start">
                <span className={`text-sm font-bold ${timeframeStats['1h'] > 0 ? 'dark:text-white light:text-text-dark' : 'dark:text-gray-500 light:text-text-light-secondary'}`}>
                  1H Timeframe
                </span>
                {timeframeStats['1h'] > 0 ? (
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
                  className={`text-5xl font-black tracking-tight ${timeframeStats['1h'] > 0
                    ? 'text-primary drop-shadow-[0_0_8px_rgba(19,236,55,0.5)]'
                    : 'dark:text-gray-700 light:text-text-light-secondary'
                    }`}
                >
                  {timeframeStats['1h']}
                </span>
                <span className={`text-xs ml-1 font-medium uppercase tracking-wide ${timeframeStats['1h'] > 0 ? 'dark:text-gray-400 light:text-text-light-secondary' : 'dark:text-gray-600 light:text-text-light-secondary'}`}>
                  Signals Detected
                </span>
              </div>
            </AnimatedCard>
          )}

          {/* 4H */}
          <AnimatedCard
            className={`group relative flex flex-col justify-between p-5 rounded-xl dark:backdrop-blur-md border transition-all cursor-pointer h-36 min-w-[85vw] md:min-w-0 snap-center md:snap-align-none ${timeframeStats['4h'] > 0
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
            className={`group relative flex flex-col justify-between p-5 rounded-xl dark:backdrop-blur-md border transition-all cursor-pointer h-36 min-w-[85vw] md:min-w-0 snap-center md:snap-align-none ${timeframeStats['1d'] > 0
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
        </div>

        {/* Status Tabs */}
        <StatusTabs
          strategyType="RSI_DIVERGENCE"
          activeStatus={statusFilter}
          onStatusChange={setStatusFilter}
          hideArchive={true}
        />
      </motion.div>

      {/* Main Content */}
      <div className="flex-1 min-h-0 px-4 md:px-8 pb-4 md:pb-8 flex flex-col">
        <div className="mx-auto w-full max-w-[1600px] flex flex-col gap-4 min-h-full">
          {/* Filters Bar */}
          <div className="flex items-center gap-2.5 py-2 dark:bg-background-dark/50 dark:backdrop-blur-sm light:bg-green-50 sticky top-0 z-20 overflow-x-auto flex-nowrap shrink-0 snap-x hide-scroll-indicator no-scrollbar">
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
              strategyType="RSI_DIVERGENCE"
            />
            <div className="w-px h-5 dark:bg-white/10 light:bg-green-300 mx-1 shrink-0"></div>

            {/* Bear Filter */}
            <PatternFilter
              type="bear"
              value={bearFilter}
              onChange={setBearFilter}
              strategyType="RSI_DIVERGENCE"
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

            {/* Download */}
            <motion.button
              whileHover={{ scale: 1.1, rotate: 5 }}
              whileTap={{ scale: 0.9 }}
              className="p-1.5 rounded-lg dark:bg-white/5 light:bg-green-50 dark:border-white/10 light:border-green-300 dark:text-gray-400 light:text-text-light-secondary hover:text-primary transition-colors shrink-0"
            >
              <span className="material-symbols-outlined text-base">download</span>
            </motion.button>
          </div>

          {/* Table */}
          <div className="flex-1 min-h-0 rounded-xl table-glass-panel relative flex">
            <div className="flex-1 flex flex-col min-w-0">
              <div className="flex-1 overflow-y-auto custom-scrollbar min-h-0 relative">
                <table className="hidden md:table w-full text-sm text-left dark:text-gray-400 light:text-text-light-secondary">
                  <thead className="text-[11px] uppercase dark:text-gray-500 light:text-text-light-secondary font-bold sticky top-0 dark:bg-[#0a140d] light:bg-green-50 dark:border-b-white/10 light:border-b-green-300 border-b z-10 tracking-wider">
                    <tr>
                      <th className="px-6 py-3" scope="col">
                        Symbol
                      </th>
                      <th className="px-6 py-3" scope="col">
                        Exchange
                      </th>
                      <th className="px-6 py-3" scope="col">
                        Timeframe
                      </th>
                      <th className="px-6 py-3" scope="col">
                        Divergence Type
                      </th>
                      <th className="px-6 py-3 text-center" scope="col">
                        Status
                      </th>
                      <th className="px-6 py-3 text-center" scope="col">
                        Setup Quality
                      </th>
                      <th className="px-6 py-3 text-right" scope="col">
                        CMC Rank
                      </th>
                      <th className="px-6 py-3 text-right" scope="col">
                        Volume (24h)
                      </th>
                      <th className="px-6 py-3 text-right" scope="col">
                        Detected
                      </th>
                      <th className="px-6 py-3 text-right" scope="col">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="dark:divide-y-white/5 light:divide-y-green-300 divide-y text-xs font-medium">
                    {filteredSignals.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-12 text-center dark:text-gray-500 light:text-text-light-secondary">
                          No signals found
                        </td>
                      </tr>
                    ) : (
                      paginatedSignals.map((signal, index) => {
                        const divergenceType = getDivergenceType(signal);
                        const isLocked = !isTierPaid && !isSymbolAllowed(signal.symbol);

                        return (
                          <motion.tr
                            key={signal.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05, duration: 0.3 }}
                            className={`dark:hover:bg-white/5 light:hover:bg-green-100 transition-colors cursor-pointer group ${isLocked ? 'blur-[6px] select-none pointer-events-none' : ''}`}
                            onClick={() => !isLocked && navigate(`/signals/${signal.id}`)}
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
                            <td className="px-6 py-2.5 whitespace-nowrap dark:text-white light:text-text-dark font-bold uppercase">
                              {signal.timeframe}
                            </td>
                            <td className="px-6 py-2.5 whitespace-nowrap dark:text-white light:text-text-dark">{divergenceType}</td>
                            <td className="px-6 py-2.5 text-center">
                              <SignalStatusBadge signal={signal} />
                            </td>
                            <td className="px-6 py-2.5 text-center">
                              <TrendIndicator signal={signal} />
                            </td>
                            <td className="px-6 py-2.5 text-right font-mono text-xs dark:text-gray-300 light:text-slate-600">
                              {getRank(signal.symbol) ? `#${getRank(signal.symbol)}` : '—'}
                            </td>
                            <td className="px-6 py-2.5 text-right">
                              <VolumeBadge volume={getVolume(signal.symbol)} formatVolume={formatVolume} isLow={isLowVolume(signal.symbol)} />
                            </td>
                            <td className="px-6 py-2.5 text-right font-mono dark:text-gray-300 light:text-slate-600 whitespace-nowrap">{formatTime(signal.detectedAt)}</td>
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

                {/* Mobile Card List */}
                <div className="md:hidden flex flex-col gap-3 p-4">
                  {filteredSignals.length === 0 ? (
                    <div className="text-center py-8 text-sm dark:text-gray-500 light:text-text-light-secondary">
                      No signals found
                    </div>
                  ) : (
                    paginatedSignals.map((signal, index) => {
                      const divergenceType = getDivergenceType(signal);
                      const isLong = signal.signalType === 'BUY';
                      const isLocked = !isTierPaid && !isSymbolAllowed(signal.symbol);

                      return (
                        <motion.div
                          key={signal.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.02, duration: 0.2 }}
                          onClick={() => !isLocked && navigate(`/signals/${signal.id}`)}
                          className={`relative flex flex-col gap-3 p-4 rounded-xl dark:bg-black/20 light:bg-white border dark:border-white/5 light:border-green-200 shadow-sm active:scale-[0.98] transition-all ${isLocked ? 'overflow-hidden' : ''}`}
                        >
                          {isLocked && <ProOverlay />}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                              <SymbolAvatar symbol={signal.symbol} />
                              <span className="font-bold text-base dark:text-white light:text-slate-800">{signal.symbol}</span>
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${isLong ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                                {divergenceType}
                              </span>
                            </div>
                            <span className="text-xs font-mono dark:text-gray-400 light:text-slate-500">
                              {new Date(signal.detectedAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })}
                            </span>
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <SignalStatusBadge signal={signal} />
                              <TrendIndicator signal={signal} />
                            </div>
                            <VolumeBadge volume={getVolume(signal.symbol)} formatVolume={formatVolume} isLow={isLowVolume(signal.symbol)} />
                          </div>
                        </motion.div>
                      );
                    })
                  )}
                </div>
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
            </div>

            {/* Win Rate Sidebar */}
            <div className="hidden lg:block">
              <WinRatePanel strategyType="RSI_DIVERGENCE" />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
