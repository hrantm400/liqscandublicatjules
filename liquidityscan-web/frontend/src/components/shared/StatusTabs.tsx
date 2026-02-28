import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { fetchSignalStats, SignalStats } from '../../services/signalsApi';
import { StrategyType } from '../../types';

interface StatusTabsProps {
    strategyType: StrategyType;
    activeStatus: string;
    onStatusChange: (status: string) => void;
}

/**
 * Premium status tabs showing Active / Won / Lost / Expired counts.
 * Fetches stats from backend lifecycle service.
 */
export function StatusTabs({ strategyType, activeStatus, onStatusChange }: StatusTabsProps) {
    const { data: stats } = useQuery<SignalStats>({
        queryKey: ['signal-stats', strategyType],
        queryFn: () => fetchSignalStats(strategyType),
        refetchInterval: 30000,
        staleTime: 15000,
    });

    const tabs = [
        {
            key: 'all',
            label: 'All',
            count: stats?.total ?? 0,
            icon: 'select_all',
            color: 'text-white',
            bgActive: 'dark:bg-white/10 light:bg-green-100',
            glow: '',
        },
        {
            key: 'active',
            label: 'Active',
            count: stats?.active ?? 0,
            icon: 'radio_button_checked',
            color: 'text-primary',
            bgActive: 'dark:bg-primary/15 light:bg-green-100',
            glow: 'shadow-[0_0_15px_rgba(19,236,55,0.2)]',
        },
        {
            key: 'won',
            label: 'Won',
            count: stats?.won ?? 0,
            icon: 'check_circle',
            color: 'text-emerald-400',
            bgActive: 'dark:bg-emerald-500/15 light:bg-emerald-100',
            glow: 'shadow-[0_0_15px_rgba(16,185,129,0.2)]',
        },
        {
            key: 'lost',
            label: 'Lost',
            count: stats?.lost ?? 0,
            icon: 'cancel',
            color: 'text-red-400',
            bgActive: 'dark:bg-red-500/15 light:bg-red-100',
            glow: 'shadow-[0_0_15px_rgba(239,68,68,0.2)]',
        },
        {
            key: 'expired',
            label: 'Expired',
            count: stats?.expired ?? 0,
            icon: 'schedule',
            color: 'text-gray-400',
            bgActive: 'dark:bg-gray-500/15 light:bg-gray-100',
            glow: '',
        },
        {
            key: 'closed',
            label: 'Closed',
            count: (stats?.won ?? 0) + (stats?.lost ?? 0) + (stats?.expired ?? 0),
            icon: 'inventory_2',
            color: 'text-amber-400',
            bgActive: 'dark:bg-amber-500/15 light:bg-amber-100',
            glow: 'shadow-[0_0_15px_rgba(245,158,11,0.2)]',
        },
    ];

    return (
        <div className="flex items-center gap-1.5 p-1 rounded-xl dark:bg-white/[0.03] light:bg-green-50/50 dark:border-white/5 light:border-green-200 border">
            {tabs.map((tab) => {
                const isActive = activeStatus === tab.key;
                return (
                    <motion.button
                        key={tab.key}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => onStatusChange(tab.key)}
                        className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${isActive
                            ? `${tab.bgActive} ${tab.color} ${tab.glow} border dark:border-white/10 light:border-green-300`
                            : 'dark:text-gray-500 light:text-gray-400 hover:dark:text-gray-300 hover:light:text-gray-600 dark:hover:bg-white/5 light:hover:bg-green-50'
                            }`}
                    >
                        <span className={`material-symbols-outlined text-sm ${isActive ? tab.color : ''}`}>
                            {tab.icon}
                        </span>
                        <span>{tab.label}</span>
                        <span
                            className={`min-w-[20px] h-5 flex items-center justify-center px-1.5 rounded-full text-[10px] font-black ${isActive
                                ? `${tab.color} dark:bg-black/20 light:bg-white/80`
                                : 'dark:text-gray-600 light:text-gray-400 dark:bg-white/5 light:bg-gray-100'
                                }`}
                        >
                            {tab.count}
                        </span>
                    </motion.button>
                );
            })}
        </div>
    );
}
