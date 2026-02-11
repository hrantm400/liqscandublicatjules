import React from 'react';
import { Link } from 'react-router-dom';
import { Timeframe } from '../../types';

interface PageHeaderProps {
  breadcrumbs: Array<{ label: string; path?: string }>;
  timeframes?: Array<{ timeframe: string; count?: number; isActive?: boolean }>;
  selectedTimeframe?: string;
  onTimeframeChange?: (tf: string) => void;
  lastUpdated?: string;
  onRefresh?: () => void;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  breadcrumbs,
  timeframes,
  selectedTimeframe,
  onTimeframeChange,
  lastUpdated,
  onRefresh,
}) => {
  return (
    <header className="flex flex-wrap items-center justify-between gap-4 px-8 py-6 shrink-0 dark:border-b-white/5 light:border-b-green-300 glass-panel !border-l-0 !border-r-0 !border-t-0 !bg-transparent dark:backdrop-blur-sm">
      <div className="flex items-center gap-3">
        <div className="flex items-center text-sm font-semibold tracking-wide">
          {breadcrumbs.map((crumb, index) => (
            <React.Fragment key={index}>
              {crumb.path ? (
                <Link
                  to={crumb.path}
                  className="dark:text-gray-500 light:text-text-light-secondary dark:hover:text-white light:hover:text-text-dark transition-colors cursor-pointer"
                >
                  {crumb.label}
                </Link>
              ) : (
                <span className="dark:text-white light:text-text-dark hover:text-primary transition-colors cursor-pointer">
                  {crumb.label}
                </span>
              )}
              {index < breadcrumbs.length - 1 && (
                <span className="material-symbols-outlined dark:text-gray-600 light:text-text-light-secondary text-sm mx-2">
                  chevron_right
                </span>
              )}
            </React.Fragment>
          ))}
        </div>
        {lastUpdated && (
          <div className="flex items-center gap-2 text-xs dark:text-gray-500 light:text-text-light-secondary">
            <span>Last updated: {lastUpdated}</span>
            {onRefresh && (
              <button
                onClick={onRefresh}
                className="p-1 rounded hover:bg-white/5 transition-colors"
                title="Refresh"
              >
                <span className="material-symbols-outlined text-sm">refresh</span>
              </button>
            )}
          </div>
        )}
      </div>
      {timeframes && onTimeframeChange && (
        <div className="flex p-1 gap-1 rounded-full dark:bg-black/40 dark:backdrop-blur-md light:bg-green-50 dark:border-white/10 light:border-green-300">
          {timeframes.map((tf) => (
            <button
              key={tf.timeframe}
              onClick={() => onTimeframeChange && onTimeframeChange(tf.timeframe)}
              className={`px-5 py-1.5 rounded-full text-xs font-bold transition-all ${
                selectedTimeframe === tf.timeframe
                  ? 'bg-primary text-black shadow-[0_0_10px_rgba(19,236,55,0.4)]'
                  : 'dark:text-gray-400 light:text-text-light-secondary dark:hover:text-white light:hover:text-text-dark dark:hover:bg-white/10 light:hover:bg-green-100'
              }`}
            >
              {tf.timeframe.toUpperCase()}
            </button>
          ))}
        </div>
      )}
    </header>
  );
};
