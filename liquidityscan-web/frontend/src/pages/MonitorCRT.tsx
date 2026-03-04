import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Signal, Timeframe } from '../types';
import { fetchSignals } from '../services/signalsApi';
import { StaticMiniChart } from '../components/StaticMiniChart';
import { SignalStatusBadge } from '../components/shared/SignalStatusBadge';
import { PageHeader } from '../components/layout/PageHeader';
import { AnimatedCard } from '../components/animations/AnimatedCard';
import { fetchCandles } from '../services/candles';
import { Link } from 'react-router-dom';

// Timeframes to display
const TIMEFRAMES: Timeframe[] = ['4h', '1d', '1w'];

// Mini chart for each signal card
function CRTMiniChart({ signal, isLong }: { signal: Signal; isLong: boolean }) {
    const { data: candlesData } = useQuery({
        queryKey: ['candles', signal.symbol, signal.timeframe, 'crt-mini'],
        queryFn: () => fetchCandles(signal.symbol, signal.timeframe, 50),
        enabled: !!signal?.symbol && !!signal?.timeframe,
        staleTime: 300000,
    });

    return (
        <div className="h-28 w-full dark:bg-black/40 light:bg-gray-100 relative dark:border-y-white/5 light:border-y-green-200/30 border-y overflow-hidden">
            <StaticMiniChart candles={candlesData || []} isLong={isLong} height={112} />
        </div>
    );
}

export function MonitorCRT() {
    const [selectedTf, setSelectedTf] = useState<Timeframe | 'all'>('all');
    const [dirFilter, setDirFilter] = useState<'all' | 'BUY' | 'SELL'>('all');

    // Fetch CRT signals
    const { data: signals = [], isLoading } = useQuery({
        queryKey: ['signals', 'CRT'],
        queryFn: () => fetchSignals('CRT', 500),
        refetchInterval: 60000,
    });

    // Filtered signals
    const filtered = useMemo(() => {
        let list = signals;
        if (selectedTf !== 'all') list = list.filter(s => s.timeframe === selectedTf);
        if (dirFilter !== 'all') list = list.filter(s => s.signalType === dirFilter);
        return list.sort((a, b) => new Date(b.detectedAt).getTime() - new Date(a.detectedAt).getTime());
    }, [signals, selectedTf, dirFilter]);

    // Stats
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

            {/* Stats Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="glass-panel rounded-xl p-4 text-center border dark:border-white/5 light:border-green-200">
                    <div className="text-2xl font-black text-primary font-mono">{signals.length}</div>
                    <div className="text-[9px] dark:text-gray-500 light:text-gray-400 uppercase tracking-wider mt-1">Total CRT</div>
                </div>
                <div className="glass-panel rounded-xl p-4 text-center border dark:border-white/5 light:border-green-200">
                    <div className="text-2xl font-black text-green-400 font-mono">{totalBull}</div>
                    <div className="text-[9px] dark:text-gray-500 light:text-gray-400 uppercase tracking-wider mt-1">Bullish</div>
                </div>
                <div className="glass-panel rounded-xl p-4 text-center border dark:border-white/5 light:border-green-200">
                    <div className="text-2xl font-black text-red-400 font-mono">{totalBear}</div>
                    <div className="text-[9px] dark:text-gray-500 light:text-gray-400 uppercase tracking-wider mt-1">Bearish</div>
                </div>
                <div className="glass-panel rounded-xl p-4 text-center border dark:border-white/5 light:border-green-200">
                    <div className="text-2xl font-black text-yellow-400 font-mono">{TIMEFRAMES.length}</div>
                    <div className="text-[9px] dark:text-gray-500 light:text-gray-400 uppercase tracking-wider mt-1">Timeframes</div>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-2">
                {/* Timeframe filter */}
                <div className="flex gap-1 p-1 rounded-xl dark:bg-white/5 light:bg-gray-100 border dark:border-white/5 light:border-gray-200">
                    {['all', ...TIMEFRAMES].map(tf => (
                        <button
                            key={tf}
                            onClick={() => setSelectedTf(tf as any)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${selectedTf === tf
                                ? 'bg-primary text-black shadow-[0_0_10px_rgba(19,236,55,0.3)]'
                                : 'dark:text-gray-400 light:text-gray-500 hover:dark:text-white hover:light:text-black'
                                }`}
                        >
                            {tf === 'all' ? 'ALL' : tf.toUpperCase()}
                        </button>
                    ))}
                </div>

                {/* Direction filter */}
                <div className="flex gap-1 p-1 rounded-xl dark:bg-white/5 light:bg-gray-100 border dark:border-white/5 light:border-gray-200">
                    {[
                        { key: 'all', label: 'ALL', color: '' },
                        { key: 'BUY', label: '▲ BULL', color: 'text-green-400' },
                        { key: 'SELL', label: '▼ BEAR', color: 'text-red-400' },
                    ].map(d => (
                        <button
                            key={d.key}
                            onClick={() => setDirFilter(d.key as any)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${dirFilter === d.key
                                ? 'bg-primary text-black shadow-[0_0_10px_rgba(19,236,55,0.3)]'
                                : `dark:text-gray-400 light:text-gray-500 hover:dark:text-white ${d.color}`
                                }`}
                        >
                            {d.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Signal Cards Grid */}
            {isLoading ? (
                <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                </div>
            ) : filtered.length === 0 ? (
                <div className="glass-panel rounded-2xl p-12 text-center border dark:border-white/5 light:border-gray-200">
                    <span className="material-symbols-outlined text-5xl dark:text-gray-700 light:text-gray-300 mb-4 block">search_off</span>
                    <p className="dark:text-gray-500 light:text-gray-400 font-medium">No CRT signals found</p>
                    <p className="text-xs dark:text-gray-600 light:text-gray-400 mt-1">CRT signals appear when institutional liquidity grabs are detected</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filtered.map((signal) => {
                        const isLong = signal.signalType === 'BUY';
                        const meta = (signal as any).metadata || {};
                        const sweptLevel = meta.swept_level;
                        const sweepExtreme = meta.sweep_extreme;
                        const prevHigh = meta.prev_high;
                        const prevLow = meta.prev_low;

                        return (
                            <AnimatedCard key={signal.id}>
                                <Link to={`/signals/${signal.id}`}>
                                    <motion.div
                                        whileHover={{ y: -2, scale: 1.01 }}
                                        className="glass-panel rounded-2xl overflow-hidden border dark:border-white/5 light:border-green-200 group cursor-pointer transition-all hover:dark:border-white/15 hover:light:border-green-400"
                                    >
                                        {/* Mini Chart */}
                                        <CRTMiniChart signal={signal} isLong={isLong} />

                                        {/* Header Row */}
                                        <div className="p-4 pb-2">
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-2.5">
                                                    {/* Direction Arrow */}
                                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isLong ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                                                        }`}>
                                                        <span className="material-symbols-outlined text-lg">
                                                            {isLong ? 'arrow_upward' : 'arrow_downward'}
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <span className="dark:text-white light:text-text-dark font-black text-sm">{signal.symbol}</span>
                                                        <div className="flex items-center gap-1.5 mt-0.5">
                                                            <span className="text-[10px] dark:text-gray-500 light:text-gray-400 font-mono">{signal.timeframe.toUpperCase()}</span>
                                                            <span className={`text-[10px] font-black ${isLong ? 'text-green-400' : 'text-red-400'}`}>
                                                                {isLong ? '▲ BULLISH CRT' : '▼ BEARISH CRT'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <SignalStatusBadge signal={signal} />
                                            </div>

                                            {/* CRT Details */}
                                            <div className="grid grid-cols-2 gap-2 mt-3">
                                                <div className="rounded-lg dark:bg-white/[0.03] light:bg-gray-50 p-2 border dark:border-white/5 light:border-gray-100">
                                                    <div className="text-[9px] dark:text-gray-600 light:text-gray-400 uppercase tracking-wider">Swept Level</div>
                                                    <div className="text-xs font-bold font-mono dark:text-white light:text-text-dark">
                                                        {sweptLevel ? Number(sweptLevel).toFixed(4) : '—'}
                                                    </div>
                                                </div>
                                                <div className="rounded-lg dark:bg-white/[0.03] light:bg-gray-50 p-2 border dark:border-white/5 light:border-gray-100">
                                                    <div className="text-[9px] dark:text-gray-600 light:text-gray-400 uppercase tracking-wider">Sweep Extreme</div>
                                                    <div className="text-xs font-bold font-mono dark:text-white light:text-text-dark">
                                                        {sweepExtreme ? Number(sweepExtreme).toFixed(4) : '—'}
                                                    </div>
                                                </div>
                                                <div className="rounded-lg dark:bg-white/[0.03] light:bg-gray-50 p-2 border dark:border-white/5 light:border-gray-100">
                                                    <div className="text-[9px] dark:text-gray-600 light:text-gray-400 uppercase tracking-wider">Prev High</div>
                                                    <div className="text-xs font-bold font-mono dark:text-gray-300 light:text-gray-600">
                                                        {prevHigh ? Number(prevHigh).toFixed(4) : '—'}
                                                    </div>
                                                </div>
                                                <div className="rounded-lg dark:bg-white/[0.03] light:bg-gray-50 p-2 border dark:border-white/5 light:border-gray-100">
                                                    <div className="text-[9px] dark:text-gray-600 light:text-gray-400 uppercase tracking-wider">Prev Low</div>
                                                    <div className="text-xs font-bold font-mono dark:text-gray-300 light:text-gray-600">
                                                        {prevLow ? Number(prevLow).toFixed(4) : '—'}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Footer */}
                                            <div className="flex items-center justify-between mt-3 pt-2 border-t dark:border-white/5 light:border-gray-100">
                                                <span className="text-[10px] dark:text-gray-600 light:text-gray-400 font-mono">
                                                    {new Date(signal.detectedAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                                <span className="text-[10px] font-bold font-mono dark:text-gray-400 light:text-gray-500">
                                                    ${Number(signal.price).toFixed(2)}
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
