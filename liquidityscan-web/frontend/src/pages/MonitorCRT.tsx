import { useState, useMemo, useCallback, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { StatusTabs } from '../components/shared/StatusTabs';
import { WinRatePanel } from '../components/shared/WinRatePanel';
import { SignalStatusBadge } from '../components/shared/SignalStatusBadge';
import { Signal } from '../types';
import { StaticMiniChart } from '../components/StaticMiniChart';
import { FilterMenu } from '../components/shared/FilterMenu';
import { PageHeader } from '../components/layout/PageHeader';
import { AnimatedCard } from '../components/animations/AnimatedCard';
import { AnimatedList } from '../components/animations/AnimatedList';
import { useMarketData } from '../hooks/useMarketData';
import { fetchCandles } from '../services/candles';
import { useSignalFilter } from '../hooks/useSignalFilter';
import { useLifecycleFilter } from '../hooks/useLifecycleFilter';
import { userApi } from '../services/userApi';
import { useAuthStore } from '../store/authStore';
import { useVolumeData } from '../hooks/useVolumeData';
import { useTierGating } from '../hooks/useTierGating';
import { ProOverlay } from '../components/ProOverlay';
import { VolumeBadge } from '../components/shared/VolumeFilter';
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
        <div className="h-40 w-full dark:bg-black/40 light:bg-gray-100 relative dark:border-y-white/5 light:border-y-amber-200/30 border-y overflow-hidden group-hover:border-amber-500/20 transition-colors">
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
        'bg-amber-600/20 text-amber-600 ring-amber-600/40',
    ];
    const colorIndex = symbol.charCodeAt(0) % colors.length;
    return (
        <div className={`w-6 h-6 rounded-full ${colors[colorIndex]} flex items-center justify-center text-[10px] font-bold ring-1`}>
            {firstLetter}
        </div>
    );
}

function formatPrice(price: number | string) {
    const n = Number(price);
    if (!n) return '—';
    if (n >= 1000) return n.toFixed(2);
    if (n >= 1) return n.toFixed(4);
    return n.toFixed(6);
}

export function MonitorCRT() {
    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();
    const { isSymbolAllowed, isPaid: isTierPaid } = useTierGating();
    const [searchQuery, setSearchQuery] = useState('');
    const [bullFilter, setBullFilter] = useState('All');
    const [bearFilter, setBearFilter] = useState('All');
    const [sortBy, setSortBy] = useState<'confidence' | 'time' | 'symbol'>('confidence');
    const [marketCapSort, setMarketCapSort] = useState<'high-low' | 'low-high' | null>(null);
    const [volumeSort, setVolumeSort] = useState<'high-low' | 'low-high' | null>(null);
    const [rankingFilter, setRankingFilter] = useState<number | null>(null);
    const [statusFilter, setStatusFilter] = useState<any>('ALL');
    const [filterMenuOpen, setFilterMenuOpen] = useState(false);
    const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
    const [selectedTimeframe, setSelectedTimeframe] = useState<string | null>(searchParams.get('timeframe') || null);
    const [pageSize, setPageSize] = useState(50);
    const [currentPage, setCurrentPage] = useState(1);


    const { volumeMap, getVolume, isLowVolume, formatVolume, isLoading: isVolumeLoading } = useVolumeData();

    const { isAuthenticated } = useAuthStore();
    const { data: mySubscription } = useQuery({
        queryKey: ['mySubscription'],
        queryFn: () => userApi.getMySubscription(),
        enabled: isAuthenticated,
    });
    const isFreeForever = mySubscription?.subscription?.tier === 'SCOUT';
    const allowedPairs: string[] | undefined = mySubscription?.subscription?.limits?.pairs;

    // Sync selectedTimeframe with URL
    useEffect(() => {
        const tf = searchParams.get('timeframe');
        setSelectedTimeframe(tf || null);
    }, [searchParams]);

    const { signals, isLoading: isSignalsLoading } = useMarketData({
        strategyType: 'CRT',
        limit: 5000,
        refetchInterval: 60000,
    });

    const isLoading = isSignalsLoading || isVolumeLoading;

    const filteredSignals = useSignalFilter({
        signals,
        searchQuery,
        activeTimeframe: undefined,
        bullFilter,
        bearFilter,
        sortBy,
        marketCapSort,
        volumeSort,
        rankingFilter,
        showClosedSignals: true,
        strategyType: 'CRT',

        volumeMap,
    });

    const timeframeFilteredSignals = useMemo(() => {
        if (!selectedTimeframe) {
            return filteredSignals;
        }
        return filteredSignals.filter(s => s.timeframe.toLowerCase() === selectedTimeframe.toLowerCase());
    }, [filteredSignals, selectedTimeframe]);

    const statusFilteredSignals = useLifecycleFilter({
        signals: timeframeFilteredSignals,
        tab: statusFilter,
    });

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

    // Reset to page 1 when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [selectedTimeframe, searchQuery, bullFilter, bearFilter, sortBy, statusFilter]);

    const timeframeStats = useMemo(() => {
        const stats: Record<string, number> = {
            '4h': 0,
            '1d': 0,
            '1w': 0,
        };

        statusFilteredSignals.forEach((signal) => {
            const tf = signal.timeframe.toLowerCase();
            if (tf === '4h' || tf === '1d' || tf === '1w') {
                stats[tf] = (stats[tf] || 0) + 1;
            }
        });

        return stats;
    }, [statusFilteredSignals]);

    const handleTimeframeClick = useCallback((timeframe: string | null) => {
        setSelectedTimeframe(timeframe);
        if (!timeframe) {
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
        setSelectedTimeframe(null);
        searchParams.delete('timeframe');
        setSearchParams(searchParams);
    }, [searchParams, setSearchParams]);

    return (
        <>
            {/* Header */}
            <div className="px-4 md:px-8 pt-4 md:pt-8 pb-2 md:pb-4">
                <PageHeader
                    breadcrumbs={[
                        { label: 'Scanner', path: '/dashboard' },
                        { label: 'CRT — Candle Range Theory' },
                    ]}
                />
            </div>

            {/* Timeframe Cards */}
            <motion.div
                initial="initial"
                animate="animate"
                variants={scaleInVariants}
                className="flex flex-col gap-6 px-4 md:px-8 pb-2 md:pb-4 shrink-0"
            >
                <div className="flex overflow-x-auto snap-x no-scrollbar gap-4 md:grid md:grid-cols-2 lg:grid-cols-3 pb-2 md:pb-0">
                    {/* 4H */}
                    <AnimatedCard
                        className={`group relative flex flex-col justify-between p-5 rounded-xl dark:backdrop-blur-md border transition-all cursor-pointer h-36 min-w-[85vw] md:min-w-0 snap-center md:snap-align-none ${timeframeStats['4h'] > 0
                            ? selectedTimeframe === '4h'
                                ? 'dark:bg-[rgba(30,20,10,0.6)] light:bg-amber-50 dark:border-[rgba(245,158,11,0.5)] light:border-amber-400 dark:shadow-[0_0_15px_rgba(245,158,11,0.15)] light:shadow-[0_0_10px_rgba(245,158,11,0.1)] hover:shadow-[0_0_25px_rgba(245,158,11,0.25)] ring-1 ring-amber-500/20'
                                : 'dark:bg-[rgba(30,20,10,0.4)] light:bg-amber-50 dark:border-[rgba(245,158,11,0.3)] light:border-amber-400 hover:shadow-[0_0_20px_rgba(245,158,11,0.2)]'
                            : 'dark:bg-[rgba(30,20,10,0.2)] light:bg-amber-50 dark:border-[#483323] light:border-amber-300 opacity-50 cursor-not-allowed hover:opacity-60'
                            }`}
                        onClick={() => {
                            if (timeframeStats['4h'] > 0) {
                                handleTimeframeClick(selectedTimeframe === '4h' ? null : '4h');
                            }
                        }}
                    >
                        <div className="flex justify-between items-start">
                            <span className={`text-sm font-bold ${timeframeStats['4h'] > 0 ? 'dark:text-white light:text-text-dark' : 'dark:text-gray-500 light:text-text-light-secondary'}`}>
                                4H Timeframe
                            </span>
                            {timeframeStats['4h'] > 0 ? (
                                <span className="flex items-center gap-1.5 text-[10px] font-bold text-amber-500 uppercase tracking-wider bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20 shadow-[0_0_10px_rgba(245,158,11,0.2)]">
                                    <motion.span
                                        className="w-1.5 h-1.5 rounded-full bg-amber-500"
                                        animate={{ opacity: [1, 0.5, 1] }}
                                        transition={{ duration: 2, repeat: Infinity }}
                                    />
                                    Active
                                </span>
                            ) : (
                                <span className="text-[10px] font-bold dark:text-gray-500 light:text-text-light-secondary uppercase tracking-wider dark:bg-white/5 light:bg-amber-100 px-2 py-0.5 rounded-full dark:border-white/5 light:border-amber-300">
                                    No Signals
                                </span>
                            )}
                        </div>
                        <div className="mt-auto">
                            <span
                                className={`text-5xl font-black tracking-tight ${timeframeStats['4h'] > 0
                                    ? 'text-amber-500 drop-shadow-[0_0_12px_rgba(245,158,11,0.6)]'
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
                            ? selectedTimeframe === '1d'
                                ? 'dark:bg-[rgba(30,20,10,0.6)] light:bg-amber-50 dark:border-[rgba(245,158,11,0.5)] light:border-amber-400 dark:shadow-[0_0_15px_rgba(245,158,11,0.15)] light:shadow-[0_0_10px_rgba(245,158,11,0.1)] hover:shadow-[0_0_25px_rgba(245,158,11,0.25)] ring-1 ring-amber-500/20'
                                : 'dark:bg-[rgba(30,20,10,0.4)] light:bg-amber-50 dark:border-[rgba(245,158,11,0.3)] light:border-amber-400 hover:shadow-[0_0_20px_rgba(245,158,11,0.2)]'
                            : 'dark:bg-[rgba(30,20,10,0.2)] light:bg-amber-50 dark:border-[#483323] light:border-amber-300 opacity-50 cursor-not-allowed hover:opacity-60'
                            }`}
                        onClick={() => {
                            if (timeframeStats['1d'] > 0) {
                                handleTimeframeClick(selectedTimeframe === '1d' ? null : '1d');
                            }
                        }}
                    >
                        <div className="flex justify-between items-start">
                            <span className={`text-sm font-bold ${timeframeStats['1d'] > 0 ? 'dark:text-white light:text-text-dark' : 'dark:text-gray-500 light:text-text-light-secondary'}`}>
                                1D Timeframe
                            </span>
                            {timeframeStats['1d'] > 0 ? (
                                <span className="flex items-center gap-1.5 text-[10px] font-bold text-amber-500 uppercase tracking-wider bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20 shadow-[0_0_10px_rgba(245,158,11,0.2)]">
                                    <motion.span
                                        className="w-1.5 h-1.5 rounded-full bg-amber-500"
                                        animate={{ opacity: [1, 0.5, 1] }}
                                        transition={{ duration: 2, repeat: Infinity }}
                                    />
                                    Active
                                </span>
                            ) : (
                                <span className="text-[10px] font-bold dark:text-gray-500 light:text-text-light-secondary uppercase tracking-wider dark:bg-white/5 light:bg-amber-100 px-2 py-0.5 rounded-full dark:border-white/5 light:border-amber-300">
                                    No Signals
                                </span>
                            )}
                        </div>
                        <div className="mt-auto">
                            <span
                                className={`text-5xl font-black tracking-tight ${timeframeStats['1d'] > 0
                                    ? 'text-amber-500 drop-shadow-[0_0_12px_rgba(245,158,11,0.6)]'
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
                        className={`group relative flex flex-col justify-between p-5 rounded-xl dark:backdrop-blur-md border transition-all cursor-pointer h-36 min-w-[85vw] md:min-w-0 snap-center md:snap-align-none ${timeframeStats['1w'] > 0
                            ? selectedTimeframe === '1w'
                                ? 'dark:bg-[rgba(30,20,10,0.6)] light:bg-amber-50 dark:border-[rgba(245,158,11,0.5)] light:border-amber-400 dark:shadow-[0_0_15px_rgba(245,158,11,0.15)] light:shadow-[0_0_10px_rgba(245,158,11,0.1)] hover:shadow-[0_0_25px_rgba(245,158,11,0.25)] ring-1 ring-amber-500/20'
                                : 'dark:bg-[rgba(30,20,10,0.4)] light:bg-amber-50 dark:border-[rgba(245,158,11,0.3)] light:border-amber-400 hover:shadow-[0_0_20px_rgba(245,158,11,0.2)]'
                            : 'dark:bg-[rgba(30,20,10,0.2)] light:bg-amber-50 dark:border-[#483323] light:border-amber-300 opacity-50 cursor-not-allowed hover:opacity-60'
                            }`}
                        onClick={() => {
                            if (timeframeStats['1w'] > 0) {
                                handleTimeframeClick(selectedTimeframe === '1w' ? null : '1w');
                            }
                        }}
                    >
                        <div className="flex justify-between items-start">
                            <span className={`text-sm font-bold ${timeframeStats['1w'] > 0 ? 'dark:text-white light:text-text-dark' : 'dark:text-gray-500 light:text-text-light-secondary'}`}>
                                1W Timeframe
                            </span>
                            {timeframeStats['1w'] > 0 ? (
                                <span className="flex items-center gap-1.5 text-[10px] font-bold text-amber-500 uppercase tracking-wider bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20 shadow-[0_0_10px_rgba(245,158,11,0.2)]">
                                    <motion.span
                                        className="w-1.5 h-1.5 rounded-full bg-amber-500"
                                        animate={{ opacity: [1, 0.5, 1] }}
                                        transition={{ duration: 2, repeat: Infinity }}
                                    />
                                    Active
                                </span>
                            ) : (
                                <span className="text-[10px] font-bold dark:text-gray-500 light:text-text-light-secondary uppercase tracking-wider dark:bg-white/5 light:bg-amber-100 px-2 py-0.5 rounded-full dark:border-white/5 light:border-amber-300">
                                    No Signals
                                </span>
                            )}
                        </div>
                        <div className="mt-auto">
                            <span
                                className={`text-5xl font-black tracking-tight ${timeframeStats['1w'] > 0
                                    ? 'text-amber-500 drop-shadow-[0_0_12px_rgba(245,158,11,0.6)]'
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

                <StatusTabs
                    strategyType="CRT"
                    activeStatus={statusFilter}
                    onStatusChange={setStatusFilter}
                />
            </motion.div>

            {isLoading && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-background-dark/50 backdrop-blur-sm">
                    <div className="flex flex-col items-center gap-4">
                        <div className="w-12 h-12 border-4 border-amber-500/20 border-t-amber-500 rounded-full animate-spin"></div>
                        <p className="text-amber-500 font-mono font-bold animate-pulse">Scanning CRT Signals...</p>
                    </div>
                </div>
            )}

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
                                className="w-full pl-9 pr-3 py-1.5 rounded-full dark:bg-white/5 light:bg-white dark:border-white/10 light:border-green-300 dark:text-white light:text-text-dark text-xs dark:placeholder:dark:text-gray-600 light:text-slate-400 light:placeholder:text-text-light-secondary focus:border-amber-500 focus:ring-amber-500 focus:ring-1 transition-all outline-none"
                                placeholder="Search..."
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </motion.div>
                        <div className="w-px h-5 dark:bg-white/10 light:bg-amber-300 mx-1 shrink-0"></div>

                        {/* Filter Menu */}
                        <div className="relative group/more">
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => setFilterMenuOpen(!filterMenuOpen)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold transition-colors group whitespace-nowrap ${filterMenuOpen
                                    ? 'dark:bg-white/10 light:bg-amber-100 border-amber-500/30 dark:text-white light:text-text-dark active:bg-amber-500/10 active:border-amber-500/30'
                                    : 'dark:bg-white/5 light:bg-amber-50 dark:border-white/10 light:border-green-300 dark:text-gray-300 light:text-text-light-secondary dark:hover:bg-white/10 light:hover:bg-amber-100 dark:hover:text-white light:hover:text-text-dark'
                                    }`}
                            >
                                <span className={`material-symbols-outlined text-sm ${filterMenuOpen ? 'text-amber-500' : 'group-hover:text-amber-500 transition-colors'}`}>
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

                        <div className="w-px h-5 dark:bg-white/10 light:bg-amber-300 mx-1 shrink-0"></div>

                        {/* View Toggle */}
                        <div className="flex p-1 gap-1 rounded-lg dark:bg-white/5 light:bg-green-50 dark:border-white/10 light:border-green-300 shrink-0">
                            <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={() => setViewMode('list')}
                                className={`p-1.5 rounded transition-all ${viewMode === 'list' ? 'bg-amber-500 text-black' : 'dark:text-gray-400 light:text-text-light-secondary dark:hover:text-white light:hover:text-text-dark'
                                    }`}
                                title="List View"
                            >
                                <span className="material-symbols-outlined text-base">view_list</span>
                            </motion.button>
                            <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={() => setViewMode('grid')}
                                className={`p-1.5 rounded transition-all ${viewMode === 'grid' ? 'bg-amber-500 text-black' : 'dark:text-gray-400 light:text-text-light-secondary dark:hover:text-white light:hover:text-text-dark'
                                    }`}
                                title="Grid View"
                            >
                                <span className="material-symbols-outlined text-base">grid_view</span>
                            </motion.button>
                        </div>
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
                                <div className="flex-1 overflow-y-auto custom-scrollbar min-h-0 relative">
                                    <table className="hidden md:table w-full text-sm text-left dark:text-gray-400 light:text-text-light-secondary">
                                        <thead className="text-[11px] uppercase dark:text-gray-500 light:text-text-light-secondary font-bold sticky top-0 dark:bg-[#0a140d] light:bg-green-50 dark:border-b-white/10 light:border-b-green-300 z-10 tracking-wider">
                                            <tr>
                                                <th className="px-6 py-3" scope="col">Symbol</th>
                                                <th className="px-6 py-3" scope="col">Exchange</th>
                                                <th className="px-6 py-3" scope="col">Timeframe</th>
                                                <th className="px-6 py-3" scope="col">Direction</th>
                                                <th className="px-6 py-3 text-right" scope="col">Swept Level</th>
                                                <th className="px-6 py-3 text-right" scope="col">Sweep Extreme</th>
                                                <th className="px-6 py-3 text-right" scope="col">Price</th>
                                                <th className="px-6 py-3 text-center" scope="col">Status</th>
                                                <th className="px-6 py-3 text-right" scope="col">Volume (24h)</th>
                                                <th className="px-6 py-3 text-right" scope="col">Detected</th>
                                            </tr>
                                        </thead>
                                        <tbody className="dark:divide-y-white/5 light:divide-y-green-200/30 text-xs font-medium">
                                            {paginatedSignals.length === 0 ? (
                                                <tr>
                                                    <td colSpan={9} className="px-6 py-12 text-center dark:text-gray-500 light:text-text-light-secondary">
                                                        No signals found
                                                    </td>
                                                </tr>
                                            ) : (
                                                paginatedSignals.map((signal, index) => {
                                                    const meta = (signal as any).metadata || {};
                                                    const isLocked = !isTierPaid && !isSymbolAllowed(signal.symbol);
                                                    return (
                                                        <motion.tr
                                                            key={signal.id}
                                                            initial={{ opacity: 0, y: 20, scale: 0.98 }}
                                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                                            transition={{ delay: index * 0.03, duration: 0.3 }}
                                                            className={`dark:hover:bg-white/[0.03] light:hover:bg-green-50 transition-all cursor-pointer group hover:shadow-[0_0_20px_rgba(0,0,0,0.2)] border-b border-transparent hover:border-amber-500/10 relative ${isLocked ? 'blur-[6px] select-none pointer-events-none' : ''}`}
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
                                                            <td className="px-6 py-2.5 whitespace-nowrap dark:text-white light:text-text-dark">
                                                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black ${signal.signalType === 'BUY'
                                                                    ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                                                                    : 'bg-red-500/10 text-red-400 border border-red-500/20'
                                                                    }`}>
                                                                    {signal.signalType === 'BUY' ? '▲ BULLISH' : '▼ BEARISH'}
                                                                </span>
                                                            </td>
                                                            <td className="px-6 py-2.5 text-right font-mono text-xs dark:text-gray-300 light:text-gray-600">
                                                                {meta.swept_level ? formatPrice(meta.swept_level) : '—'}
                                                            </td>
                                                            <td className="px-6 py-2.5 text-right font-mono text-xs dark:text-gray-300 light:text-gray-600">
                                                                {meta.sweep_extreme ? formatPrice(meta.sweep_extreme) : '—'}
                                                            </td>
                                                            <td className="px-6 py-2.5 text-right font-mono text-xs font-bold dark:text-white light:text-text-dark">
                                                                ${formatPrice(signal.price)}
                                                            </td>
                                                            <td className="px-6 py-2.5 text-center">
                                                                <SignalStatusBadge signal={signal} />
                                                            </td>
                                                            <td className="px-6 py-2.5 text-right">
                                                                <VolumeBadge volume={getVolume(signal.symbol)} formatVolume={formatVolume} isLow={isLowVolume(signal.symbol)} />
                                                            </td>
                                                            <td className="px-6 py-2.5 text-right font-mono dark:text-gray-300 light:text-slate-600 whitespace-nowrap">
                                                                {new Date(signal.detectedAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })}
                                                            </td>
                                                        </motion.tr>
                                                    )
                                                })
                                            )}
                                        </tbody>
                                    </table>

                                    {/* Mobile Card List */}
                                    <div className="md:hidden flex flex-col gap-3 p-4">
                                        {paginatedSignals.length === 0 ? (
                                            <div className="text-center py-8 text-sm dark:text-gray-500 light:text-text-light-secondary">
                                                No signals found
                                            </div>
                                        ) : (
                                            paginatedSignals.map((signal, index) => {
                                                const meta = (signal as any).metadata || {};
                                                const isLong = signal.signalType === 'BUY';
                                                const directionLabel = isLong ? '▲ BULLISH' : '▼ BEARISH';
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
                                                                    {directionLabel}
                                                                </span>
                                                            </div>
                                                            <span className="text-xs font-mono dark:text-gray-400 light:text-slate-500">
                                                                {new Date(signal.detectedAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })}
                                                            </span>
                                                        </div>

                                                        <div className="flex flex-col gap-1 text-xs mb-1">
                                                            <div className="flex justify-between">
                                                                <span className="dark:text-gray-500 light:text-slate-500">Swept:</span>
                                                                <span className="font-mono">{meta.swept_level ? formatPrice(meta.swept_level) : '—'}</span>
                                                            </div>
                                                            <div className="flex justify-between">
                                                                <span className="dark:text-gray-500 light:text-slate-500">Price:</span>
                                                                <span className="font-mono font-bold text-primary">${formatPrice(signal.price)}</span>
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center justify-between">
                                                            <SignalStatusBadge signal={signal} />
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
                                                className="px-2 py-1 rounded dark:bg-white/5 light:bg-white dark:border-white/10 light:border-green-300 dark:text-white light:text-text-dark text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
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
                                                className="px-3 py-1 rounded dark:bg-white/5 light:bg-green-50 dark:border-white/10 light:border-green-300 dark:text-white light:text-text-dark text-xs disabled:opacity-50 disabled:cursor-not-allowed hover:bg-amber-500/10 transition-colors"
                                            >
                                                Previous
                                            </button>
                                            <span className="text-xs dark:text-gray-400 light:text-text-light-secondary">
                                                Page {currentPage} of {totalPages}
                                            </span>
                                            <button
                                                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                                disabled={currentPage === totalPages}
                                                className="px-3 py-1 rounded dark:bg-white/5 light:bg-green-50 dark:border-white/10 light:border-green-300 dark:text-white light:text-text-dark text-xs disabled:opacity-50 disabled:cursor-not-allowed hover:bg-amber-500/10 transition-colors"
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
                                            const meta = (signal as any).metadata || {};

                                            return (
                                                <AnimatedCard
                                                    key={signal.id}
                                                    onClick={() => navigate(`/signals/${signal.id}`)}
                                                    className={`glass-panel rounded-2xl overflow-hidden relative group cursor-pointer flex flex-col hover:border-amber-500/20`}
                                                >
                                                    <div className="p-5 flex justify-between items-start z-10 relative">
                                                        <div className="flex flex-col">
                                                            <h3 className="text-xl font-bold dark:text-white light:text-text-dark tracking-tight">{signal.symbol}</h3>
                                                            <span className="text-xs dark:text-gray-400 light:text-text-light-secondary font-mono mt-1">Binance Perp</span>
                                                        </div>
                                                        <span
                                                            className={`px-3 py-1 rounded-full text-xs font-bold tracking-wider shadow-[0_0_10px_rgba(245,158,11,0.2)] ${isLong
                                                                ? 'bg-amber-500/10 border border-green-500/20 text-green-400'
                                                                : 'bg-red-500/10 border border-red-500/20 text-red-400'
                                                                }`}
                                                        >
                                                            {isLong ? 'BULLISH' : 'BEARISH'}
                                                        </span>
                                                    </div>
                                                    <SignalCardWithChart signal={signal} isLong={isLong} />
                                                    <div className="p-4 flex justify-between items-center text-sm mt-auto z-10 dark:bg-black/30">
                                                        {/* CRT Metadata Highlights */}
                                                        <div className="flex flex-col gap-1 w-full">
                                                            <div className="flex justify-between items-center text-xs">
                                                                <span className="dark:text-gray-500 light:text-gray-400">Swept Level:</span>
                                                                <span className="dark:text-white font-mono">{meta.swept_level ? formatPrice(meta.swept_level) : '—'}</span>
                                                            </div>
                                                            <div className="flex justify-between items-center text-xs">
                                                                <span className="dark:text-gray-500 light:text-gray-400">Sweep Extreme:</span>
                                                                <span className="dark:text-white font-mono">{meta.sweep_extreme ? formatPrice(meta.sweep_extreme) : '—'}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="px-4 py-2 dark:bg-black/40 light:bg-green-50 dark:border-t-white/5 light:border-t-green-300 flex justify-between items-center z-10">
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="text-[10px] text-amber-500 font-bold uppercase">CRT</span>
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
                                                className="px-2 py-1 rounded dark:bg-white/5 light:bg-white dark:border-white/10 light:border-green-300 dark:text-white light:text-text-dark text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
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
                                                className="px-3 py-1 rounded dark:bg-white/5 light:bg-green-50 dark:border-white/10 light:border-green-300 dark:text-white light:text-text-dark text-xs disabled:opacity-50 disabled:cursor-not-allowed hover:bg-amber-500/10 transition-colors"
                                            >
                                                Previous
                                            </button>
                                            <span className="text-xs dark:text-gray-400 light:text-text-light-secondary">
                                                Page {currentPage} of {totalPages}
                                            </span>
                                            <button
                                                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                                disabled={currentPage === totalPages}
                                                className="px-3 py-1 rounded dark:bg-white/5 light:bg-green-50 dark:border-white/10 light:border-green-300 dark:text-white light:text-text-dark text-xs disabled:opacity-50 disabled:cursor-not-allowed hover:bg-amber-500/10 transition-colors"
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
                            <div className="hidden md:block w-72 shrink-0">
                                <WinRatePanel strategyType="CRT" />
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}
