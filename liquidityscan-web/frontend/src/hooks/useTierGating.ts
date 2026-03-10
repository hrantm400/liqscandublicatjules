import { useState, useEffect } from 'react';
import { userApi } from '../services/userApi';
import { useAuthStore } from '../store/authStore';

const FREE_SYMBOLS = ['BTCUSDT', 'ETHUSDT', 'XAUUSDT', 'XAGUSDT'];
// Add known developer emails here for automatic premium access
const DEV_EMAILS = ['hrantttt1996@gmail.com', 'dev@liquidityscan.local'];

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
    const user = useAuthStore(state => state.user);
    const isDevLogin = !!(user?.isAdmin || (user?.email && DEV_EMAILS.includes(user.email.toLowerCase())));

    const [tier, setTier] = useState<string>('FREE');
    const [isPaid, setIsPaid] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Dev bypass: if admin or dev email, immediately grant access and skip API call
        if (isDevLogin) {
            setTier('PAID_ANNUAL');
            setIsPaid(true);
            setLoading(false);
            return;
        }

        userApi.getTier()
            .then((data: any) => {
                setTier(data.tier || 'FREE');
                setIsPaid(data.isPaid || false);
            })
            .catch(() => {
                setTier('FREE');
                setIsPaid(false);
            })
            .finally(() => setLoading(false));
    }, [isDevLogin]);

    const isSymbolAllowed = (symbol: string): boolean => {
        if (isPaid || isDevLogin) return true;
        return FREE_SYMBOLS.some(
            (fs) =>
                symbol.toUpperCase() === fs ||
                symbol.toUpperCase().startsWith(fs.replace('USDT', ''))
        );
    };

    return { isPaid: isPaid || isDevLogin, tier: isDevLogin ? 'PAID_ANNUAL' : tier, loading, isSymbolAllowed };
}
