import { useEffect, useState } from 'react';
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
  const [signals, setSignals] = useState<Signal[]>([]);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['signals', strategyType, timeframe],
    queryFn: () => fetchSignals(strategyType, limit),
    refetchInterval,
  });

  useEffect(() => {
    if (data) {
      const signalsArray = Array.isArray(data) ? data : [];
      setSignals(signalsArray as Signal[]);
    } else if (data === null || (Array.isArray(data) && data.length === 0)) {
      setSignals([]);
    }
  }, [data]);

  useEffect(() => {
    if (error) {
      console.error(`Error fetching ${strategyType} signals:`, error);
    }
  }, [error, strategyType]);

  // TODO: Re-enable when WebSocket service is recreated
  // useEffect(() => {
  //   wsService.subscribeToStrategy(strategyType);

  //   const handleNewSignal = (signal: Signal) => {
  //     if (signal.strategyType === strategyType) {
  //       setSignals((prev) => [signal, ...prev]);
  //     }
  //   };

  //   wsService.on('signal:new', handleNewSignal);

  //   return () => {
  //     wsService.off('signal:new', handleNewSignal);
  //   };
  // }, [strategyType]);

  return {
    signals,
    isLoading,
    error,
    refetch,
  };
};
