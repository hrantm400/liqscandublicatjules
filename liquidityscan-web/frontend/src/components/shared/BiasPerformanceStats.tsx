import { motion } from 'framer-motion';
import { useMemo } from 'react';
import { Signal } from '../../types';

interface BiasPerformanceStatsProps {
    signals: Signal[];
}

/**
 * ICT Bias Performance Stats Panel.
 * Shows WIN/FAILED counts and Win Rate broken down by timeframe.
 */
export function BiasPerformanceStats({ signals }: BiasPerformanceStatsProps) {
    const biasSignals = useMemo(() =>
        signals.filter(s => s.strategyType === 'ICT_BIAS'),
        [signals]
    );

    const stats = useMemo(() => {
        const timeframes = ['4h', '1d', '1w'];
        const result: { tf: string; label: string; wins: number; failed: number; winRate: string }[] = [];

        for (const tf of timeframes) {
            const tfSignals = biasSignals.filter(s => s.timeframe.toLowerCase() === tf);
            const wins = tfSignals.filter(s => s.bias_result === 'WIN').length;
            const failed = tfSignals.filter(s => s.bias_result === 'FAILED').length;
            const total = wins + failed;
            const winRate = total > 0 ? ((wins / total) * 100).toFixed(0) : '—';
            result.push({
                tf,
                label: tf === '4h' ? '4H' : tf === '1d' ? '1D' : '1W',
                wins,
                failed,
                winRate,
            });
        }

        return result;
    }, [biasSignals]);

    // Global stats
    const totalWins = stats.reduce((s, r) => s + r.wins, 0);
    const totalFailed = stats.reduce((s, r) => s + r.failed, 0);
    const totalValidated = totalWins + totalFailed;
    const globalWinRate = totalValidated > 0 ? ((totalWins / totalValidated) * 100).toFixed(1) : '—';

    const pending = biasSignals.filter(s => s.lifecycleStatus === 'PENDING').length;

    if (biasSignals.length === 0) return null;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-panel rounded-2xl p-6"
        >
            {/* Header */}
            <div className="flex items-center gap-3 mb-5">
                <span className="material-symbols-outlined text-primary text-xl">target</span>
                <h3 className="text-sm font-black dark:text-white light:text-text-dark uppercase tracking-widest">
                    Bias Scanner (Body Close)
                </h3>
            </div>

            {/* Global Win Rate */}
            <div className="text-center mb-5 p-4 glass-panel rounded-xl">
                <div className="text-4xl font-black text-primary font-mono drop-shadow-[0_0_12px_rgba(19,236,55,0.3)]">
                    {globalWinRate}%
                </div>
                <div className="text-[10px] font-bold dark:text-gray-500 light:text-slate-400 uppercase tracking-wider mt-1">
                    Overall Win Rate
                </div>
                <div className="text-[9px] dark:text-gray-600 light:text-slate-400 mt-0.5">
                    {totalWins}W / {totalFailed}F / {pending} pending
                </div>
            </div>

            {/* Win Rate by Timeframe */}
            <div className="flex flex-col gap-2">
                {stats.map(({ tf, label, wins, failed, winRate }) => {
                    const total = wins + failed;
                    const pct = total > 0 ? (wins / total) * 100 : 0;
                    return (
                        <div key={tf} className="flex items-center gap-3">
                            <span className="text-xs font-bold dark:text-gray-400 light:text-slate-500 w-8 text-right font-mono">{label}</span>
                            <div className="flex-1 h-3 dark:bg-white/5 light:bg-gray-100 rounded-full overflow-hidden relative">
                                <motion.div
                                    className="h-full bg-primary rounded-full"
                                    initial={{ width: 0 }}
                                    animate={{ width: `${pct}%` }}
                                    transition={{ duration: 0.8, ease: 'easeOut' }}
                                />
                            </div>
                            <span className="text-sm font-black font-mono w-12 text-right" style={{
                                color: pct >= 65 ? '#13ec37' : pct >= 50 ? '#f59e0b' : '#ff4444'
                            }}>
                                {winRate}%
                            </span>
                            <span className="text-[9px] dark:text-gray-500 light:text-slate-400 w-16 text-right">
                                {wins}W / {failed}F
                            </span>
                        </div>
                    );
                })}
            </div>
        </motion.div>
    );
}
