import React from 'react';
import { motion } from 'framer-motion';
import { staggerContainer } from '../utils/animations';

export const DailyRecap: React.FC = () => {
  return (
    <motion.div
      className="flex flex-col h-full"
      initial="initial"
      animate="animate"
      exit="exit"
      variants={staggerContainer}
    >
      {/* Header */}
      <div className="flex flex-col gap-6 px-8 pt-8 pb-4 shrink-0">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-xs font-medium dark:text-gray-500 light:text-text-light-secondary uppercase tracking-wider">
            <span className="dark:hover:text-white light:hover:text-text-dark cursor-pointer transition-colors">Daily Recap</span>
            <span className="material-symbols-outlined text-[10px]">chevron_right</span>
            <span className="text-primary drop-shadow-[0_0_5px_rgba(19,236,55,0.5)]">Daily Recap</span>
          </div>
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-black tracking-tight dark:text-white light:text-text-dark flex items-center gap-3">
              Daily Recap
              <span className="px-2 py-0.5 rounded text-[10px] font-bold dark:bg-white/5 light:bg-green-50 dark:border-white/10 light:border-green-300 border dark:text-gray-400 light:text-text-light-secondary uppercase tracking-wider align-middle">
                Coming Soon
              </span>
            </h1>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 min-h-0 px-8 pb-8 flex flex-col">
        <div className="glass-panel w-full h-full rounded-2xl p-8 md:p-12 flex flex-col items-center justify-center relative overflow-y-auto custom-scrollbar border dark:border-white/5 light:border-green-300">
          <motion.div 
            className="text-center space-y-4"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
          >
            <div className="w-20 h-20 mx-auto rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(19,236,55,0.2)]">
              <span className="material-symbols-outlined text-4xl text-primary">summarize</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-black dark:text-white light:text-text-dark tracking-tight drop-shadow-[0_0_20px_rgba(255,255,255,0.1)]">
              Daily Recap
            </h2>
            <p className="dark:text-gray-400 light:text-text-light-secondary text-lg max-w-2xl mx-auto">
              Review your daily trading performance, signals, and market insights.
            </p>
            <p className="dark:text-gray-500 light:text-text-light-secondary text-sm mt-4">
              This page will be implemented soon.
            </p>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
};
