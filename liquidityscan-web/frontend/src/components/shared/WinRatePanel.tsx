import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { fetchSignalStats, SignalStats } from '../../services/signalsApi';
import { StrategyType } from '../../types';

interface WinRatePanelProps {
    strategyType: StrategyType;
}

/**
 * Premium Win Rate statistics panel with animated progress ring.
 */
export function WinRatePanel({ strategyType }: WinRatePanelProps) {
    const { data: stats } = useQuery<SignalStats>({
        queryKey: ['signal-stats', strategyType],
        queryFn: () => fetchSignalStats(strategyType),
        refetchInterval: 30000,
        staleTime: 15000,
        placeholderData: (prev) => prev,
    });

    const winRate = stats?.winRate ?? 0;
    const closed = (stats?.won ?? 0) + (stats?.lost ?? 0);
    const circumference = 2 * Math.PI * 40; // radius = 40
    const dashOffset = circumference - (winRate / 100) * circumference;

    // Determine win rate color
    const winRateColor = winRate >= 60 ? 'text-emerald-400' : winRate >= 40 ? 'text-yellow-400' : 'text-red-400';
    const strokeColor = winRate >= 60 ? '#34d399' : winRate >= 40 ? '#facc15' : '#f87171';

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="w-64 shrink-0 rounded-xl dark:bg-[rgba(10,20,13,0.6)] light:bg-green-50 dark:border-white/10 light:border-green-300 border p-4 flex flex-col gap-4 self-start sticky top-12"
        >
            {/* Header */}
            <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider dark:text-gray-400 light:text-gray-500">
                    Performance
                </span>
                <span className="material-symbols-outlined text-sm dark:text-gray-500 light:text-gray-400 cursor-pointer hover:text-primary transition-colors">
                    bar_chart
                </span>
            </div>

            {/* Win Rate Ring */}
            <div className="flex flex-col items-center gap-2">
                <div className="relative w-24 h-24">
                    <svg className="w-24 h-24 -rotate-90" viewBox="0 0 96 96">
                        {/* Background ring */}
                        <circle
                            cx="48" cy="48" r="40"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="6"
                            className="dark:text-white/5 light:text-gray-200"
                        />
                        {/* Progress ring */}
                        <motion.circle
                            cx="48" cy="48" r="40"
                            fill="none"
                            stroke={strokeColor}
                            strokeWidth="6"
                            strokeLinecap="round"
                            strokeDasharray={circumference}
                            initial={{ strokeDashoffset: circumference }}
                            animate={{ strokeDashoffset: dashOffset }}
                            transition={{ duration: 1.5, ease: 'easeOut' }}
                            style={{ filter: `drop-shadow(0 0 6px ${strokeColor}40)` }}
                        />
                    </svg>
                    {/* Center text */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className={`text-2xl font-black ${winRateColor}`}>
                            {winRate}%
                        </span>
                        <span className="text-[9px] dark:text-gray-500 light:text-gray-400 font-medium uppercase tracking-wider">
                            Win Rate
                        </span>
                    </div>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col p-2.5 rounded-lg dark:bg-white/[0.03] light:bg-white/80 dark:border-white/5 light:border-green-200 border">
                    <span className="text-[9px] uppercase tracking-wider dark:text-gray-500 light:text-gray-400 font-bold">Avg Win</span>
                    <span className="text-sm font-black text-emerald-400">
                        +{stats?.avgWinPnl?.toFixed(1) ?? '0.0'}%
                    </span>
                </div>
                <div className="flex flex-col p-2.5 rounded-lg dark:bg-white/[0.03] light:bg-white/80 dark:border-white/5 light:border-green-200 border">
                    <span className="text-[9px] uppercase tracking-wider dark:text-gray-500 light:text-gray-400 font-bold">Avg Loss</span>
                    <span className="text-sm font-black text-red-400">
                        {stats?.avgLossPnl?.toFixed(1) ?? '0.0'}%
                    </span>
                </div>
                <div className="flex flex-col p-2.5 rounded-lg dark:bg-white/[0.03] light:bg-white/80 dark:border-white/5 light:border-green-200 border">
                    <span className="text-[9px] uppercase tracking-wider dark:text-gray-500 light:text-gray-400 font-bold">Won</span>
                    <span className="text-sm font-black text-emerald-400">
                        {stats?.won ?? 0}
                    </span>
                </div>
                <div className="flex flex-col p-2.5 rounded-lg dark:bg-white/[0.03] light:bg-white/80 dark:border-white/5 light:border-green-200 border">
                    <span className="text-[9px] uppercase tracking-wider dark:text-gray-500 light:text-gray-400 font-bold">Lost</span>
                    <span className="text-sm font-black text-red-400">
                        {stats?.lost ?? 0}
                    </span>
                </div>
            </div>

            {/* Bottom Stats */}
            <div className="flex flex-col gap-1.5 pt-2 border-t dark:border-white/5 light:border-green-200">
                <div className="flex justify-between items-center">
                    <span className="text-[10px] dark:text-gray-500 light:text-gray-400 font-medium">Total Closed</span>
                    <span className="text-xs font-bold dark:text-gray-300 light:text-gray-600">{closed}</span>
                </div>
                <div className="flex justify-between items-center">
                    <span className="text-[10px] dark:text-gray-500 light:text-gray-400 font-medium">Active</span>
                    <span className="text-xs font-bold text-primary">{stats?.active ?? 0}</span>
                </div>
                <div className="flex justify-between items-center">
                    <span className="text-[10px] dark:text-gray-500 light:text-gray-400 font-medium">Expired</span>
                    <span className="text-xs font-bold dark:text-gray-400 light:text-gray-500">{stats?.expired ?? 0}</span>
                </div>
            </div>
        </motion.div>
    );
}
