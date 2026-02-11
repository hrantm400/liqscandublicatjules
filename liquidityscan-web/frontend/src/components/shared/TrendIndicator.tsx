import React from 'react';
import { Signal } from '../../types';

interface TrendIndicatorProps {
  signal: Signal;
  variant?: 'default' | 'compact';
}

export const TrendIndicator: React.FC<TrendIndicatorProps> = ({ signal, variant = 'default' }) => {
  const metadata = signal.metadata as any;
  const confidence = metadata?.confidence || 'MED';
  const isBullish = signal.signalType === 'BUY';
  
  // For Bias signals
  if (signal.strategyType === 'ICT_BIAS') {
    const bias = metadata?.bias || signal.signalType;
    const isBullishBias = bias === 'BULLISH' || bias === 'BUY';
    
    if (confidence === 'HIGH') {
      return (
        <div className={`flex items-center gap-1 ${variant === 'compact' ? 'gap-0.5' : ''}`}>
          <span className={`material-symbols-outlined ${isBullishBias ? 'text-primary' : 'text-red-500'} ${variant === 'compact' ? 'text-xs' : 'text-sm'}`}>
            {isBullishBias ? 'trending_up' : 'trending_down'}
          </span>
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border uppercase ${
              isBullishBias
                ? 'bg-primary/10 text-primary border-primary/20'
                : 'bg-red-500/10 text-red-500 border-red-500/20'
            } ${variant === 'compact' ? 'text-[9px] px-1.5 py-0.5' : ''}`}
          >
            {confidence === 'HIGH' ? (isBullishBias ? 'Strong' : 'High') : 'Med'}
          </span>
        </div>
      );
    }
    
    return (
      <div className={`flex items-center gap-1 ${variant === 'compact' ? 'gap-0.5' : ''}`}>
        <span className={`material-symbols-outlined text-yellow-500 ${variant === 'compact' ? 'text-xs' : 'text-sm'}`}>
          trending_flat
        </span>
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border bg-yellow-500/10 text-yellow-500 border-yellow-500/20 uppercase ${variant === 'compact' ? 'text-[9px] px-1.5 py-0.5' : ''}`}>
          Med
        </span>
      </div>
    );
  }
  
  // For RSI Divergence signals
  if (signal.strategyType === 'RSI_DIVERGENCE') {
    const rsiValue = Number(metadata?.rsiValue || metadata?.rsiHigh || metadata?.rsiLow || 50);
    const isBullishRSI = signal.signalType === 'BUY' || rsiValue < 50;
    
    return (
      <div className={`flex items-center gap-1 ${variant === 'compact' ? 'gap-0.5' : ''}`}>
        <span className={`material-symbols-outlined ${isBullishRSI ? 'text-primary' : 'text-red-500'} ${variant === 'compact' ? 'text-xs' : 'text-sm'}`}>
          {isBullishRSI ? 'trending_up' : 'trending_down'}
        </span>
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border uppercase ${
            isBullishRSI
              ? 'bg-primary/10 text-primary border-primary/20'
              : 'bg-red-500/10 text-red-500 border-red-500/20'
          } ${variant === 'compact' ? 'text-[9px] px-1.5 py-0.5' : ''}`}
        >
          {rsiValue.toFixed(1)}
        </span>
      </div>
    );
  }
  
  // Default for SuperEngulfing
  return (
    <div className={`flex items-center gap-1 ${variant === 'compact' ? 'gap-0.5' : ''}`}>
      <span className={`material-symbols-outlined ${isBullish ? 'text-primary' : 'text-red-500'} ${variant === 'compact' ? 'text-xs' : 'text-sm'}`}>
        {isBullish ? 'trending_up' : 'trending_down'}
      </span>
      <span
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border uppercase ${
          isBullish
            ? 'bg-primary/10 text-primary border-primary/20'
            : 'bg-red-500/10 text-red-500 border-red-500/20'
        } ${variant === 'compact' ? 'text-[9px] px-1.5 py-0.5' : ''}`}
      >
        {isBullish ? 'LONG' : 'SHORT'}
      </span>
    </div>
  );
};
