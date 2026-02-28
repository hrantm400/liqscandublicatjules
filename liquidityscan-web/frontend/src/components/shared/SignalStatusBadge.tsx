import { Signal } from '../../types';

/**
 * Inline status badge for signal table rows.
 * Shows outcome with PnL % if closed, or pulsing green dot if active.
 */
export function SignalStatusBadge({ signal }: { signal: Signal }) {
    const { status, pnlPercent, outcome } = signal;

    if (status === 'HIT_TP' || outcome === 'HIT_TP') {
        return (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                <span className="material-symbols-outlined text-xs">check_circle</span>
                +{pnlPercent?.toFixed(1) ?? '0.0'}%
            </span>
        );
    }

    if (status === 'HIT_SL' || outcome === 'HIT_SL') {
        return (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/15 text-red-400 border border-red-500/20">
                <span className="material-symbols-outlined text-xs">cancel</span>
                {pnlPercent?.toFixed(1) ?? '0.0'}%
            </span>
        );
    }

    if (status === 'EXPIRED' || outcome === 'EXPIRED') {
        const pnlStr = pnlPercent != null ? ` ${pnlPercent >= 0 ? '+' : ''}${pnlPercent.toFixed(1)}%` : '';
        return (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-500/15 dark:text-gray-400 light:text-slate-500 border border-gray-500/20">
                <span className="material-symbols-outlined text-xs">schedule</span>
                Expired{pnlStr}
            </span>
        );
    }

    // ACTIVE
    return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary border border-primary/20">
            <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-primary"></span>
            </span>
            Active
        </span>
    );
}
