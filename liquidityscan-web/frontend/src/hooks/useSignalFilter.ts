import { useMemo } from 'react';
import { Signal, Timeframe } from '../types';

interface UseSignalFilterOptions {
  signals: Signal[];
  searchQuery: string;
  activeTimeframe?: Timeframe | 'all';
  bullFilter: string;
  bearFilter: string;
  sortBy: 'confidence' | 'time' | 'symbol';
  marketCapSort: 'high-low' | 'low-high' | null;
  volumeSort: 'high-low' | 'low-high' | null;
  rankingFilter: number | null;
  showClosedSignals: boolean;
  strategyType: 'SUPER_ENGULFING' | 'RSI_DIVERGENCE' | 'ICT_BIAS';
}

export const useSignalFilter = (options: UseSignalFilterOptions) => {
  const {
    signals,
    searchQuery,
    activeTimeframe,
    bullFilter,
    bearFilter,
    sortBy,
    marketCapSort,
    volumeSort,
    rankingFilter,
    showClosedSignals,
    strategyType,
  } = options;

  const filteredSignals = useMemo(() => {
    let filtered = [...signals];

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(
        (signal) =>
          signal.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
          signal.symbol.toUpperCase().includes(searchQuery.toUpperCase())
      );
    }

    // Timeframe filter
    if (activeTimeframe && activeTimeframe !== 'all') {
      filtered = filtered.filter((signal) => signal.timeframe === activeTimeframe);
    }

    // Strategy-specific Bull/Bear filters
    if (strategyType === 'SUPER_ENGULFING') {
      if (bullFilter !== 'All' && bullFilter !== '') {
        filtered = filtered.filter((signal) => {
          if (signal.signalType === 'BUY') {
            const pattern = signal.metadata?.pattern || 'RUN';
            if (bullFilter === 'Run') return pattern === 'RUN';
            if (bullFilter === 'Run+') return pattern === 'RUN_PLUS';
            if (bullFilter === 'Rev') return pattern === 'REV';
            if (bullFilter === 'Rev+') return pattern === 'REV_PLUS';
            return true;
          }
          return false;
        });
      }

      if (bearFilter !== 'All' && bearFilter !== '') {
        filtered = filtered.filter((signal) => {
          if (signal.signalType === 'SELL') {
            const pattern = signal.metadata?.pattern || 'RUN';
            if (bearFilter === 'Run') return pattern === 'RUN';
            if (bearFilter === 'Run+') return pattern === 'RUN_PLUS';
            if (bearFilter === 'Rev') return pattern === 'REV';
            if (bearFilter === 'Rev+') return pattern === 'REV_PLUS';
            return true;
          }
          return false;
        });
      }
    } else if (strategyType === 'RSI_DIVERGENCE') {
      // RSI Divergence filters: All | Regular | Hidden
      if (bullFilter !== 'All' && bullFilter !== '') {
        filtered = filtered.filter((signal) => {
          const isBullish = signal.signalType === 'BUY';
          if (!isBullish) return false;
          const metadata = signal.metadata as any;
          const divergenceType = (metadata?.divergenceType || '').toLowerCase();
          if (bullFilter === 'Regular') return divergenceType.includes('bullish') && !divergenceType.includes('hidden');
          if (bullFilter === 'Hidden') return divergenceType.includes('hidden') && divergenceType.includes('bullish');
          return true;
        });
      }

      if (bearFilter !== 'All' && bearFilter !== '') {
        filtered = filtered.filter((signal) => {
          const isBearish = signal.signalType === 'SELL';
          if (!isBearish) return false;
          const metadata = signal.metadata as any;
          const divergenceType = (metadata?.divergenceType || '').toLowerCase();
          if (bearFilter === 'Regular') return divergenceType.includes('bearish') && !divergenceType.includes('hidden');
          if (bearFilter === 'Hidden') return divergenceType.includes('hidden') && divergenceType.includes('bearish');
          return true;
        });
      }
    } else if (strategyType === 'ICT_BIAS') {
      // ICT Bias filters: All | Long | Short
      if (bullFilter !== 'All' && bullFilter !== '') {
        filtered = filtered.filter((signal) => {
          const metadata = signal.metadata as any;
          const bias = metadata?.bias || signal.signalType;
          if (bullFilter === 'Long') return bias === 'BULLISH' || bias === 'BUY';
          if (bullFilter === 'Short') return bias === 'BEARISH' || bias === 'SELL';
          return true;
        });
      }

      if (bearFilter !== 'All' && bearFilter !== '') {
        filtered = filtered.filter((signal) => {
          const metadata = signal.metadata as any;
          const bias = metadata?.bias || signal.signalType;
          if (bearFilter === 'Long') return bias === 'BULLISH' || bias === 'BUY';
          if (bearFilter === 'Short') return bias === 'BEARISH' || bias === 'SELL';
          return true;
        });
      }
    }

    // Sort
    if (sortBy === 'time') {
      filtered.sort((a, b) => new Date(b.detectedAt).getTime() - new Date(a.detectedAt).getTime());
    } else if (sortBy === 'confidence') {
      filtered.sort((a, b) => {
        const aConf = a.metadata?.confidence || 'MED';
        const bConf = b.metadata?.confidence || 'MED';
        const order = { HIGH: 3, MED: 2, LOW: 1 };
        return (order[bConf as keyof typeof order] || 0) - (order[aConf as keyof typeof order] || 0);
      });
    } else if (sortBy === 'symbol') {
      filtered.sort((a, b) => a.symbol.localeCompare(b.symbol));
    }

    // Market Cap and Volume sorting would require additional data
    // For now, we'll skip these as they need market data integration

    // Ranking filter
    if (rankingFilter) {
      filtered = filtered.slice(0, rankingFilter);
    }

    // Status filter — use lifecycleStatus for SE lifecycle
    if (!showClosedSignals) {
      filtered = filtered.filter((signal) =>
        signal.lifecycleStatus === 'PENDING' || signal.lifecycleStatus === 'ACTIVE'
      );
    }

    return filtered;
  }, [
    signals,
    searchQuery,
    activeTimeframe,
    bullFilter,
    bearFilter,
    sortBy,
    marketCapSort,
    volumeSort,
    rankingFilter,
    showClosedSignals,
    strategyType,
  ]);

  return filteredSignals;
};
