import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { staggerContainer, listItemVariants, scaleInVariants } from '../utils/animations';

export const RiskCalculator: React.FC = () => {
  const [risk, setRisk] = useState(1.0);

  return (
    <motion.div
      className="flex gap-6 lg:gap-8 overflow-hidden h-full p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto w-full"
      initial="initial"
      animate="animate"
      exit="exit"
      variants={staggerContainer}
    >
      {/* Left Sidebar: Feed (Dimmed) */}
      <motion.aside 
        className="hidden lg:flex flex-col w-[320px] shrink-0 gap-4 opacity-40 hover:opacity-100 transition-opacity duration-300 overflow-y-auto pr-2 pb-20 custom-scrollbar"
        variants={staggerContainer}
      >
        <motion.h3 variants={listItemVariants} className="text-sm font-medium dark:text-white/50 light:text-text-light-secondary uppercase tracking-wider px-2">Live Signals</motion.h3>
        {/* Card 1 */}
        <motion.div variants={listItemVariants} whileHover={{ scale: 1.02 }} className="p-4 rounded-xl border dark:border-white/5 light:border-green-300 dark:bg-surface-dark/40 light:bg-green-50 dark:hover:bg-surface-dark/60 light:hover:bg-green-100 transition-colors cursor-pointer group">
          <div className="flex justify-between items-start mb-2">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-orange-500/20 rounded-full flex items-center justify-center text-orange-400 text-xs font-bold">₿</div>
              <span className="font-bold text-sm dark:text-white light:text-text-dark">BTC/USDT</span>
            </div>
            <span className="text-[10px] bg-red-500/20 text-red-400 px-2 py-0.5 rounded border border-red-500/20">SHORT</span>
          </div>
          <div className="flex justify-between items-end">
            <div>
              <p className="text-xs dark:text-white/40 light:text-text-light-secondary mb-0.5">Pattern</p>
              <p className="text-sm font-medium dark:text-white/80 light:text-text-dark">Bearish Engulfing</p>
            </div>
            <span className="text-xs dark:text-white/30 light:text-text-light-secondary">2m ago</span>
          </div>
        </motion.div>
        {/* Card 2 */}
        <motion.div variants={listItemVariants} whileHover={{ scale: 1.02 }} className="p-4 rounded-xl border dark:border-white/5 light:border-green-300 dark:bg-surface-dark/40 light:bg-green-50 dark:hover:bg-surface-dark/60 light:hover:bg-green-100 transition-colors cursor-pointer">
          <div className="flex justify-between items-start mb-2">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-blue-500/20 rounded-full flex items-center justify-center text-blue-400 text-xs font-bold">Ξ</div>
              <span className="font-bold text-sm dark:text-white light:text-text-dark">ETH/USDT</span>
            </div>
            <span className="text-[10px] bg-green-500/20 text-green-400 px-2 py-0.5 rounded border border-green-500/20">LONG</span>
          </div>
          <div className="flex justify-between items-end">
            <div>
              <p className="text-xs dark:text-white/40 light:text-text-light-secondary mb-0.5">Pattern</p>
              <p className="text-sm font-medium dark:text-white/80 light:text-text-dark">Golden Cross</p>
            </div>
            <span className="text-xs dark:text-white/30 light:text-text-light-secondary">5m ago</span>
          </div>
        </motion.div>
        {/* Card 3 */}
        <motion.div variants={listItemVariants} whileHover={{ scale: 1.02 }} className="p-4 rounded-xl border dark:border-white/5 light:border-green-300 dark:bg-surface-dark/40 light:bg-green-50 dark:hover:bg-surface-dark/60 light:hover:bg-green-100 transition-colors cursor-pointer">
          <div className="flex justify-between items-start mb-2">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-indigo-500/20 rounded-full flex items-center justify-center text-indigo-400 text-xs font-bold">S</div>
              <span className="font-bold text-sm dark:text-white light:text-text-dark">SOL/USDT</span>
            </div>
            <span className="text-[10px] bg-green-500/20 text-green-400 px-2 py-0.5 rounded border border-green-500/20">LONG</span>
          </div>
          <div className="flex justify-between items-end">
            <div>
              <p className="text-xs dark:text-white/40 light:text-text-light-secondary mb-0.5">Pattern</p>
              <p className="text-sm font-medium dark:text-white/80 light:text-text-dark">Rejection Block</p>
            </div>
            <span className="text-xs dark:text-white/30 light:text-text-light-secondary">12m ago</span>
          </div>
        </motion.div>
      </motion.aside>

      {/* Center Stage: Expanded Signal Card & Calculator */}
      <div className="flex-1 flex flex-col h-full pb-20 overflow-y-auto custom-scrollbar">
        <div className="w-full">
          {/* Breadcrumbs/Status */}
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex items-center gap-2 mb-6 text-sm"
          >
            <span className="dark:text-white/40 light:text-text-light-secondary">Feed</span>
            <span className="material-symbols-outlined text-[12px] dark:text-white/20 light:text-green-300">arrow_forward_ios</span>
            <span className="dark:text-white/40 light:text-text-light-secondary">Bitcoin</span>
            <span className="material-symbols-outlined text-[12px] dark:text-white/20 light:text-green-300">arrow_forward_ios</span>
            <span className="text-primary">Calculator</span>
          </motion.div>

          {/* The Glass Card */}
          <motion.div 
            variants={scaleInVariants}
            className="glass-panel rounded-2xl p-0 overflow-hidden ring-1 dark:ring-white/10 light:ring-green-300 shadow-2xl relative"
          >
            {/* Decorative Top Line */}
            <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-primary/50 to-transparent"></div>

            {/* Header Section */}
            <div className="p-6 md:p-8 border-b dark:border-white/5 light:border-green-300">
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                <div>
                  <div className="flex items-center gap-4 mb-3">
                    <div className="flex -space-x-2">
                      <div className="w-10 h-10 rounded-full border-2 border-[#112214] bg-white flex items-center justify-center text-black font-bold text-xs">₿</div>
                      <div className="w-10 h-10 rounded-full border-2 border-[#112214] bg-green-500 flex items-center justify-center text-white font-bold text-xs">T</div>
                    </div>
                    <h1 className="text-3xl font-bold dark:text-white light:text-text-dark tracking-tight">BTC/USDT</h1>
                    <div className="dark:bg-red-500/10 light:bg-red-100 border dark:border-red-500/20 light:border-red-200 text-red-400 px-3 py-1 rounded-full text-sm font-bold flex items-center gap-1">
                      <span className="material-symbols-outlined text-[16px]">trending_down</span>
                      SHORT
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 items-center">
                    <span className="dark:text-white/60 light:text-text-light-secondary text-lg font-medium mr-2">SuperEngulfing</span>
                    <span className="bg-surface-border px-3 py-1 rounded-md text-xs font-medium dark:text-white/80 light:text-text-light-secondary border dark:border-white/5 light:border-green-300">15m Timeframe</span>
                    <span className="bg-surface-border px-3 py-1 rounded-md text-xs font-medium dark:text-white/80 light:text-text-light-secondary border dark:border-white/5 light:border-green-300">Daily Bias: Bearish</span>
                  </div>
                </div>
                <div className="flex flex-col items-end">
                  <p className="text-sm dark:text-white/40 light:text-text-light-secondary font-mono mb-1">Current Price</p>
                  <div className="text-2xl font-mono font-bold dark:text-white light:text-text-dark tracking-wider flex items-center gap-2">
                    64,150.50
                    <span className="text-xs text-red-400 flex items-center dark:bg-red-500/10 light:bg-red-100 px-1.5 py-0.5 rounded">
                      -1.2%
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Calculator Body */}
            <div className="p-6 md:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Input Column */}
              <div className="lg:col-span-7 flex flex-col gap-6">
                <h3 className="text-lg font-semibold dark:text-white light:text-text-dark flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-[20px]">calculate</span>
                  Position Calculator
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Balance */}
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium dark:text-white/60 light:text-text-light-secondary">Account Balance (USDT)</label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="dark:text-white/40 light:text-text-light-secondary">$</span>
                      </div>
                      <input className="glass-input w-full rounded-lg py-3 pl-8 pr-4 dark:text-white light:text-text-dark font-mono dark:placeholder-white/20 light:placeholder-gray-400 focus:ring-0 transition-all" type="text" defaultValue="10,000" />
                    </div>
                  </div>
                  {/* Risk Amount */}
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium dark:text-white/60 light:text-text-light-secondary flex justify-between">
                      Risk Amount
                      <span className="dark:text-white/40 light:text-text-light-secondary text-xs">(${(10000 * risk / 100).toFixed(2)})</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="dark:text-white/40 light:text-text-light-secondary">%</span>
                      </div>
                      <input className="glass-input w-full rounded-lg py-3 pl-8 pr-4 dark:text-white light:text-text-dark font-mono dark:placeholder-white/20 light:placeholder-gray-400 focus:ring-0 transition-all" type="text" value={risk} readOnly />
                    </div>
                  </div>
                </div>

                {/* Risk Slider */}
                <div className="bg-surface-border/30 rounded-lg p-4 border dark:border-white/5 light:border-green-300">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-xs font-semibold uppercase tracking-wider dark:text-white/50 light:text-text-light-secondary">Adjust Risk</span>
                    <span className="text-sm font-bold text-primary font-mono">{risk}%</span>
                  </div>
                  <input
                    className="w-full h-1.5 dark:bg-surface-dark light:bg-green-200 rounded-lg appearance-none cursor-pointer accent-primary hover:accent-primary-dim transition-all"
                    max="5.0"
                    min="0.1"
                    step="0.1"
                    type="range"
                    value={risk}
                    onChange={(e) => setRisk(parseFloat(e.target.value))}
                  />
                  <div className="flex justify-between mt-2 text-[10px] dark:text-white/30 light:text-text-light-secondary font-mono">
                    <span>0.1%</span>
                    <span>2.5%</span>
                    <span>5.0%</span>
                  </div>
                </div>

                <div className="h-px dark:bg-white/10 light:bg-green-300 w-full"></div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Entry Price */}
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium dark:text-white/60 light:text-text-light-secondary">Entry Price</label>
                    <div className="relative">
                      <input className="glass-input w-full rounded-lg py-3 px-4 dark:text-white light:text-text-dark font-mono dark:placeholder-white/20 light:placeholder-gray-400 focus:ring-0 transition-all" type="text" defaultValue="64,200.00" />
                    </div>
                  </div>
                  {/* Stop Loss */}
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium dark:text-white/60 light:text-text-light-secondary flex justify-between">
                      Stop Loss
                      <span className="text-xs text-green-400 flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]">check_circle</span>
                        Valid (&gt; Entry)
                      </span>
                    </label>
                    <div className="relative">
                      <input className="glass-input w-full rounded-lg py-3 px-4 dark:text-white light:text-text-dark font-mono dark:placeholder-white/20 light:placeholder-gray-400 focus:ring-0 transition-all !border-green-500/30 dark:bg-green-900/10 light:bg-green-50" type="text" defaultValue="64,800.00" />
                    </div>
                    <p className="text-[10px] dark:text-white/40 light:text-text-light-secondary">Distance: 0.93%</p>
                  </div>
                </div>
              </div>

              {/* Results Column */}
              <div className="lg:col-span-5 flex flex-col justify-between gap-6">
                <div className="flex flex-col gap-4 h-full">
                  {/* Primary Result Card */}
                  <motion.div 
                    whileHover={{ scale: 1.02 }}
                    className="bg-gradient-to-br from-[#234829] to-[#112214] border border-[#32673b] rounded-xl p-6 shadow-inner relative overflow-hidden group"
                  >
                    <div className="absolute -right-10 -top-10 w-40 h-40 bg-primary/10 rounded-full blur-[50px] group-hover:bg-primary/20 transition-all duration-700"></div>
                    <p className="text-sm text-[#92c99b] font-medium mb-1 uppercase tracking-wider">Position Size</p>
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className="text-4xl font-bold text-white font-mono tracking-tighter">{(0.166 * risk).toFixed(3)}</span>
                      <span className="text-xl text-white/50 font-medium">BTC</span>
                    </div>
                    <p className="text-lg text-white/70 font-mono mb-6">≈ ${(10657.20 * risk).toLocaleString()} USDT</p>
                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/10">
                      <div>
                        <p className="text-xs text-[#92c99b]/70 mb-1">Margin Required (10x)</p>
                        <p className="text-lg font-mono text-white">${(1065.72 * risk).toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-xs text-[#92c99b]/70 mb-1">Risk / Reward</p>
                        <p className="text-lg font-mono text-white">1 : 3.5</p>
                      </div>
                    </div>
                  </motion.div>
                  {/* Quick Stats */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="dark:bg-surface-dark/40 light:bg-green-50 border dark:border-white/5 light:border-green-300 p-3 rounded-lg">
                      <p className="text-[10px] dark:text-white/40 light:text-text-light-secondary uppercase">Take Profit 1</p>
                      <p className="text-sm font-mono text-green-400">62,400.00</p>
                    </div>
                    <div className="dark:bg-surface-dark/40 light:bg-green-50 border dark:border-white/5 light:border-green-300 p-3 rounded-lg">
                      <p className="text-[10px] dark:text-white/40 light:text-text-light-secondary uppercase">Take Profit 2</p>
                      <p className="text-sm font-mono text-green-400">60,500.00</p>
                    </div>
                  </div>
                </div>
                {/* Action Button */}
                <motion.button 
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full bg-primary hover:bg-primary-dim text-[#0b140d] font-bold text-lg py-4 rounded-xl shadow-[0_0_20px_rgba(19,236,55,0.3)] hover:shadow-[0_0_30px_rgba(19,236,55,0.5)] transition-all flex items-center justify-center gap-2 group"
                >
                  <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">bolt</span>
                  Execute Trade
                </motion.button>
              </div>
            </div>

            {/* Footer Info */}
            <div className="px-8 py-4 dark:bg-surface-dark/80 light:bg-green-50 border-t dark:border-white/5 light:border-green-300 flex justify-between items-center text-xs dark:text-white/30 light:text-text-light-secondary">
              <div className="flex gap-4">
                <span>Leverage: Cross 20x</span>
                <span>Fees: Maker 0.02%</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                Live Data
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
};
