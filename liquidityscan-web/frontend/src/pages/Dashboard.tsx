import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Timeframe } from '../types';
import { fetchSignals } from '../services/signalsApi';
import { staggerContainer, listItemVariants, scaleInVariants } from '../utils/animations';

interface StrategySummary {
  total: number;
  timeframes: Record<Timeframe, number>;
}

// Strategy-specific timeframes (as per Java bot and PineScript indicators)
const STRATEGY_TIMEFRAMES = {
  SUPER_ENGULFING: ['4h', '1d', '1w'] as Timeframe[],
  RSI_DIVERGENCE: ['1h', '4h', '1d'] as Timeframe[],
  ICT_BIAS: ['4h', '1d', '1w'] as Timeframe[]
};

export const Dashboard: React.FC = () => {
  const [expandedAccordions, setExpandedAccordions] = useState<Set<string>>(new Set());
  // Initialize with only relevant timeframes for each strategy
  const [superEngulfingSummary, setSuperEngulfingSummary] = useState<StrategySummary>({
    total: 0,
    timeframes: { '4h': 0, '1d': 0, '1w': 0 } as Record<Timeframe, number>
  });
  const [biasSummary, setBiasSummary] = useState<StrategySummary>({
    total: 0,
    timeframes: { '4h': 0, '1d': 0, '1w': 0 } as Record<Timeframe, number>
  });
  const [rsiSummary, setRsiSummary] = useState<StrategySummary>({
    total: 0,
    timeframes: { '1h': 0, '4h': 0, '1d': 0 } as Record<Timeframe, number>
  });

  // Super Engulfing: from GET /api/signals (webhook-fed); Bias/RSI: no source yet
  const { data: seData } = useQuery({
    queryKey: ['signals', 'SUPER_ENGULFING'],
    queryFn: () => fetchSignals('SUPER_ENGULFING', 1000),
    refetchInterval: 5 * 60 * 1000,
  });

  const { data: biasData } = useQuery({
    queryKey: ['signals', 'ICT_BIAS'],
    queryFn: () => Promise.resolve([]),
    refetchInterval: 5 * 60 * 1000,
  });

  const { data: rsiData } = useQuery({
    queryKey: ['signals', 'RSI_DIVERGENCE'],
    queryFn: () => Promise.resolve([]),
    refetchInterval: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (seData) {
      const signals = seData as any[];
      const summary: StrategySummary = {
        total: signals.length,
        timeframes: { '4h': 0, '1d': 0, '1w': 0 } as Record<Timeframe, number>,
      };
      signals.forEach((signal) => {
        const tf = signal.timeframe as Timeframe;
        // Only count signals from relevant timeframes (4h, 1d, 1w)
        if (STRATEGY_TIMEFRAMES.SUPER_ENGULFING.includes(tf) && summary.timeframes[tf] !== undefined) {
          summary.timeframes[tf]++;
        }
      });
      setSuperEngulfingSummary(summary);
    }
  }, [seData]);

  useEffect(() => {
    if (biasData) {
      const signals = biasData as any[];
      const summary: StrategySummary = {
        total: signals.length,
        timeframes: { '4h': 0, '1d': 0, '1w': 0 } as Record<Timeframe, number>,
      };
      signals.forEach((signal) => {
        const tf = signal.timeframe as Timeframe;
        // Only count signals from relevant timeframes (4h, 1d, 1w)
        if (STRATEGY_TIMEFRAMES.ICT_BIAS.includes(tf) && summary.timeframes[tf] !== undefined) {
          summary.timeframes[tf]++;
        }
      });
      setBiasSummary(summary);
    }
  }, [biasData]);

  useEffect(() => {
    if (rsiData) {
      const signals = rsiData as any[];
      const summary: StrategySummary = {
        total: signals.length,
        timeframes: { '1h': 0, '4h': 0, '1d': 0 } as Record<Timeframe, number>,
      };
      signals.forEach((signal) => {
        const tf = signal.timeframe as Timeframe;
        // Only count signals from relevant timeframes (1h, 4h, 1d)
        if (STRATEGY_TIMEFRAMES.RSI_DIVERGENCE.includes(tf) && summary.timeframes[tf] !== undefined) {
          summary.timeframes[tf]++;
        }
      });
      setRsiSummary(summary);
    }
  }, [rsiData]);

  const toggleAccordion = (targetId: string) => {
    setExpandedAccordions((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(targetId)) {
        newSet.delete(targetId);
      } else {
        // Close all others
        newSet.clear();
        newSet.add(targetId);
      }
      return newSet;
    });
  };

  const isExpanded = (targetId: string) => expandedAccordions.has(targetId);

  return (
    <motion.div
      className="flex flex-col h-full"
      variants={staggerContainer}
      initial="initial"
      animate="animate"
    >
      {/* Header */}
      <motion.header
        variants={listItemVariants}
        className="flex items-center justify-between px-8 py-6 shrink-0 z-20"
      >
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 text-xs font-medium text-primary/80 uppercase tracking-widest">
            <span className="w-2 h-2 bg-primary rounded-full animate-pulse shadow-glow"></span>
            System Online
          </div>
          <h1 className="text-3xl font-black tracking-tighter dark:text-white light:text-text-dark flex items-center gap-3 drop-shadow-lg">
            Monitor Overview
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center glass-input rounded-full px-4 py-2 transition-all cursor-pointer group border border-transparent focus-within:border-primary/50 focus-within:shadow-glow">
            <span className="material-symbols-outlined dark:text-gray-400 light:text-text-light-secondary mr-2 group-hover:text-primary transition-colors">search</span>
            <input className="bg-transparent border-none text-sm dark:text-white light:text-text-dark focus:ring-0 w-48 p-0 placeholder:dark:text-gray-600" placeholder="Quick Search..." type="text" />
            <span className="text-[10px] font-mono dark:text-gray-600 light:text-text-light-secondary dark:border-gray-700 light:border-green-300 rounded px-1.5 py-0.5 ml-2">/</span>
          </div>
          <button className="w-10 h-10 rounded-full dark:bg-white/5 light:bg-green-50 dark:border-white/10 light:border-green-300 flex items-center justify-center dark:text-gray-400 light:text-text-light-secondary hover:text-primary hover:bg-primary/10 hover:border-primary/30 transition-all border border-transparent shadow-glow-hover">
            <span className="material-symbols-outlined">notifications</span>
          </button>
        </div>
      </motion.header>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-8 pt-2">
        <div className="max-w-7xl mx-auto h-full flex flex-col pb-20">
          {/* Strategy Accordions */}
          <motion.div
            variants={staggerContainer}
            className="flex flex-col gap-4 relative isolate mb-16"
          >
            {/* SuperEngulfing */}
            <motion.div
              variants={listItemVariants}
              whileHover={{ scale: 1.005 }}
              className="glass-panel rounded-2xl relative z-30 overflow-hidden group/card"
            >
              <div
                className={`p-6 flex items-center justify-between cursor-pointer transition-all ${isExpanded('superEngulfing-content') ? 'accordion-header-expanded' : ''
                  }`}
                onClick={(e) => {
                  if (!(e.target as HTMLElement).closest('a')) {
                    toggleAccordion('superEngulfing-content');
                  }
                }}
              >
                <Link to="/monitor/superengulfing" className="flex items-center gap-4 group">
                  <div className="w-14 h-14 rounded-2xl bg-primary/5 border border-primary/20 flex items-center justify-center text-primary box-glow group-hover:bg-primary/10 transition-all duration-300">
                    <span className="material-symbols-outlined text-3xl group-hover:scale-110 transition-transform">bolt</span>
                  </div>
                  <div className="flex flex-col">
                    <h3 className="text-2xl font-bold dark:text-white light:text-text-dark group-hover:text-primary transition-colors tracking-tight">SuperEngulfing</h3>
                    <span className="text-xs dark:text-gray-400 light:text-text-light-secondary tracking-widest font-mono uppercase opacity-70">Strategy A-01 • Trend Following</span>
                  </div>
                </Link>
                <div className="flex items-center gap-4">
                  <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-[11px] font-bold border border-primary/20 animate-pulse shadow-glow">
                    {superEngulfingSummary.total} SIGNALS ACTIVE
                  </span>
                  <button
                    className="toggle-button w-8 h-8 flex items-center justify-center rounded-full dark:hover:bg-white/10 transition-all"
                    title="Toggle View"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleAccordion('superEngulfing-content');
                    }}
                  >
                    <span className={`material-symbols-outlined text-xl transition-transform duration-300 ${isExpanded('superEngulfing-content') ? 'rotate-180 text-primary' : 'text-gray-500'}`}>
                      expand_more
                    </span>
                  </button>
                </div>
              </div>
              <div
                className={`accordion-content ${isExpanded('superEngulfing-content') ? 'expanded' : ''}`}
                id="superEngulfing-content"
              >
                <div className="p-6 flex flex-col gap-3">
                  {['4h', '1d', '1w'].map((tf) => (
                    <Link
                      key={tf}
                      to={`/monitor/superengulfing?timeframe=${tf}`}
                      className="w-full flex justify-between items-center p-4 rounded-xl dark:border-white/5 light:border-green-300 dark:bg-white/[0.01] hover:bg-primary/5 hover:border-primary/20 transition-all cursor-pointer group/item relative overflow-hidden"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-0 group-hover/item:opacity-100 transition-opacity" />
                      <div className="flex items-center gap-4 relative z-10">
                        <span className="w-12 h-8 flex items-center justify-center rounded-md text-sm font-black bg-primary/10 text-primary border border-primary/20 font-mono group-hover/item:bg-primary group-hover/item:text-black transition-colors">
                          {tf.toUpperCase()}
                        </span>
                        <div className="flex flex-col">
                          <span className="text-sm font-medium dark:text-gray-300 group-hover/item:text-white transition-colors">
                            {tf === '4h' ? 'Mid-Term Trend' : tf === '1d' ? 'Daily Structure' : 'Macro View'}
                          </span>
                          <span className="text-[10px] text-gray-500 font-mono">
                            {tf === '4h' ? 'Intraday swings' : tf === '1d' ? 'Major market moves' : 'Long-term bias'}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 relative z-10">
                        <span className={`font-mono font-bold text-lg ${superEngulfingSummary.timeframes[tf as Timeframe] > 0 ? 'text-white text-glow' : 'text-gray-600'}`}>
                          {superEngulfingSummary.timeframes[tf as Timeframe]}
                        </span>
                        <span className="material-symbols-outlined text-sm dark:text-gray-600 mr-2 group-hover/item:translate-x-1 transition-transform text-primary">arrow_forward</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </motion.div>

            {/* Daily Bias */}
            <motion.div
              variants={listItemVariants}
              whileHover={{ scale: 1.005 }}
              className="glass-panel rounded-2xl relative z-20 overflow-hidden group/card"
            >
              <div
                className={`p-6 flex items-center justify-between cursor-pointer transition-all ${isExpanded('dailyBias-content') ? 'accordion-header-expanded' : ''
                  }`}
                onClick={(e) => {
                  if (!(e.target as HTMLElement).closest('a')) {
                    toggleAccordion('dailyBias-content');
                  }
                }}
              >
                <Link to="/monitor/bias" className="flex items-center gap-4 group">
                  <div className="w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.15)] group-hover:shadow-[0_0_30px_rgba(59,130,246,0.3)] group-hover:bg-blue-500/20 transition-all duration-300">
                    <span className="material-symbols-outlined text-3xl group-hover:scale-110 transition-transform">explore</span>
                  </div>
                  <div className="flex flex-col">
                    <h3 className="text-2xl font-bold dark:text-white light:text-text-dark group-hover:text-blue-500 transition-colors tracking-tight">Daily Bias</h3>
                    <span className="text-xs dark:text-gray-400 light:text-text-light-secondary tracking-widest font-mono uppercase opacity-70">Strategy B-04 • Market Direction</span>
                  </div>
                </Link>
                <div className="flex items-center gap-4">
                  <span className="px-3 py-1 rounded-full bg-blue-500/10 text-blue-500 text-[11px] font-bold border border-blue-500/20 animate-pulse">
                    {biasSummary.total} ACTIVE
                  </span>
                  <button
                    className="toggle-button w-8 h-8 flex items-center justify-center rounded-full dark:hover:bg-white/10 transition-all"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleAccordion('dailyBias-content');
                    }}
                  >
                    <span className={`material-symbols-outlined text-xl transition-transform duration-300 ${isExpanded('dailyBias-content') ? 'rotate-180 text-blue-500' : 'text-gray-500'}`}>expand_more</span>
                  </button>
                </div>
              </div>
              <div
                className={`accordion-content ${isExpanded('dailyBias-content') ? 'expanded' : ''}`}
                id="dailyBias-content"
              >
                <div className="p-6 flex flex-col gap-3">
                  {['4h', '1d', '1w'].map((tf) => (
                    <Link
                      key={tf}
                      to={`/monitor/bias?timeframe=${tf}`}
                      className="w-full flex justify-between items-center p-4 rounded-xl dark:border-white/5 light:border-green-300 dark:bg-white/[0.01] hover:bg-blue-500/5 hover:border-blue-500/20 transition-all cursor-pointer group/item relative overflow-hidden"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-transparent opacity-0 group-hover/item:opacity-100 transition-opacity" />
                      <div className="flex items-center gap-4 relative z-10">
                        <span className="w-12 h-8 flex items-center justify-center rounded-md text-sm font-black bg-blue-500/10 text-blue-500 border border-blue-500/20 font-mono group-hover/item:bg-blue-500 group-hover/item:text-white transition-colors">
                          {tf.toUpperCase()}
                        </span>
                        <div className="flex flex-col">
                          <span className="text-sm font-medium dark:text-gray-300 group-hover/item:text-white transition-colors">
                            {tf === '4h' ? 'Mid-Term Bias' : tf === '1d' ? 'Daily Bias' : 'Weekly Bias'}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 relative z-10">
                        <span className={`font-mono font-bold text-lg ${biasSummary.timeframes[tf as Timeframe] > 0 ? 'text-white' : 'text-gray-600'}`}>
                          {biasSummary.timeframes[tf as Timeframe]}
                        </span>
                        <span className="material-symbols-outlined text-sm dark:text-gray-600 mr-2 group-hover/item:translate-x-1 transition-transform text-blue-500">arrow_forward</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </motion.div>

            {/* RSI Divergence */}
            <motion.div
              variants={listItemVariants}
              whileHover={{ scale: 1.005 }}
              className="glass-panel rounded-2xl relative z-10 overflow-hidden group/card"
            >
              <div
                className={`p-6 flex items-center justify-between cursor-pointer transition-all ${isExpanded('rsiDivergence-content') ? 'accordion-header-expanded' : ''
                  }`}
                onClick={(e) => {
                  if (!(e.target as HTMLElement).closest('a')) {
                    toggleAccordion('rsiDivergence-content');
                  }
                }}
              >
                <Link to="/monitor/rsi" className="flex items-center gap-4 group">
                  <div className="w-14 h-14 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-500 shadow-[0_0_20px_rgba(168,85,247,0.15)] group-hover:shadow-[0_0_30px_rgba(168,85,247,0.3)] group-hover:bg-purple-500/20 transition-all duration-300">
                    <span className="material-symbols-outlined text-3xl group-hover:scale-110 transition-transform">show_chart</span>
                  </div>
                  <div className="flex flex-col">
                    <h3 className="text-2xl font-bold dark:text-white light:text-text-dark group-hover:text-purple-500 transition-colors tracking-tight">RSI Divergence</h3>
                    <span className="text-xs dark:text-gray-400 light:text-text-light-secondary tracking-widest font-mono uppercase opacity-70">Strategy C-12 • Momentum</span>
                  </div>
                </Link>
                <div className="flex items-center gap-4">
                  <span className="px-3 py-1 rounded-full bg-purple-500/10 text-purple-500 text-[11px] font-bold border border-purple-500/20 animate-pulse">
                    {rsiSummary.total} ACTIVE
                  </span>
                  <button
                    className="toggle-button w-8 h-8 flex items-center justify-center rounded-full dark:hover:bg-white/10 transition-all"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleAccordion('rsiDivergence-content');
                    }}
                  >
                    <span className={`material-symbols-outlined text-xl transition-transform duration-300 ${isExpanded('rsiDivergence-content') ? 'rotate-180 text-purple-500' : 'text-gray-500'}`}>expand_more</span>
                  </button>
                </div>
              </div>
              <div
                className={`accordion-content ${isExpanded('rsiDivergence-content') ? 'expanded' : ''}`}
                id="rsiDivergence-content"
              >
                <div className="p-6 flex flex-col gap-3">
                  {['1h', '4h', '1d'].map((tf) => (
                    <Link
                      key={tf}
                      to={`/monitor/rsi?timeframe=${tf}`}
                      className="w-full flex justify-between items-center p-4 rounded-xl dark:border-white/5 light:border-green-300 dark:bg-white/[0.01] hover:bg-purple-500/5 hover:border-purple-500/20 transition-all cursor-pointer group/item relative overflow-hidden"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 to-transparent opacity-0 group-hover/item:opacity-100 transition-opacity" />
                      <div className="flex items-center gap-4 relative z-10">
                        <span className="w-12 h-8 flex items-center justify-center rounded-md text-sm font-black bg-purple-500/10 text-purple-500 border border-purple-500/20 font-mono group-hover/item:bg-purple-500 group-hover/item:text-white transition-colors">
                          {tf.toUpperCase()}
                        </span>
                        <div className="flex flex-col">
                          <span className="text-sm font-medium dark:text-gray-300 group-hover/item:text-white transition-colors">
                            {tf === '1h' ? 'Hourly Scalping' : tf === '4h' ? 'Swing Setups' : 'Daily Structure'}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 relative z-10">
                        <span className={`font-mono font-bold text-lg ${rsiSummary.timeframes[tf as Timeframe] > 0 ? 'text-white' : 'text-gray-600'}`}>
                          {rsiSummary.timeframes[tf as Timeframe]}
                        </span>
                        <span className="material-symbols-outlined text-sm dark:text-gray-600 mr-2 group-hover/item:translate-x-1 transition-transform text-purple-500">arrow_forward</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </motion.div>
          </motion.div>

          <motion.div
            variants={listItemVariants}
            className="mt-8 flex justify-center opacity-30"
          >
            <span className="text-xs font-mono text-primary uppercase tracking-[0.5em] animate-pulse-slow">System Operational • V2.4.0</span>
          </motion.div>
        </div>
      </div>

    </motion.div>
  );
};
