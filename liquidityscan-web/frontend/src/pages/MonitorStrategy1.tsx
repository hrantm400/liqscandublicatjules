import { useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { StatusTabs } from '../components/shared/StatusTabs';
import { WinRatePanel } from '../components/shared/WinRatePanel';
import { SignalStatusBadge } from '../components/shared/SignalStatusBadge';
import { useMarketData } from '../hooks/useMarketData';
import { listItemVariants } from '../utils/animations';

// Symbol Avatar Component
function SymbolAvatar({ symbol }: { symbol: string }) {
    const firstLetter = symbol.charAt(0).toUpperCase();
    const colors = [
        'bg-amber-500/20 text-amber-500 ring-amber-500/40',
        'bg-orange-500/20 text-orange-500 ring-orange-500/40',
        'bg-yellow-500/20 text-yellow-500 ring-yellow-500/40',
        'bg-red-500/20 text-red-500 ring-red-500/40',
        'bg-emerald-500/20 text-emerald-500 ring-emerald-500/40',
        'bg-pink-500/20 text-pink-500 ring-pink-500/40',
        'bg-blue-500/20 text-blue-500 ring-blue-500/40',
        'bg-indigo-500/20 text-indigo-500 ring-indigo-500/40',
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

export function MonitorStrategy1() {
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [directionFilter, setDirectionFilter] = useState<'all' | 'long' | 'short'>('all');
    const [pageSize] = useState(50);
    const [currentPage, setCurrentPage] = useState(1);

    // Fetch Strategy 1 signals
    const { signals, isLoading } = useMarketData({
        strategyType: 'STRATEGY_1',
        limit: 5000,
        refetchInterval: 60000,
    });

    // Apply filters
    const filteredSignals = useMemo(() => {
        let result = [...signals];

        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            result = result.filter(s =>
                s.symbol.toLowerCase().includes(q),
            );
        }

        if (directionFilter === 'long') {
            result = result.filter(s => s.signalType === 'BUY');
        } else if (directionFilter === 'short') {
            result = result.filter(s => s.signalType === 'SELL');
        }

        if (statusFilter === 'active') {
            result = result.filter(s => s.status === 'ACTIVE');
        } else if (statusFilter === 'won') {
            result = result.filter(s => s.status === 'HIT_TP' || s.outcome === 'HIT_TP');
        } else if (statusFilter === 'lost') {
            result = result.filter(s => s.status === 'HIT_SL' || s.outcome === 'HIT_SL');
        } else if (statusFilter === 'expired') {
            result = result.filter(s => s.status === 'EXPIRED' || s.outcome === 'EXPIRED');
        } else if (statusFilter === 'closed') {
            result = result.filter(s => s.status !== 'ACTIVE');
        }

        return result;
    }, [signals, searchQuery, directionFilter, statusFilter]);

    // Pagination
    const totalPages = Math.ceil(filteredSignals.length / pageSize);
    const paginatedSignals = filteredSignals.slice(
        (currentPage - 1) * pageSize,
        currentPage * pageSize,
    );

    // Session counts
    const sessionCounts = useMemo(() => {
        const counts = { london: 0, newYork: 0 };
        signals.forEach(s => {
            const session = (s as any).metadata?.session;
            if (session === 'LONDON') counts.london++;
            else if (session === 'NEW_YORK') counts.newYork++;
        });
        return counts;
    }, [signals]);

    // Signal stats
    const stats = useMemo(() => {
        const long = signals.filter(s => s.signalType === 'BUY').length;
        const short = signals.filter(s => s.signalType === 'SELL').length;
        const active = signals.filter(s => s.status === 'ACTIVE').length;
        return { long, short, active, total: filteredSignals.length };
    }, [signals, filteredSignals]);

    return (
        <div className="flex flex-col h-full">
            {/* Breadcrumb Header */}
            <div className="flex flex-col gap-6 px-8 pt-6 pb-2 shrink-0">
                <div className="flex items-center gap-2 text-xs font-medium dark:text-gray-500 light:text-text-light-secondary uppercase tracking-wider">
                    <Link to="/strategies" className="dark:hover:text-white light:hover:text-text-dark cursor-pointer transition-colors">Monitor</Link>
                    <span className="material-symbols-outlined text-[10px]">chevron_right</span>
                    <Link to="/strategies" className="dark:hover:text-white light:hover:text-text-dark cursor-pointer transition-colors">My Strategies</Link>
                    <span className="material-symbols-outlined text-[10px]">chevron_right</span>
                    <span className="text-amber-400 drop-shadow-[0_0_5px_rgba(245,158,11,0.5)]">Strategy 1</span>
                    <span className="ml-2 text-gray-600">Last updated: <span className="dark:text-white light:text-text-dark">Just now</span></span>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 overflow-y-auto custom-scrollbar px-8 pb-8">
                <div className="max-w-[1800px] mx-auto flex flex-col gap-4">

                    {/* Stats Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        {/* Total Signals */}
                        <div className="glass-panel rounded-2xl p-5 border dark:border-white/5 light:border-green-200">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                                    <span className="material-symbols-outlined text-amber-500 text-lg">signal_cellular_alt</span>
                                </div>
                                <span className="text-sm font-medium dark:text-gray-400 light:text-text-light-secondary">Total Signals</span>
                            </div>
                            <span className="text-3xl font-black dark:text-white light:text-text-dark">{stats.total}</span>
                        </div>

                        {/* Active */}
                        <div className="glass-panel rounded-2xl p-5 border dark:border-white/5 light:border-green-200">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-9 h-9 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center justify-center">
                                    <span className="material-symbols-outlined text-green-500 text-lg">radio_button_checked</span>
                                </div>
                                <span className="text-sm font-medium dark:text-gray-400 light:text-text-light-secondary">Active</span>
                            </div>
                            <span className="text-3xl font-black dark:text-white light:text-text-dark">{stats.active}</span>
                        </div>

                        {/* London Session */}
                        <div className="glass-panel rounded-2xl p-5 border dark:border-white/5 light:border-green-200">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-9 h-9 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                                    <span className="material-symbols-outlined text-blue-500 text-lg">schedule</span>
                                </div>
                                <span className="text-sm font-medium dark:text-gray-400 light:text-text-light-secondary">London</span>
                            </div>
                            <span className="text-3xl font-black dark:text-white light:text-text-dark">{sessionCounts.london}</span>
                        </div>

                        {/* NY Session */}
                        <div className="glass-panel rounded-2xl p-5 border dark:border-white/5 light:border-green-200">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-9 h-9 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                                    <span className="material-symbols-outlined text-purple-500 text-lg">location_city</span>
                                </div>
                                <span className="text-sm font-medium dark:text-gray-400 light:text-text-light-secondary">New York</span>
                            </div>
                            <span className="text-3xl font-black dark:text-white light:text-text-dark">{sessionCounts.newYork}</span>
                        </div>
                    </div>

                    {/* Win Rate Panel */}
                    <WinRatePanel strategyType="STRATEGY_1" />

                    {/* Filters Section */}
                    <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
                        <StatusTabs strategyType="STRATEGY_1" activeStatus={statusFilter} onStatusChange={(tab) => { setStatusFilter(tab); setCurrentPage(1); }} />

                        <div className="flex items-center gap-3">
                            {/* Direction Filter */}
                            <div className="flex items-center gap-1 p-1 rounded-lg dark:bg-white/5 light:bg-green-50 border dark:border-white/5 light:border-green-200">
                                {(['all', 'long', 'short'] as const).map(dir => (
                                    <button
                                        key={dir}
                                        onClick={() => { setDirectionFilter(dir); setCurrentPage(1); }}
                                        className={`px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider transition-all ${directionFilter === dir
                                            ? dir === 'long'
                                                ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                                                : dir === 'short'
                                                    ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                                                    : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                            : 'dark:text-gray-500 light:text-text-light-secondary dark:hover:text-white light:hover:text-text-dark border border-transparent'
                                            }`}
                                    >
                                        {dir}
                                    </button>
                                ))}
                            </div>

                            {/* Search */}
                            <div className="relative">
                                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-base">search</span>
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                                    placeholder="Search pairs..."
                                    className="pl-9 pr-4 py-2 text-sm rounded-lg dark:bg-white/5 light:bg-white dark:border-white/5 light:border-green-200 border dark:text-white light:text-text-dark dark:placeholder:text-gray-600 light:placeholder:text-text-light-secondary focus:outline-none focus:ring-1 focus:ring-amber-500/50 w-48"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Signals Table */}
                    <div className="glass-panel rounded-2xl overflow-hidden border dark:border-white/5 light:border-green-200">
                        {/* Table Header */}
                        <div className="grid grid-cols-[auto_1fr_80px_100px_100px_100px_100px_80px_80px_90px] gap-2 px-5 py-3 border-b dark:border-white/5 light:border-green-200 text-[10px] font-bold dark:text-gray-500 light:text-text-light-secondary uppercase tracking-wider">
                            <span>Pair</span>
                            <span></span>
                            <span>Direction</span>
                            <span>Entry</span>
                            <span>Stop Loss</span>
                            <span>TP1</span>
                            <span>TP2</span>
                            <span>Risk</span>
                            <span>Session</span>
                            <span>Status</span>
                        </div>

                        {/* Loading State */}
                        {isLoading && (
                            <div className="flex items-center justify-center py-16">
                                <div className="flex flex-col items-center gap-3">
                                    <div className="w-8 h-8 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
                                    <span className="text-xs dark:text-gray-500 light:text-text-light-secondary font-medium">Loading Strategy 1 signals...</span>
                                </div>
                            </div>
                        )}

                        {/* Empty State */}
                        {!isLoading && filteredSignals.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-16 gap-3">
                                <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-2">
                                    <span className="material-symbols-outlined text-amber-500 text-2xl">hourglass_empty</span>
                                </div>
                                <span className="text-sm font-bold dark:text-gray-400 light:text-text-light-secondary">No signals found</span>
                                <span className="text-xs dark:text-gray-600 light:text-text-light-secondary max-w-sm text-center">
                                    Strategy 1 waits for 4H SuperEngulfing + 5M break during London/NY sessions. Signals appear when conditions align.
                                </span>
                            </div>
                        )}

                        {/* Signal Rows */}
                        {!isLoading && paginatedSignals.map((signal, idx) => {
                            const meta = (signal as any).metadata || {};
                            const isBuy = signal.signalType === 'BUY';
                            const formatPrice = (p: number) => p ? p.toFixed(p > 100 ? 2 : p > 1 ? 4 : 6) : '—';

                            return (
                                <motion.div
                                    key={signal.id || idx}
                                    variants={listItemVariants}
                                    initial="initial"
                                    animate="animate"
                                    custom={idx}
                                    onClick={() => signal.id && navigate(`/signals/${signal.id}`)}
                                    className="grid grid-cols-[auto_1fr_80px_100px_100px_100px_100px_80px_80px_90px] gap-2 px-5 py-3 border-b dark:border-white/5 light:border-green-100 dark:hover:bg-white/[0.02] light:hover:bg-green-50/50 cursor-pointer transition-colors items-center group"
                                >
                                    <SymbolAvatar symbol={signal.symbol} />
                                    <div className="flex flex-col min-w-0">
                                        <span className="text-sm font-bold dark:text-white light:text-text-dark truncate">
                                            {signal.symbol.replace('USDT', '/USDT')}
                                        </span>
                                        <span className="text-[10px] dark:text-gray-600 light:text-text-light-secondary font-mono">
                                            {formatTime(signal.detectedAt)} • {meta.sePattern || '4H SE'}
                                        </span>
                                    </div>

                                    {/* Direction */}
                                    <div className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-bold ${isBuy
                                        ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                                        : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                                        <span className="material-symbols-outlined text-sm">{isBuy ? 'trending_up' : 'trending_down'}</span>
                                        {isBuy ? 'LONG' : 'SHORT'}
                                    </div>

                                    {/* Entry */}
                                    <span className="text-xs font-bold dark:text-white light:text-text-dark font-mono">
                                        ${formatPrice(signal.price)}
                                    </span>

                                    {/* Stop Loss */}
                                    <span className="text-xs font-bold text-red-400 font-mono">
                                        ${formatPrice(meta.stopLoss)}
                                    </span>

                                    {/* TP1 */}
                                    <span className="text-xs font-bold text-green-400 font-mono">
                                        ${formatPrice(meta.tp1)}
                                    </span>

                                    {/* TP2 */}
                                    <span className="text-xs font-bold text-emerald-400 font-mono">
                                        ${formatPrice(meta.tp2)}
                                    </span>

                                    {/* Risk % */}
                                    <span className={`text-xs font-bold font-mono ${meta.riskPercent <= 0.5 ? 'text-green-400' : meta.riskPercent <= 0.8 ? 'text-yellow-400' : 'text-orange-400'}`}>
                                        {meta.riskPercent ? `${meta.riskPercent}%` : '—'}
                                    </span>

                                    {/* Session */}
                                    <span className={`text-[10px] font-bold uppercase ${meta.session === 'LONDON' ? 'text-blue-400' : 'text-purple-400'}`}>
                                        {meta.session === 'LONDON' ? '🇬🇧 LDN' : meta.session === 'NEW_YORK' ? '🇺🇸 NY' : '—'}
                                    </span>

                                    {/* Status */}
                                    <SignalStatusBadge signal={signal} />
                                </motion.div>
                            );
                        })}
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-center gap-2 py-4">
                            <button
                                disabled={currentPage === 1}
                                onClick={() => setCurrentPage(p => p - 1)}
                                className="px-3 py-1.5 rounded-lg text-xs font-bold dark:bg-white/5 light:bg-green-50 dark:text-gray-400 light:text-text-light-secondary disabled:opacity-30 dark:hover:bg-white/10 light:hover:bg-green-100 transition-colors"
                            >
                                ← Prev
                            </button>
                            <span className="text-xs dark:text-gray-500 light:text-text-light-secondary font-mono">
                                {currentPage} / {totalPages}
                            </span>
                            <button
                                disabled={currentPage === totalPages}
                                onClick={() => setCurrentPage(p => p + 1)}
                                className="px-3 py-1.5 rounded-lg text-xs font-bold dark:bg-white/5 light:bg-green-50 dark:text-gray-400 light:text-text-light-secondary disabled:opacity-30 dark:hover:bg-white/10 light:hover:bg-green-100 transition-colors"
                            >
                                Next →
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
