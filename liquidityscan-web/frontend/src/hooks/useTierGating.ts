import { useState, useEffect } from 'react';
import { userApi } from '../services/userApi';

const FREE_SYMBOLS = ['BTCUSDT', 'ETHUSDT', 'XAUUSDT', 'XAGUSDT'];

export interface TierGating {
    isPaid: boolean;
    tier: string;
    loading: boolean;
    /** Check if a symbol is available for the current tier */
    isSymbolAllowed: (symbol: string) => boolean;
}

/**
 * Hook that provides tier-based gating for monitor pages.
 * Free users can only fully see BTC, ETH, XAU, XAG.
 * Other signals are rendered but blurred with a PRO overlay.
 */
export function useTierGating(): TierGating {
    const [tier, setTier] = useState<string>('FREE');
    const [isPaid, setIsPaid] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        userApi.getTier()
            .then((data: any) => {
                setTier(data.tier || 'FREE');
                setIsPaid(data.isPaid || false);
            })
            .catch(() => {
                // If not logged in or error, treat as FREE
                setTier('FREE');
                setIsPaid(false);
            })
            .finally(() => setLoading(false));
    }, []);

    const isSymbolAllowed = (symbol: string): boolean => {
        if (isPaid) return true;
        return FREE_SYMBOLS.some(
            (fs) =>
                symbol.toUpperCase() === fs ||
                symbol.toUpperCase().startsWith(fs.replace('USDT', ''))
        );
    };

    return { isPaid, tier, loading, isSymbolAllowed };
}
