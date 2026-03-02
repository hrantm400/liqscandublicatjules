import { useMemo } from 'react';
import { Signal } from '../types';

export type TabView = 'LIVE' | 'CLOSED' | 'ARCHIVE' | 'ALL';

interface FilterParams {
    signals: Signal[];
    tab: TabView;
}

export function useLifecycleFilter({ signals, tab }: FilterParams) {
    return useMemo(() => {
        return signals.filter((signal) => {
            switch (tab) {
                case 'LIVE':
                    return signal.lifecycleStatus === 'PENDING' || signal.lifecycleStatus === 'ACTIVE';

                case 'CLOSED':
                    return signal.lifecycleStatus === 'COMPLETED' || signal.lifecycleStatus === 'EXPIRED';

                case 'ARCHIVE':
                    return signal.lifecycleStatus === 'ARCHIVED';

                case 'ALL':
                default:
                    return true;
            }
        });
    }, [signals, tab]);
}
