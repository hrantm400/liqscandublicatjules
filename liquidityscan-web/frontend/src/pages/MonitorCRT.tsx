import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Signal, Timeframe } from '../types';
import { fetchSignals } from '../services/signalsApi';
import { StaticMiniChart } from '../components/StaticMiniChart';
import { SignalStatusBadge } from '../components/shared/SignalStatusBadge';
import { PageHeader } from '../components/layout/PageHeader';
import { AnimatedCard } from '../components/animations/AnimatedCard';
import { fetchCandles } from '../services/candles';
import { useVolumeData } from '../hooks/useVolumeData';
import { VolumeFilterControls, VolumeBadge } from '../components/shared/VolumeFilter';

const TIMEFRAMES: Timeframe[] = ['4h', '1d', '1w'];

function CRTMiniChart({ signal, isLong }: { signal: Signal; isLong: boolean }) {
    const { data: candlesData } = useQuery({
        queryKey: ['candles', signal.symbol, signal.timeframe, 'crt-mini'],
        queryFn: () => fetchCandles(signal.symbol, signal.timeframe, 50),
        enabled: !!signal?.symbol && !!signal?.timeframe,
        staleTime: 300000,
    });

    return (
        <div className="h-32 w-full dark:bg-black/40 light:bg-gray-100 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent z-10 pointer-events-none" />
            <div className={`absolute inset-0 ${isLong
                ? 'bg-[radial-gradient(circle_at_50%_100%,rgba(19,236,55,0.08),transparent_70%)]'
                : 'bg-[radial-gradient(circle_at_50%_100%,rgba(239,68,68,0.08),transparent_70%)]'
                } pointer-events-none z-10`} />
            <StaticMiniChart candles={candlesData || []} isLong={isLong} height={128} />
        </div>
    );
}

function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleString(undefined, {
        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
}

function formatPrice(price: number | string) {
    const n = Number(price);
    if (n >= 1000) return n.toFixed(2);
    if (n >= 1) return n.toFixed(4);
    return n.toFixed(6);
}

export function MonitorCRT() {
    const [searchParams] = useSearchParams();
    const initialTf = searchParams.get('timeframe') as Timeframe | null;
    const [selectedTf, setSelectedTf] = useState<Timeframe | 'all'>(initialTf || 'all');
    const [dirFilter, setDirFilter] = useState<'all' | 'BUY' | 'SELL'>('all');
    const [viewMode, setViewMode] = useState<'cards' | 'list'>('cards');
    const [searchQuery, setSearchQuery] = useState('');
    const [showLowVolumes, setShowLowVolumes] = useState(true);
    const [volumeSort, setVolumeSort] = useState<'none' | 'high' | 'low'>('none');

    const { getVolume, isLowVolume, formatVolume } = useVolumeData();

    const { data: signals = [], isLoading } = useQuery({
        queryKey: ['signals', 'CRT'],
        queryFn: () => fetchSignals('CRT', 500),
        refetchInterval: 60000,
    });

    const filtered = useMemo(() => {
        let list = signals;
        if (selectedTf !== 'all') list = list.filter(s => s.timeframe === selectedTf);
        if (dirFilter !== 'all') list = list.filter(s => s.signalType === dirFilter);
        if (!showLowVolumes) list = list.filter(s => !isLowVolume(s.symbol));
        if (searchQuery.trim()) {
            const q = searchQuery.trim().toUpperCase();
            list = list.filter(s => s.symbol.includes(q));
        }
        // Sort
        let sorted = [...list];
        if (volumeSort === 'high') {
            sorted.sort((a, b) => getVolume(b.symbol) - getVolume(a.symbol));
        } else if (volumeSort === 'low') {
            sorted.sort((a, b) => getVolume(a.symbol) - getVolume(b.symbol));
        } else {
            sorted.sort((a, b) => new Date(b.detectedAt).getTime() - new Date(a.detectedAt).getTime());
        }
        return sorted;
    }, [signals, selectedTf, dirFilter, searchQuery, showLowVolumes, volumeSort, getVolume, isLowVolume]);

    const totalBull = signals.filter(s => s.signalType === 'BUY').length;
    const totalBear = signals.filter(s => s.signalType === 'SELL').length;

    return (
        <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
            {/* Header */}
            <PageHeader
                breadcrumbs={[
                    { label: 'Scanner', path: '/dashboard' },
                    { label: 'CRT — Candle Range Theory' },
                ]}
            />

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
                    className="glass-panel rounded-2xl p-5 text-center border dark:border-amber-500/10 light:border-amber-200 relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="text-3xl font-black text-amber-400 font-mono relative">{signals.length}</div>
                    <div className="text-[9px] dark:text-gray-500 light:text-gray-400 uppercase tracking-wider mt-1 relative">Total CRT</div>
                </motion.div>
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                    className="glass-panel rounded-2xl p-5 text-center border dark:border-green-500/10 light:border-green-200 relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="text-3xl font-black text-green-400 font-mono relative">{totalBull}</div>
                    <div className="text-[9px] dark:text-gray-500 light:text-gray-400 uppercase tracking-wider mt-1 relative">▲ Bullish</div>
                </motion.div>
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
                    className="glass-panel rounded-2xl p-5 text-center border dark:border-red-500/10 light:border-red-200 relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="text-3xl font-black text-red-400 font-mono relative">{totalBear}</div>
                    <div className="text-[9px] dark:text-gray-500 light:text-gray-400 uppercase tracking-wider mt-1 relative">▼ Bearish</div>
                </motion.div>
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                    className="glass-panel rounded-2xl p-5 text-center border dark:border-white/5 light:border-gray-200 relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="text-3xl font-black text-white font-mono relative">{filtered.length}</div>
                    <div className="text-[9px] dark:text-gray-500 light:text-gray-400 uppercase tracking-wider mt-1 relative">Filtered</div>
                </motion.div>
            </div>

            {/* Filters Row */}
            <div className="flex flex-wrap items-center gap-3">
                {/* Timeframe */}
                <div className="flex gap-1 p-1 rounded-xl dark:bg-white/5 light:bg-gray-100 border dark:border-white/5 light:border-gray-200">
                    {['all', ...TIMEFRAMES].map(tf => (
                        <button key={tf} onClick={() => setSelectedTf(tf as any)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${selectedTf === tf
                                ? 'bg-amber-500 text-black shadow-[0_0_10px_rgba(245,158,11,0.3)]'
                                : 'dark:text-gray-400 light:text-gray-500 hover:dark:text-white hover:light:text-black'
                                }`}>
                            {tf === 'all' ? 'ALL' : tf.toUpperCase()}
                        </button>
                    ))}
                </div>

                {/* Direction */}
                <div className="flex gap-1 p-1 rounded-xl dark:bg-white/5 light:bg-gray-100 border dark:border-white/5 light:border-gray-200">
                    {[
                        { key: 'all', label: 'ALL' },
                        { key: 'BUY', label: '▲ BULL' },
                        { key: 'SELL', label: '▼ BEAR' },
                    ].map(d => (
                        <button key={d.key} onClick={() => setDirFilter(d.key as any)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${dirFilter === d.key
                                ? 'bg-amber-500 text-black shadow-[0_0_10px_rgba(245,158,11,0.3)]'
                                : 'dark:text-gray-400 light:text-gray-500 hover:dark:text-white'
                                }`}>
                            {d.label}
                        </button>
                    ))}
                </div>

                {/* Volume filters */}
                <VolumeFilterControls
                    showLowVolumes={showLowVolumes}
                    onToggleLowVolumes={setShowLowVolumes}
                    volumeSort={volumeSort}
                    onVolumeSort={setVolumeSort}
                />

                {/* View toggle */}
                <div className="flex gap-1 p-1 rounded-xl dark:bg-white/5 light:bg-gray-100 border dark:border-white/5 light:border-gray-200 ml-auto">
                    <button onClick={() => setViewMode('cards')}
                        className={`px-2.5 py-1.5 rounded-lg transition-all ${viewMode === 'cards' ? 'bg-amber-500 text-black' : 'dark:text-gray-400'}`}>
                        <span className="material-symbols-outlined text-sm">grid_view</span>
                    </button>
                    <button onClick={() => setViewMode('list')}
                        className={`px-2.5 py-1.5 rounded-lg transition-all ${viewMode === 'list' ? 'bg-amber-500 text-black' : 'dark:text-gray-400'}`}>
                        <span className="material-symbols-outlined text-sm">view_list</span>
                    </button>
                </div>

                {/* Search */}
                <div className="flex items-center glass-input rounded-xl px-3 py-1.5 border dark:border-white/5 light:border-gray-200">
                    <span className="material-symbols-outlined text-sm dark:text-gray-500 mr-1.5">search</span>
                    <input
                        type="text"
                        placeholder="Search symbol..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="bg-transparent border-none text-xs dark:text-white light:text-text-dark focus:ring-0 w-28 p-0 placeholder:dark:text-gray-600"
                    />
                </div>
            </div>

            {/* Content */}
            {isLoading ? (
                <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500" />
                </div>
            ) : filtered.length === 0 ? (
                <div className="glass-panel rounded-2xl p-12 text-center border dark:border-white/5 light:border-gray-200">
                    <span className="material-symbols-outlined text-5xl dark:text-gray-700 light:text-gray-300 mb-4 block">target</span>
                    <p className="dark:text-gray-500 light:text-gray-400 font-medium">No CRT signals found</p>
                    <p className="text-xs dark:text-gray-600 light:text-gray-400 mt-1">CRT signals appear when institutional liquidity grabs are detected</p>
                </div>
            ) : viewMode === 'list' ? (
                /* ═══════ LIST VIEW ═══════ */
                <div className="glass-panel rounded-2xl overflow-hidden border dark:border-white/5 light:border-gray-200">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="dark:bg-white/[0.02] light:bg-gray-50 border-b dark:border-white/5 light:border-gray-200">
                                    <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider dark:text-gray-500 light:text-gray-400">Symbol</th>
                                    <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider dark:text-gray-500 light:text-gray-400">Direction</th>
                                    <th className="text-center px-4 py-3 text-[10px] font-bold uppercase tracking-wider dark:text-gray-500 light:text-gray-400">TF</th>
                                    <th className="text-right px-4 py-3 text-[10px] font-bold uppercase tracking-wider dark:text-gray-500 light:text-gray-400">Swept</th>
                                    <th className="text-right px-4 py-3 text-[10px] font-bold uppercase tracking-wider dark:text-gray-500 light:text-gray-400">Extreme</th>
                                    <th className="text-right px-4 py-3 text-[10px] font-bold uppercase tracking-wider dark:text-gray-500 light:text-gray-400">Price</th>
                                    <th className="text-right px-4 py-3 text-[10px] font-bold uppercase tracking-wider dark:text-gray-500 light:text-gray-400">24h Vol</th>
                                    <th className="text-center px-4 py-3 text-[10px] font-bold uppercase tracking-wider dark:text-gray-500 light:text-gray-400">Status</th>
                                    <th className="text-right px-4 py-3 text-[10px] font-bold uppercase tracking-wider dark:text-gray-500 light:text-gray-400">Detected</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map((signal) => {
                                    const isLong = signal.signalType === 'BUY';
                                    const meta = (signal as any).metadata || {};
                                    return (
                                        <Link key={signal.id} to={`/signals/${signal.id}`} className="contents">
                                            <tr className="border-b dark:border-white/[0.03] light:border-gray-100 hover:dark:bg-white/[0.03] hover:light:bg-green-50/50 transition-colors cursor-pointer group">
                                                <td className="px-4 py-3">
                                                    <span className="dark:text-white light:text-text-dark font-bold text-sm">{signal.symbol}</span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black ${isLong
                                                        ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                                                        : 'bg-red-500/10 text-red-400 border border-red-500/20'
                                                        }`}>
                                                        {isLong ? '▲ BULL' : '▼ BEAR'}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 text-[10px] font-bold border border-amber-500/20 font-mono">
                                                        {signal.timeframe.toUpperCase()}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-right font-mono text-xs dark:text-gray-300 light:text-gray-600">
                                                    {meta.swept_level ? formatPrice(meta.swept_level) : '—'}
                                                </td>
                                                <td className="px-4 py-3 text-right font-mono text-xs dark:text-gray-300 light:text-gray-600">
                                                    {meta.sweep_extreme ? formatPrice(meta.sweep_extreme) : '—'}
                                                </td>
                                                <td className="px-4 py-3 text-right font-mono text-xs font-bold dark:text-white light:text-text-dark">
                                                    ${formatPrice(signal.price)}
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <VolumeBadge volume={getVolume(signal.symbol)} formatVolume={formatVolume} isLow={isLowVolume(signal.symbol)} />
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <SignalStatusBadge signal={signal} />
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <span className="text-[10px] dark:text-gray-300 light:text-slate-600 font-mono">
                                                        {formatDate(signal.detectedAt)}
                                                    </span>
                                                </td>
                                            </tr>
                                        </Link>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                /* ═══════ CARD VIEW ═══════ */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filtered.map((signal) => {
                        const isLong = signal.signalType === 'BUY';
                        const meta = (signal as any).metadata || {};
                        const accentColor = isLong ? 'green' : 'red';

                        return (
                            <AnimatedCard key={signal.id}>
                                <Link to={`/signals/${signal.id}`}>
                                    <motion.div
                                        whileHover={{ y: -3, scale: 1.01 }}
                                        className={`glass-panel rounded-2xl overflow-hidden border dark:border-white/5 light:border-green-200 group cursor-pointer transition-all hover:dark:border-${accentColor}-500/20 hover:shadow-[0_0_30px_rgba(${isLong ? '19,236,55' : '239,68,68'},0.06)]`}
                                    >
                                        {/* Mini Chart */}
                                        <CRTMiniChart signal={signal} isLong={isLong} />

                                        <div className="p-4">
                                            {/* Header */}
                                            <div className="flex items-center justify-between mb-3">
                                                <div className="flex items-center gap-2.5">
                                                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${isLong ? 'bg-green-500/15 text-green-400 shadow-[0_0_12px_rgba(19,236,55,0.15)]' : 'bg-red-500/15 text-red-400 shadow-[0_0_12px_rgba(239,68,68,0.15)]'}`}>
                                                        <span className="material-symbols-outlined text-lg">
                                                            {isLong ? 'trending_up' : 'trending_down'}
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="dark:text-white light:text-text-dark font-black text-sm">{signal.symbol}</span>
                                                            <span className="px-1.5 py-0.5 rounded-md bg-amber-500/10 text-amber-400 text-[9px] font-bold border border-amber-500/20 font-mono">
                                                                {signal.timeframe.toUpperCase()}
                                                            </span>
                                                        </div>
                                                        <span className={`text-[10px] font-black ${isLong ? 'text-green-400' : 'text-red-400'}`}>
                                                            {isLong ? '▲ BULLISH CRT' : '▼ BEARISH CRT'}
                                                        </span>
                                                    </div>
                                                </div>
                                                <SignalStatusBadge signal={signal} />
                                            </div>

                                            {/* CRT Metadata */}
                                            <div className="grid grid-cols-2 gap-2">
                                                {[
                                                    { label: 'Swept Level', value: meta.swept_level, highlight: true },
                                                    { label: 'Sweep Extreme', value: meta.sweep_extreme, highlight: true },
                                                    { label: 'Prev High', value: meta.prev_high, highlight: false },
                                                    { label: 'Prev Low', value: meta.prev_low, highlight: false },
                                                ].map(item => (
                                                    <div key={item.label} className="rounded-xl dark:bg-white/[0.02] light:bg-gray-50 p-2.5 border dark:border-white/[0.04] light:border-gray-100">
                                                        <div className="text-[8px] dark:text-gray-600 light:text-gray-400 uppercase tracking-wider font-bold">{item.label}</div>
                                                        <div className={`text-xs font-bold font-mono mt-0.5 ${item.highlight ? 'dark:text-white light:text-text-dark' : 'dark:text-gray-400 light:text-gray-500'}`}>
                                                            {item.value ? formatPrice(item.value) : '—'}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>

                                            {/* Footer — Date + Price */}
                                            <div className="flex items-center justify-between mt-3 pt-2.5 border-t dark:border-white/5 light:border-gray-100">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="material-symbols-outlined text-[12px] dark:text-gray-600 light:text-gray-400">schedule</span>
                                                    <span className="text-[10px] dark:text-gray-500 light:text-gray-400 font-mono">
                                                        {formatDate(signal.detectedAt)}
                                                    </span>
                                                </div>
                                                <span className="text-[11px] font-black font-mono dark:text-gray-300 light:text-gray-500">
                                                    ${formatPrice(signal.price)}
                                                </span>
                                            </div>
                                        </div>
                                    </motion.div>
                                </Link>
                            </AnimatedCard>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
