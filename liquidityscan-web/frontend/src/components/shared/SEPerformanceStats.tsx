import { motion } from 'framer-motion';
import { Signal } from '../../types';

interface SEPerformanceStatsProps {
    signals: Signal[];
}

/**
 * SuperEngulfing Performance Stats Panel.
 * Shows WIN/LOSS/EXPIRED counts, Win Rate, Avg R:R, and Close Reasons breakdown.
 */
export function SEPerformanceStats({ signals }: SEPerformanceStatsProps) {
    // Filter only SE signals
    const seSignals = signals.filter(s => s.strategyType === 'SUPER_ENGULFING');

    const wins = seSignals.filter(s => s.lifecycleStatus === 'COMPLETED' && s.result === 'WIN');
    const losses = seSignals.filter(s => s.lifecycleStatus === 'COMPLETED' && s.result === 'LOSS');
    const expired = seSignals.filter(s => s.lifecycleStatus === 'EXPIRED');
    const active = seSignals.filter(s => s.lifecycleStatus === 'ACTIVE');
    const pending = seSignals.filter(s => s.lifecycleStatus === 'PENDING');

    const totalClosed = wins.length + losses.length + expired.length;
    const winRate = (wins.length + losses.length) > 0
        ? ((wins.length / (wins.length + losses.length)) * 100).toFixed(1)
        : '0.0';

    // Close reason breakdown
    const closeReasons = {
        TP2: seSignals.filter(s => s.se_close_reason === 'TP2').length,
        SL: seSignals.filter(s => s.se_close_reason === 'SL').length,
        OPPOSITE_REV: seSignals.filter(s => s.se_close_reason === 'OPPOSITE_REV').length,
        EXPIRED: seSignals.filter(s => s.se_close_reason === 'EXPIRED').length,
    };

    const pct = (n: number) => totalClosed > 0 ? ((n / totalClosed) * 100).toFixed(0) : '0';

    // Average PnL
    const avgWinPnl = wins.length > 0
        ? (wins.reduce((sum, s) => sum + (s.pnlPercent || 0), 0) / wins.length).toFixed(2)
        : '0.00';
    const avgLossPnl = losses.length > 0
        ? (losses.reduce((sum, s) => sum + (s.pnlPercent || 0), 0) / losses.length).toFixed(2)
        : '0.00';

    if (seSignals.length === 0) return null;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-panel rounded-2xl p-6"
        >
            {/* Header */}
            <div className="flex items-center gap-3 mb-5 pb-4 dark:border-b-white/5 light:border-b-green-200/30">
                <span className="material-symbols-outlined text-primary text-xl">analytics</span>
                <h3 className="text-sm font-black dark:text-white light:text-text-dark uppercase tracking-widest">
                    SuperEngulfing Performance
                </h3>
            </div>

            {/* Main Stats Grid */}
            <div className="grid grid-cols-5 gap-3 mb-5">
                {/* WIN */}
                <div className="flex flex-col items-center p-3 rounded-xl dark:bg-emerald-500/5 light:bg-emerald-50/50 border dark:border-emerald-500/10 light:border-emerald-200/30">
                    <span className="text-2xl font-black text-emerald-400 font-mono">{wins.length}</span>
                    <span className="text-[10px] font-bold text-emerald-400/80 uppercase tracking-wider">WIN</span>
                    <span className="text-[9px] dark:text-gray-500 light:text-slate-400">{pct(wins.length)}%</span>
                </div>

                {/* LOSS */}
                <div className="flex flex-col items-center p-3 rounded-xl dark:bg-red-500/5 light:bg-red-50/50 border dark:border-red-500/10 light:border-red-200/30">
                    <span className="text-2xl font-black text-red-400 font-mono">{losses.length}</span>
                    <span className="text-[10px] font-bold text-red-400/80 uppercase tracking-wider">LOSS</span>
                    <span className="text-[9px] dark:text-gray-500 light:text-slate-400">{pct(losses.length)}%</span>
                </div>

                {/* EXPIRED */}
                <div className="flex flex-col items-center p-3 rounded-xl dark:bg-gray-500/5 light:bg-gray-50/50 border dark:border-gray-500/10 light:border-gray-200/30">
                    <span className="text-2xl font-black dark:text-gray-400 light:text-slate-500 font-mono">{expired.length}</span>
                    <span className="text-[10px] font-bold dark:text-gray-500 light:text-slate-400 uppercase tracking-wider">EXPIRED</span>
                    <span className="text-[9px] dark:text-gray-500 light:text-slate-400">{pct(expired.length)}%</span>
                </div>

                {/* ACTIVE */}
                <div className="flex flex-col items-center p-3 rounded-xl dark:bg-primary/5 light:bg-green-50/50 border dark:border-primary/10 light:border-green-200/30">
                    <span className="text-2xl font-black text-primary font-mono">{active.length}</span>
                    <span className="text-[10px] font-bold text-primary/80 uppercase tracking-wider">ACTIVE</span>
                </div>

                {/* PENDING */}
                <div className="flex flex-col items-center p-3 rounded-xl dark:bg-amber-500/5 light:bg-amber-50/50 border dark:border-amber-500/10 light:border-amber-200/30">
                    <span className="text-2xl font-black text-amber-400 font-mono">{pending.length}</span>
                    <span className="text-[10px] font-bold text-amber-400/80 uppercase tracking-wider">PENDING</span>
                </div>
            </div>

            {/* Win Rate & Avg PnL */}
            <div className="grid grid-cols-3 gap-3 mb-5">
                <div className="glass-panel p-4 rounded-xl text-center">
                    <div className="text-3xl font-black text-primary font-mono drop-shadow-[0_0_10px_rgba(19,236,55,0.3)]">
                        {winRate}%
                    </div>
                    <div className="text-[10px] font-bold dark:text-gray-500 light:text-slate-400 uppercase tracking-wider mt-1">Win Rate</div>
                    <div className="text-[9px] dark:text-gray-600 light:text-slate-400">WIN/(WIN+LOSS)</div>
                </div>
                <div className="glass-panel p-4 rounded-xl text-center">
                    <div className="text-2xl font-black text-emerald-400 font-mono">+{avgWinPnl}%</div>
                    <div className="text-[10px] font-bold dark:text-gray-500 light:text-slate-400 uppercase tracking-wider mt-1">Avg Win</div>
                </div>
                <div className="glass-panel p-4 rounded-xl text-center">
                    <div className="text-2xl font-black text-red-400 font-mono">{avgLossPnl}%</div>
                    <div className="text-[10px] font-bold dark:text-gray-500 light:text-slate-400 uppercase tracking-wider mt-1">Avg Loss</div>
                </div>
            </div>

            {/* Close Reasons Breakdown */}
            <div className="dark:border-t-white/5 light:border-t-green-200/30 pt-4">
                <h4 className="text-[10px] font-bold dark:text-gray-500 light:text-slate-400 uppercase tracking-widest mb-3">Close Reasons</h4>
                <div className="flex flex-col gap-2">
                    {[
                        { label: 'TP2', count: closeReasons.TP2, color: 'bg-emerald-400', textColor: 'text-emerald-400' },
                        { label: 'SL', count: closeReasons.SL, color: 'bg-red-400', textColor: 'text-red-400' },
                        { label: 'OPP REV', count: closeReasons.OPPOSITE_REV, color: 'bg-blue-400', textColor: 'text-blue-400' },
                        { label: 'EXPIRED', count: closeReasons.EXPIRED, color: 'bg-gray-400', textColor: 'dark:text-gray-400 light:text-slate-500' },
                    ].map(({ label, count, color, textColor }) => (
                        <div key={label} className="flex items-center gap-3">
                            <span className={`text-[10px] font-bold ${textColor} w-16 text-right`}>{label}</span>
                            <div className="flex-1 h-2 dark:bg-white/5 light:bg-gray-100 rounded-full overflow-hidden">
                                <motion.div
                                    className={`h-full ${color} rounded-full`}
                                    initial={{ width: 0 }}
                                    animate={{ width: totalClosed > 0 ? `${(count / totalClosed) * 100}%` : '0%' }}
                                    transition={{ duration: 0.8, ease: 'easeOut' }}
                                />
                            </div>
                            <span className="text-xs font-mono dark:text-gray-400 light:text-slate-500 w-12 text-right">{count} <span className="text-[9px] opacity-60">({pct(count)}%)</span></span>
                        </div>
                    ))}
                </div>
            </div>
        </motion.div>
    );
}
