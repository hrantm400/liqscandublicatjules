import { Signal } from '../../types';

/**
 * Lifecycle-aware status badge for signal rows.
 * Shows outcome with close reason, or pulsing state for live signals.
 */
export function SignalStatusBadge({ signal }: { signal: Signal }) {
    const { lifecycleStatus, result, se_close_reason, pnlPercent } = signal;

    // COMPLETED — WIN
    if (lifecycleStatus === 'COMPLETED' && result === 'WIN') {
        const reasonLabel = se_close_reason === 'TP2' ? 'TP2' : se_close_reason === 'OPPOSITE_REV' ? 'OPP REV' : '';
        return (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 shadow-[0_0_8px_rgba(16,185,129,0.15)]">
                <span className="text-xs">✅</span>
                WIN {pnlPercent != null ? `+${pnlPercent.toFixed(1)}%` : ''}
                {reasonLabel && <span className="ml-0.5 opacity-70 text-[9px]">({reasonLabel})</span>}
            </span>
        );
    }

    // COMPLETED — LOSS
    if (lifecycleStatus === 'COMPLETED' && result === 'LOSS') {
        const reasonLabel = se_close_reason === 'SL' ? 'SL' : se_close_reason === 'OPPOSITE_REV' ? 'OPP REV' : '';
        return (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-red-500/15 text-red-400 border border-red-500/20">
                <span className="text-xs">❌</span>
                LOSS {pnlPercent != null ? `${pnlPercent.toFixed(1)}%` : ''}
                {reasonLabel && <span className="ml-0.5 opacity-70 text-[9px]">({reasonLabel})</span>}
            </span>
        );
    }

    // EXPIRED
    if (lifecycleStatus === 'EXPIRED') {
        return (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-gray-500/15 dark:text-gray-400 light:text-slate-500 border border-gray-500/20">
                <span className="text-xs">⏳</span>
                EXPIRED
            </span>
        );
    }

    // PENDING
    if (lifecycleStatus === 'PENDING') {
        return (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-400"></span>
                </span>
                Pending
            </span>
        );
    }

    // ACTIVE (default)
    return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-primary/10 text-primary border border-primary/20 shadow-[0_0_8px_rgba(19,236,55,0.15)]">
            <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-primary"></span>
            </span>
            Active
        </span>
    );
}
