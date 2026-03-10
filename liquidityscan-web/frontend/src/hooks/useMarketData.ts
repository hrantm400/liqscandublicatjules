import { useQuery } from '@tanstack/react-query';
import { Signal, StrategyType } from '../types';
import { fetchSignals } from '../services/signalsApi';

interface UseMarketDataOptions {
  strategyType: StrategyType;
  timeframe?: string;
  limit?: number;
  refetchInterval?: number;
}

export const useMarketData = (options: UseMarketDataOptions) => {
  const { strategyType, timeframe, limit = 1000, refetchInterval = 60000 } = options;

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['signals', strategyType, timeframe],
    queryFn: () => fetchSignals(strategyType, limit),
    refetchInterval,
    placeholderData: (prev) => prev,
  });

  const signals: Signal[] = Array.isArray(data) ? data : [];

  return {
    signals,
    isLoading,
    error,
    refetch,
  };
};
