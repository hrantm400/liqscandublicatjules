import React from 'react';

// Default SuperEngulfing options
const SE_OPTIONS = ['All', 'Run', 'Run+', 'Rev', 'Rev+'] as const;
const SE_STANDARD_ONLY = ['All', 'Run', 'Rev'] as const;

// ICT Bias options
const BIAS_OPTIONS = ['All', 'Long', 'Short'] as const;

// RSI Divergence options
const RSI_OPTIONS = ['All', 'Regular', 'Hidden'] as const;

export type StrategyFilterType = 'SUPER_ENGULFING' | 'ICT_BIAS' | 'RSI_DIVERGENCE';

interface PatternFilterProps {
  type: 'bull' | 'bear';
  value: string;
  onChange: (value: string) => void;
  /** When true (e.g. Free Forever plan), only show Standard REV/RUN (hide Rev+, Run+) */
  standardOnly?: boolean;
  /** Strategy type determines which filter options to show */
  strategyType?: StrategyFilterType;
}

export const PatternFilter: React.FC<PatternFilterProps> = ({
  type,
  value,
  onChange,
  standardOnly = false,
  strategyType = 'SUPER_ENGULFING',
}) => {
  const isBull = type === 'bull';

  // Choose label based on strategy
  let label: string;
  if (strategyType === 'ICT_BIAS') {
    label = isBull ? 'Long' : 'Short';
  } else if (strategyType === 'RSI_DIVERGENCE') {
    label = isBull ? 'Bullish' : 'Bearish';
  } else {
    label = isBull ? 'Bull' : 'Bear';
  }

  // Choose options based on strategy
  let options: readonly string[];
  if (strategyType === 'ICT_BIAS') {
    // For Bias: just show All, as there's only Long/Short (the type selector IS the filter)
    options = BIAS_OPTIONS;
  } else if (strategyType === 'RSI_DIVERGENCE') {
    options = RSI_OPTIONS;
  } else {
    options = standardOnly ? SE_STANDARD_ONLY : SE_OPTIONS;
  }

  const colorClass = isBull
    ? 'text-primary bg-primary text-black shadow-[0_0_10px_rgba(19,236,55,0.4)] border-primary'
    : 'bg-red-500 text-white shadow-[0_0_10px_rgba(239,68,68,0.4)] border-red-500';

  return (
    <div className="flex items-center gap-2 px-2 py-1.5 rounded-2xl dark:bg-white/5 light:bg-white dark:border-white/5 light:border-green-300 shrink-0">
      <span className={`text-[10px] font-black ${isBull ? 'text-primary' : 'text-red-500'} uppercase tracking-widest pl-1`}>
        {label}
      </span>
      <div className="flex items-center gap-1">
        {options.map((opt) => {
          const isSelected = value === opt;
          return (
            <button
              key={opt}
              onClick={() => onChange(opt)}
              className={`px-2.5 py-1 rounded-full text-[10px] font-bold border whitespace-nowrap transition-all ${isSelected
                ? colorClass
                : 'dark:border-white/10 light:border-green-300 dark:bg-white/5 light:bg-green-50 dark:text-gray-400 light:text-text-light-secondary dark:hover:bg-white/10 light:hover:bg-green-100 dark:hover:text-white light:hover:text-text-dark'
                }`}
            >
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
};
