import { useState, useMemo, useEffect } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
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
        'bg-cyan-500/20 text-cyan-500 ring-cyan-500/40',
        'bg-teal-500/20 text-teal-500 ring-teal-500/40',
        'bg-blue-500/20 text-blue-500 ring-blue-500/40',
        'bg-purple-500/20 text-purple-500 ring-purple-500/40',
        'bg-emerald-500/20 text-emerald-500 ring-emerald-500/40',
        'bg-pink-500/20 text-pink-500 ring-pink-500/40',
        'bg-orange-500/20 text-orange-500 ring-orange-500/40',
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

export function MonitorConfluence() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [directionFilter, setDirectionFilter] = useState<'all' | 'long' | 'short'>('all');
    const [selectedTimeframe, setSelectedTimeframe] = useState<string | null>(searchParams.get('timeframe') || null);
    const [pageSize] = useState(50);
    const [currentPage, setCurrentPage] = useState(1);

    // Sync selectedTimeframe with URL
    useEffect(() => {
        const tf = searchParams.get('timeframe');
        setSelectedTimeframe(tf || null);
    }, [searchParams]);

    // Fetch confluence signals
    const { signals, isLoading } = useMarketData({
        strategyType: 'CONFLUENCE',
        limit: 5000,
        refetchInterval: 60000,
    });

    // Apply filters
    const filteredSignals = useMemo(() => {
        let result = [...signals];

        // Search filter
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            result = result.filter(s =>
                s.symbol.toLowerCase().includes(q) ||
                (s as any).exchange?.toLowerCase().includes(q),
            );
        }

        // Timeframe filter
        if (selectedTimeframe) {
            result = result.filter(s => s.timeframe.toLowerCase() === selectedTimeframe.toLowerCase());
        }

        // Direction filter
        if (directionFilter === 'long') {
            result = result.filter(s => s.signalType === 'BUY');
        } else if (directionFilter === 'short') {
            result = result.filter(s => s.signalType === 'SELL');
        }

        // Status filter
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
    }, [signals, searchQuery, selectedTimeframe, directionFilter, statusFilter]);

    // Pagination
    const totalPages = Math.ceil(filteredSignals.length / pageSize);
    const paginatedSignals = filteredSignals.slice(
        (currentPage - 1) * pageSize,
        currentPage * pageSize,
    );

    // Timeframe counts for top cards
    const timeframeCounts = useMemo(() => {
        const counts: Record<string, number> = { '5m': 0, '15m': 0 };
        signals.forEach(s => {
            const tf = s.timeframe.toLowerCase();
            if (counts[tf] !== undefined) counts[tf]++;
        });
        return counts;
    }, [signals]);

    return (
        <div className="flex flex-col h-full">
            {/* Breadcrumb Header */}
            <div className="flex flex-col gap-6 px-8 pt-6 pb-2 shrink-0">
                <div className="flex items-center gap-2 text-xs font-medium dark:text-gray-500 light:text-text-light-secondary uppercase tracking-wider">
                    <Link to="/strategies" className="dark:hover:text-white light:hover:text-text-dark cursor-pointer transition-colors">Monitor</Link>
                    <span className="material-symbols-outlined text-[10px]">chevron_right</span>
                    <Link to="/strategies" className="dark:hover:text-white light:hover:text-text-dark cursor-pointer transition-colors">My Strategies</Link>
                    <span className="material-symbols-outlined text-[10px]">chevron_right</span>
                    <span className="text-cyan-400 drop-shadow-[0_0_5px_rgba(34,211,238,0.5)]">Strategy 9</span>
                    <span className="ml-2 dark:text-gray-600 light:text-slate-400">Last updated: <span className="dark:text-white light:text-text-dark">Just now</span></span>
                </div>
            </div>

            {/* Main Content Area (scrollable) */}
            <div className="flex-1 overflow-y-auto custom-scrollbar px-8 pb-8">
                <div className="max-w-[1800px] mx-auto flex flex-col gap-4">

                    {/* Timeframe Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {['5m', '15m'].map(tf => (
                            <motion.button
                                key={tf}
                                whileHover={{ scale: 1.01 }}
                                whileTap={{ scale: 0.99 }}
                                onClick={() => {
                                    setSelectedTimeframe(selectedTimeframe === tf ? null : tf);
                                    setCurrentPage(1);
                                }}
                                className={`glass-panel rounded-2xl p-6 flex items-center justify-between transition-all cursor-pointer group relative overflow-hidden ${selectedTimeframe === tf
                                    ? 'border-cyan-400/40 shadow-[0_0_20px_rgba(34,211,238,0.2)]'
                                    : 'dark:border-white/5 light:border-green-200 hover:border-cyan-400/20'
                                    }`}
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                <div className="flex flex-col gap-1 relative z-10">
                                    <span className="text-sm font-medium dark:text-gray-400 light:text-text-light-secondary">
                                        {tf.toUpperCase()} Timeframe
                                    </span>
                                    <div className="flex items-center gap-3">
                                        <span className="text-4xl font-black dark:text-white light:text-text-dark tracking-tight">
                                            {timeframeCounts[tf]}
                                        </span>
                                        <span className="text-xs dark:text-gray-500 light:text-text-light-secondary font-medium uppercase tracking-wider">
                                            Signals Detected
                                        </span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 relative z-10">
                                    <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${selectedTimeframe === tf
                                        ? 'bg-cyan-400/20 text-cyan-400 border border-cyan-400/40'
                                        : 'bg-cyan-400/10 text-cyan-400/60 border border-cyan-400/10'
                                        }`}>
                                        {selectedTimeframe === tf ? '● FILTERED' : '● ACTIVE'}
                                    </span>
                                </div>
                            </motion.button>
                        ))}
                    </div>

                    {/* Status Tabs */}
                    <StatusTabs
                        strategyType="CONFLUENCE"
                        activeStatus={statusFilter}
                        onStatusChange={(s) => { setStatusFilter(s); setCurrentPage(1); }}
                    />

                    {/* Filters Row */}
                    <div className="flex items-center gap-3 flex-wrap">
                        {/* Search */}
                        <div className="relative w-60 shrink-0">
                            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 dark:text-gray-500 light:text-slate-500 text-lg">search</span>
                            <input
                                className="w-full pl-10 pr-4 py-2.5 rounded-lg dark:bg-white/5 light:bg-green-50 dark:border-white/10 light:border-green-200 border dark:text-white light:text-text-dark text-sm dark:placeholder:dark:text-gray-600 light:text-slate-400 light:placeholder:dark:text-gray-400 light:text-slate-500 focus:border-cyan-400 focus:ring-cyan-400 focus:ring-1 transition-colors"
                                placeholder="Search..."
                                type="text"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                            />
                        </div>

                        {/* Direction Filter */}
                        <div className="flex items-center gap-2">
                            {(['all', 'long', 'short'] as const).map(dir => (
                                <button
                                    key={dir}
                                    onClick={() => { setDirectionFilter(dir); setCurrentPage(1); }}
                                    className={`px-4 py-2 rounded-lg font-bold text-xs uppercase tracking-wider transition-all ${directionFilter === dir
                                        ? dir === 'long'
                                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-400/40 shadow-[0_0_10px_rgba(16,185,129,0.2)]'
                                            : dir === 'short'
                                                ? 'bg-red-500/20 text-red-400 border border-red-400/40 shadow-[0_0_10px_rgba(239,68,68,0.2)]'
                                                : 'bg-cyan-400/20 text-cyan-400 border border-cyan-400/40 shadow-[0_0_10px_rgba(34,211,238,0.2)]'
                                        : 'dark:bg-white/5 light:bg-green-50 dark:border-white/10 light:border-green-200 border dark:text-gray-400 light:text-text-light-secondary hover:dark:text-white hover:light:text-text-dark'
                                        }`}
                                >
                                    {dir === 'all' ? '⚡ All' : dir === 'long' ? '↑ Long' : '↓ Short'}
                                </button>
                            ))}
                        </div>

                        {/* Timeframe quick filter */}
                        <div className="w-px h-6 dark:bg-white/10 light:bg-green-200 mx-1" />
                        <div className="flex items-center gap-1">
                            {[null, '5m', '15m'].map(tf => (
                                <button
                                    key={tf || 'all-tf'}
                                    onClick={() => { setSelectedTimeframe(tf); setCurrentPage(1); }}
                                    className={`px-3 py-1.5 rounded-md text-[11px] font-bold transition-all ${selectedTimeframe === tf
                                        ? 'bg-cyan-400/20 text-cyan-400 border border-cyan-400/30'
                                        : 'dark:text-gray-500 light:text-gray-400 hover:dark:text-white hover:light:text-text-dark'
                                        }`}
                                >
                                    {tf ? tf.toUpperCase() : 'ALL TF'}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Content: Table + Stats Panel */}
                    <div className="flex gap-4 min-h-0">
                        {/* Table */}
                        <div className="flex-1 rounded-xl table-glass-panel relative flex flex-col overflow-hidden">
                            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                                <div className="h-full overflow-y-auto custom-scrollbar">
                                    <table className="w-full text-sm text-left dark:text-gray-400 light:text-slate-500">
                                        <thead className="text-[11px] uppercase dark:text-gray-500 light:text-slate-500 font-bold sticky top-0 dark:bg-[#0a140d] light:bg-green-50 border-b dark:border-white/10 light:border-green-200 z-10 tracking-wider">
                                            <tr>
                                                <th className="px-4 py-3" scope="col">Symbol</th>
                                                <th className="px-4 py-3" scope="col">Exchange</th>
                                                <th className="px-4 py-3" scope="col">Direction</th>
                                                <th className="px-4 py-3" scope="col">Confluence</th>
                                                <th className="px-4 py-3" scope="col">Confidence</th>
                                                <th className="px-4 py-3" scope="col">TF</th>
                                                <th className="px-4 py-3" scope="col">Status</th>
                                                <th className="px-4 py-3 text-right" scope="col">Detected</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y dark:divide-white/5 light:divide-green-100 text-xs font-medium">
                                            {isLoading ? (
                                                <tr>
                                                    <td colSpan={8} className="text-center py-20">
                                                        <div className="flex flex-col items-center gap-3">
                                                            <div className="w-8 h-8 border-2 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin" />
                                                            <span className="dark:text-gray-500 light:text-slate-500 text-sm">Loading confluence signals...</span>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ) : paginatedSignals.length === 0 ? (
                                                <tr>
                                                    <td colSpan={8} className="text-center py-20">
                                                        <div className="flex flex-col items-center gap-3">
                                                            <span className="material-symbols-outlined text-4xl dark:text-gray-600 light:text-slate-400">search_off</span>
                                                            <span className="dark:text-gray-500 light:text-slate-500 text-sm">No confluence signals found</span>
                                                            <span className="dark:text-gray-600 light:text-slate-400 text-xs">Signals appear when all 3 conditions align simultaneously</span>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ) : (
                                                paginatedSignals.map((signal, idx) => {
                                                    const isLong = signal.signalType === 'BUY';
                                                    const meta = signal.metadata as any;
                                                    return (
                                                        <motion.tr
                                                            key={signal.id || idx}
                                                            variants={listItemVariants}
                                                            className="hover:dark:bg-white/5 hover:light:bg-green-50 transition-colors cursor-pointer group"
                                                            onClick={() => navigate(`/signals/${signal.id}`)}
                                                        >
                                                            {/* Symbol */}
                                                            <td className="px-4 py-2.5 font-bold dark:text-white light:text-text-dark whitespace-nowrap">
                                                                <div className="flex items-center gap-3">
                                                                    <SymbolAvatar symbol={signal.symbol} />
                                                                    <span className="text-sm">{signal.symbol}</span>
                                                                </div>
                                                            </td>

                                                            {/* Exchange */}
                                                            <td className="px-4 py-2.5 whitespace-nowrap dark:text-gray-400 light:text-text-light-secondary">
                                                                {(signal as any).exchange || 'Binance Perp'}
                                                            </td>

                                                            {/* Direction */}
                                                            <td className="px-4 py-2.5 whitespace-nowrap">
                                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider border ${isLong
                                                                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 shadow-[0_0_8px_rgba(16,185,129,0.15)]'
                                                                    : 'bg-red-500/10 text-red-400 border-red-500/30 shadow-[0_0_8px_rgba(239,68,68,0.15)]'
                                                                    }`}>
                                                                    <span className="material-symbols-outlined text-sm">
                                                                        {isLong ? 'arrow_upward' : 'arrow_downward'}
                                                                    </span>
                                                                    {isLong ? 'LONG' : 'SHORT'}
                                                                </span>
                                                            </td>

                                                            {/* Confluence Details */}
                                                            <td className="px-4 py-2.5">
                                                                <div className="flex flex-col gap-0.5">
                                                                    <span className="text-[11px] font-bold text-cyan-400 truncate max-w-[200px]">
                                                                        {meta?.label || 'SE+RSI+Trend'}
                                                                    </span>
                                                                    <div className="flex items-center gap-1.5">
                                                                        {/* HTF badge */}
                                                                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${meta?.htfCondition === 'SUPER_ENGULFING'
                                                                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                                                            : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                                                                            }`}>
                                                                            {meta?.htfCondition === 'SUPER_ENGULFING' ? 'SE' : 'BIAS'}
                                                                        </span>
                                                                        {/* RSI badge */}
                                                                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20">
                                                                            RSI {meta?.rsiValue ? Math.round(meta.rsiValue) : '-'}
                                                                        </span>
                                                                        {/* Trigger badge */}
                                                                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                                                            {meta?.triggerType === 'MSS' ? 'MSS' : 'TL Break'}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            </td>

                                                            {/* Confidence */}
                                                            <td className="px-4 py-2.5 text-center">
                                                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border uppercase ${meta?.confidence === 'HIGH'
                                                                    ? 'bg-cyan-400/10 border-cyan-400/20 text-cyan-400'
                                                                    : 'bg-white/5 border-white/10 dark:text-gray-400 light:text-slate-500'
                                                                    }`}>
                                                                    <span className="material-symbols-outlined text-sm">
                                                                        {meta?.confidence === 'HIGH' ? 'verified' : 'check_circle'}
                                                                    </span>
                                                                    {meta?.confidence || 'STANDARD'}
                                                                </span>
                                                            </td>

                                                            {/* Timeframe */}
                                                            <td className="px-4 py-2.5 text-center">
                                                                <span className="font-mono text-[11px] font-bold dark:text-white light:text-text-dark bg-cyan-400/10 px-2 py-0.5 rounded border border-cyan-400/20">
                                                                    {signal.timeframe?.toUpperCase()}
                                                                </span>
                                                            </td>

                                                            {/* Status */}
                                                            <td className="px-4 py-2.5">
                                                                <SignalStatusBadge signal={signal as any} />
                                                            </td>

                                                            {/* Detected */}
                                                            <td className="px-4 py-2.5 text-right font-mono dark:text-gray-400 light:text-text-light-secondary">
                                                                {formatTime(signal.detectedAt)}
                                                            </td>
                                                        </motion.tr>
                                                    );
                                                })
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Pagination */}
                            {totalPages > 1 && (
                                <div className="shrink-0 p-4 border-t dark:border-white/5 light:border-green-200 flex items-center justify-between">
                                    <div className="text-xs dark:text-gray-400 light:text-text-light-secondary">
                                        Showing <span className="font-medium dark:text-white light:text-text-dark">{(currentPage - 1) * pageSize + 1}</span> to{' '}
                                        <span className="font-medium dark:text-white light:text-text-dark">{Math.min(currentPage * pageSize, filteredSignals.length)}</span> of{' '}
                                        <span className="font-medium dark:text-white light:text-text-dark">{filteredSignals.length}</span> results
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                            disabled={currentPage === 1}
                                            className="pagination-btn flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            <span className="material-symbols-outlined text-base">chevron_left</span>
                                            Previous
                                        </button>
                                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                            let pageNum;
                                            if (totalPages <= 5) pageNum = i + 1;
                                            else if (currentPage <= 3) pageNum = i + 1;
                                            else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
                                            else pageNum = currentPage - 2 + i;
                                            return (
                                                <button
                                                    key={pageNum}
                                                    onClick={() => setCurrentPage(pageNum)}
                                                    className={`pagination-number ${currentPage === pageNum ? 'active' : ''}`}
                                                >
                                                    {pageNum}
                                                </button>
                                            );
                                        })}
                                        <button
                                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                            disabled={currentPage === totalPages}
                                            className="pagination-btn flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            Next
                                            <span className="material-symbols-outlined text-base">chevron_right</span>
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Stats Panel */}
                        <WinRatePanel strategyType="CONFLUENCE" />
                    </div>
                </div>
            </div>
        </div>
    );
}
