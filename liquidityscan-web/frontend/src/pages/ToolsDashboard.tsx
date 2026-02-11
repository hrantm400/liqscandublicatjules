import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { staggerContainer, scaleInVariants } from '../utils/animations';

export const ToolsDashboard: React.FC = () => {
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
            <span className="dark:hover:text-white light:hover:text-text-dark cursor-pointer transition-colors">Tools</span>
            <span className="material-symbols-outlined text-[10px]">chevron_right</span>
            <span className="text-primary drop-shadow-[0_0_5px_rgba(19,236,55,0.5)]">Tools Dashboard</span>
          </div>
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-black tracking-tight dark:text-white light:text-text-dark flex items-center gap-3">
              Tools Dashboard
            </h1>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 min-h-0 px-8 pb-8 flex flex-col">
        <div className="glass-panel w-full h-full rounded-2xl p-8 md:p-12 flex flex-col gap-6 border dark:border-white/5 light:border-green-300">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Calculator */}
            <motion.div
              variants={scaleInVariants}
              whileHover={{ scale: 1.02, y: -5 }}
            >
              <Link
                to="/risk-calculator"
                className="glass-panel block p-6 rounded-xl dark:border-white/10 light:border-green-300 border hover:border-primary dark:hover:bg-white/[0.07] light:hover:bg-green-100 transition-all duration-300 cursor-pointer group flex flex-col gap-4 hover:shadow-[0_0_20px_rgba(19,236,55,0.2)] h-full"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary group-hover:shadow-[0_0_15px_rgba(19,236,55,0.2)] transition-all">
                    <span className="material-symbols-outlined text-2xl">calculate</span>
                  </div>
                  <div className="flex flex-col">
                    <h3 className="text-lg font-bold dark:text-white light:text-text-dark group-hover:text-primary transition-colors">Calculator</h3>
                    <span className="text-xs dark:text-gray-400 light:text-text-light-secondary">Risk Calculator</span>
                  </div>
                </div>
                <p className="text-sm dark:text-gray-400 light:text-text-light-secondary dark:group-hover:text-gray-300 light:group-hover:text-text-dark transition-colors">
                  Calculate position sizes and risk management parameters for your trades.
                </p>
                <div className="flex items-center gap-2 text-primary text-sm font-bold mt-auto pt-4">
                  <span>Open Calculator</span>
                  <span className="material-symbols-outlined text-lg group-hover:translate-x-1 transition-transform">arrow_forward</span>
                </div>
              </Link>
            </motion.div>

            {/* SuperEngulfing */}
            <motion.div
              variants={scaleInVariants}
              whileHover={{ scale: 1.02, y: -5 }}
            >
              <Link
                to="/superengulfing"
                className="glass-panel block p-6 rounded-xl dark:border-white/10 light:border-green-300 border hover:border-indigo-500 dark:hover:bg-white/[0.07] light:hover:bg-green-100 transition-all duration-300 cursor-pointer group flex flex-col gap-4 hover:shadow-[0_0_20px_rgba(99,102,241,0.2)] h-full"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 group-hover:shadow-[0_0_15px_rgba(99,102,241,0.2)] transition-all">
                    <span className="material-symbols-outlined text-2xl">candlestick_chart</span>
                  </div>
                  <div className="flex flex-col">
                    <h3 className="text-lg font-bold dark:text-white light:text-text-dark group-hover:text-indigo-400 transition-colors">SuperEngulfing</h3>
                    <span className="text-xs dark:text-gray-400 light:text-text-light-secondary">Pattern Visualizer</span>
                  </div>
                </div>
                <p className="text-sm dark:text-gray-400 light:text-text-light-secondary dark:group-hover:text-gray-300 light:group-hover:text-text-dark transition-colors">
                  Interactive visualizer and quiz for SuperEngulfing patterns (RUN, REV, PLUS, X-Logic).
                </p>
                <div className="flex items-center gap-2 text-indigo-400 text-sm font-bold mt-auto pt-4">
                  <span>Open Visualizer</span>
                  <span className="material-symbols-outlined text-lg group-hover:translate-x-1 transition-transform">arrow_forward</span>
                </div>
              </Link>
            </motion.div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
