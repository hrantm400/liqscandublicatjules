import { useState, useEffect } from 'react';
import { userApi } from '../../services/userApi';
import { toast } from 'react-hot-toast';

interface AlertSubscription {
    id: string;
    symbol: string;
    strategyType: string;
    timeframes: string[] | null;
    directions: string[] | null;
    minWinRate: number | null;
    isActive: boolean;
    createdAt: string;
}

const STRATEGIES = [
    { value: 'SUPER_ENGULFING', label: 'Super Engulfing', icon: '🔥', color: '#f59e0b' },
    { value: 'RSI_DIVERGENCE', label: 'RSI Divergence', icon: '📊', color: '#8b5cf6' },
    { value: 'ICT_BIAS', label: 'ICT Bias', icon: '🧭', color: '#06b6d4' },
    { value: 'STRATEGY_1', label: 'Strategy 1', icon: '⚡', color: '#13ec37' },
    { value: 'CONFLUENCE', label: 'Confluence', icon: '🎯', color: '#ec4899' },
];

const TIMEFRAMES = ['5m', '15m', '1h', '4h', '1D'];

const COMMON_COINS = [
    'BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'XRPUSDT',
    'ADAUSDT', 'DOGEUSDT', 'DOTUSDT', 'AVAXUSDT', 'LINKUSDT'
];

export function TelegramAlertsConfig() {
    const [telegramId, setTelegramId] = useState('');
    const [isSavedTelegramId, setIsSavedTelegramId] = useState(false);
    const [alerts, setAlerts] = useState<AlertSubscription[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Form state
    const [newSymbol, setNewSymbol] = useState('');
    const [newStrategy, setNewStrategy] = useState(STRATEGIES[0].value);
    const [selectedTimeframes, setSelectedTimeframes] = useState<string[]>([]);
    const [selectedDirections, setSelectedDirections] = useState<string[]>([]);
    const [minWinRate, setMinWinRate] = useState<number | ''>('');

    // Expanded edit card
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editTimeframes, setEditTimeframes] = useState<string[]>([]);
    const [editDirections, setEditDirections] = useState<string[]>([]);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setIsLoading(true);
            const [tgRes, alertsRes] = await Promise.all([
                userApi.getTelegramId(),
                userApi.getAlerts()
            ]);
            if (tgRes.telegramId) {
                setTelegramId(tgRes.telegramId);
                setIsSavedTelegramId(true);
            }
            setAlerts(alertsRes);
        } catch {
            toast.error('Failed to load alerts data');
        } finally {
            setIsLoading(false);
        }
    };

    const saveTelegramId = async () => {
        if (!telegramId.trim()) { toast.error('Enter a valid Telegram ID'); return; }
        try {
            await userApi.saveTelegramId(telegramId.trim());
            setIsSavedTelegramId(true);
            toast.success('Telegram ID saved!');
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to save');
        }
    };

    const createAlert = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newSymbol.trim()) { toast.error('Enter a coin symbol'); return; }
        let sym = newSymbol.trim().toUpperCase();
        if (!sym.endsWith('USDT') && !sym.endsWith('USD')) sym += 'USDT';

        try {
            const res = await userApi.createAlert(
                sym,
                newStrategy,
                selectedTimeframes.length > 0 ? selectedTimeframes : undefined,
                selectedDirections.length > 0 ? selectedDirections : undefined,
                minWinRate !== '' ? Number(minWinRate) : undefined,
            );
            setAlerts([res, ...alerts]);
            setNewSymbol('');
            setSelectedTimeframes([]);
            setSelectedDirections([]);
            setMinWinRate('');
            toast.success(`Now tracking ${sym}`);
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to create alert');
        }
    };

    const toggleActive = async (alert: AlertSubscription) => {
        try {
            const updated = await userApi.updateAlert(alert.id, { isActive: !alert.isActive });
            setAlerts(alerts.map(a => a.id === alert.id ? updated : a));
            toast.success(updated.isActive ? 'Alert activated' : 'Alert paused');
        } catch { toast.error('Failed to update'); }
    };

    const saveEdits = async (alert: AlertSubscription) => {
        try {
            const updated = await userApi.updateAlert(alert.id, {
                timeframes: editTimeframes.length > 0 ? editTimeframes : undefined,
                directions: editDirections.length > 0 ? editDirections : undefined,
            });
            setAlerts(alerts.map(a => a.id === alert.id ? updated : a));
            setEditingId(null);
            toast.success('Filters updated');
        } catch { toast.error('Failed to update filters'); }
    };

    const deleteAlert = async (id: string) => {
        try {
            await userApi.deleteAlert(id);
            setAlerts(alerts.filter(a => a.id !== id));
            toast.success('Alert removed');
        } catch { toast.error('Failed to delete'); }
    };

    const toggleTf = (tf: string, list: string[], setList: (v: string[]) => void) => {
        setList(list.includes(tf) ? list.filter(t => t !== tf) : [...list, tf]);
    };

    const toggleDir = (dir: string, list: string[], setList: (v: string[]) => void) => {
        setList(list.includes(dir) ? list.filter(d => d !== dir) : [...list, dir]);
    };

    const getStrategyMeta = (val: string) => STRATEGIES.find(s => s.value === val);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[200px] w-full rounded-xl">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="space-y-8 w-full animate-fade-in relative z-10 px-0 mt-8 pt-8 border-t dark:border-white/10 light:border-slate-200">

            {/* ── HEADER ── */}
            <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500/20 to-primary/20 flex items-center justify-center border dark:border-white/10 light:border-slate-200 shadow-lg">
                    <span className="material-symbols-outlined text-2xl text-blue-400">notifications_active</span>
                </div>
                <div>
                    <h2 className="text-xl font-bold dark:text-white light:text-text-dark">
                        Telegram Signal Alerts
                    </h2>
                    <p className="dark:text-gray-500 light:text-slate-500 text-xs mt-0.5">
                        Fine-tune exactly which signals get delivered to your Telegram.
                    </p>
                </div>
            </div>

            {/* ── TELEGRAM CONNECTION ── */}
            <div className="glass-panel p-5 rounded-2xl border dark:border-white/5 light:border-green-300 dark:bg-surface-dark/60 light:bg-white relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-40 h-40 bg-blue-500/5 rounded-bl-full -z-10 transition-transform group-hover:scale-110"></div>
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                        <span className="material-symbols-outlined text-blue-400 text-sm">send</span>
                    </div>
                    <h3 className="text-base font-bold dark:text-white light:text-slate-900">Connect Telegram</h3>
                    {isSavedTelegramId && (
                        <span className="ml-auto text-[10px] px-2.5 py-1 rounded-full bg-green-500/15 text-green-400 border border-green-500/20 font-bold tracking-wide">
                            CONNECTED
                        </span>
                    )}
                </div>
                <p className="text-xs dark:text-gray-400 light:text-slate-500 leading-relaxed mb-4">
                    Find <strong className="text-primary">@LiquidityScanBot</strong> on Telegram → send <code className="dark:bg-white/10 light:bg-slate-200 px-1.5 py-0.5 rounded text-[11px]">/start</code> → paste your Chat ID below.
                </p>
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={telegramId}
                        onChange={(e) => { setTelegramId(e.target.value); if (isSavedTelegramId) setIsSavedTelegramId(false); }}
                        placeholder="e.g. 123456789"
                        className="glass-input w-full px-3 py-2 rounded-lg text-sm border dark:border-white/10 light:border-slate-300"
                    />
                    <button
                        onClick={saveTelegramId}
                        className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${isSavedTelegramId
                            ? 'bg-green-500/15 text-green-400 border border-green-500/20'
                            : 'bg-primary text-black hover:bg-primary-hover shadow-glow'}`}
                    >
                        {isSavedTelegramId ? '✓ Saved' : 'Save'}
                    </button>
                </div>
            </div>

            {/* ── RULE BUILDER ── */}
            <div className={`transition-all duration-500 ${!isSavedTelegramId ? 'opacity-30 pointer-events-none blur-[1px]' : ''}`}>
                <div className="glass-panel p-6 rounded-2xl border dark:border-white/5 light:border-green-300 dark:bg-surface-dark/60 light:bg-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-40 h-40 bg-primary/5 rounded-bl-full -z-10"></div>

                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                            <span className="material-symbols-outlined text-primary text-sm">tune</span>
                        </div>
                        <h3 className="text-base font-bold dark:text-white light:text-slate-900">Create Alert Rule</h3>
                    </div>

                    <form onSubmit={createAlert} className="space-y-5">
                        {/* Row 1: Symbol + Strategy */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[10px] font-bold dark:text-gray-500 light:text-slate-400 uppercase tracking-widest mb-1.5">Coin Symbol</label>
                                <input
                                    type="text"
                                    value={newSymbol}
                                    onChange={(e) => setNewSymbol(e.target.value)}
                                    placeholder="e.g. BTC"
                                    className="glass-input w-full px-4 py-2.5 rounded-lg text-sm font-mono uppercase border dark:border-white/10 light:border-slate-300"
                                    required
                                />
                                <div className="flex flex-wrap gap-1.5 mt-2">
                                    {COMMON_COINS.slice(0, 6).map(c => (
                                        <span key={c} onClick={() => setNewSymbol(c)}
                                            className={`text-[10px] px-2.5 py-1 rounded-full cursor-pointer transition-all border ${newSymbol === c
                                                ? 'bg-primary/20 text-primary border-primary/40 shadow-sm'
                                                : 'dark:bg-white/5 light:bg-slate-100 dark:text-gray-400 light:text-slate-500 dark:border-white/5 light:border-slate-200 hover:bg-primary/10 hover:text-primary hover:border-primary/30'
                                                }`}>
                                            {c.replace('USDT', '')}
                                        </span>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold dark:text-gray-500 light:text-slate-400 uppercase tracking-widest mb-1.5">Strategy</label>
                                <div className="grid grid-cols-1 gap-1.5">
                                    {STRATEGIES.map(s => (
                                        <button key={s.value} type="button"
                                            onClick={() => setNewStrategy(s.value)}
                                            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all border text-left ${newStrategy === s.value
                                                ? 'dark:bg-white/10 light:bg-slate-100 dark:text-white light:text-slate-900 border-primary/40 shadow-sm ring-1 ring-primary/20'
                                                : 'dark:bg-white/[0.02] light:bg-white dark:text-gray-400 light:text-slate-500 dark:border-white/5 light:border-slate-200 hover:bg-white/5'
                                                }`}>
                                            <span>{s.icon}</span>
                                            <span>{s.label}</span>
                                            {newStrategy === s.value && <span className="ml-auto w-2 h-2 rounded-full" style={{ background: s.color }}></span>}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Row 2: Timeframes */}
                        <div>
                            <label className="block text-[10px] font-bold dark:text-gray-500 light:text-slate-400 uppercase tracking-widest mb-2">
                                Timeframes <span className="text-[9px] font-normal dark:text-gray-600 light:text-slate-400 normal-case">(empty = all)</span>
                            </label>
                            <div className="flex flex-wrap gap-2">
                                {TIMEFRAMES.map(tf => (
                                    <button key={tf} type="button"
                                        onClick={() => toggleTf(tf, selectedTimeframes, setSelectedTimeframes)}
                                        className={`px-4 py-2 rounded-xl text-xs font-bold tracking-wider transition-all border ${selectedTimeframes.includes(tf)
                                            ? 'bg-primary/20 text-primary border-primary/40 shadow-[0_0_12px_rgba(19,236,55,0.15)]'
                                            : 'dark:bg-white/[0.03] light:bg-slate-50 dark:text-gray-500 light:text-slate-400 dark:border-white/5 light:border-slate-200 hover:bg-primary/10 hover:text-primary hover:border-primary/20'
                                            }`}>
                                        {tf}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Row 3: Direction */}
                        <div>
                            <label className="block text-[10px] font-bold dark:text-gray-500 light:text-slate-400 uppercase tracking-widest mb-2">
                                Direction <span className="text-[9px] font-normal dark:text-gray-600 light:text-slate-400 normal-case">(empty = both)</span>
                            </label>
                            <div className="flex gap-3">
                                <button type="button"
                                    onClick={() => toggleDir('BUY', selectedDirections, setSelectedDirections)}
                                    className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all border flex items-center justify-center gap-2 ${selectedDirections.includes('BUY')
                                        ? 'bg-green-500/15 text-green-400 border-green-500/30 shadow-[0_0_12px_rgba(19,236,55,0.1)]'
                                        : 'dark:bg-white/[0.03] light:bg-slate-50 dark:text-gray-500 light:text-slate-400 dark:border-white/5 light:border-slate-200 hover:bg-green-500/10 hover:text-green-400 hover:border-green-500/20'
                                        }`}>
                                    <span>▲</span> BUY / LONG
                                </button>
                                <button type="button"
                                    onClick={() => toggleDir('SELL', selectedDirections, setSelectedDirections)}
                                    className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all border flex items-center justify-center gap-2 ${selectedDirections.includes('SELL')
                                        ? 'bg-red-500/15 text-red-400 border-red-500/30 shadow-[0_0_12px_rgba(255,59,48,0.1)]'
                                        : 'dark:bg-white/[0.03] light:bg-slate-50 dark:text-gray-500 light:text-slate-400 dark:border-white/5 light:border-slate-200 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20'
                                        }`}>
                                    <span>▼</span> SELL / SHORT
                                </button>
                            </div>
                        </div>

                        {/* Submit */}
                        <button type="submit"
                            className="w-full py-3 rounded-xl bg-gradient-to-r from-primary/80 to-primary text-black font-bold text-sm transition-all hover:shadow-[0_0_20px_rgba(19,236,55,0.25)] hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2">
                            <span className="material-symbols-outlined text-sm">add_alert</span>
                            Start Tracking
                        </button>
                    </form>
                </div>
            </div>

            {/* ── ACTIVE ALERTS LIST ── */}
            <div className={`transition-all duration-500 ${!isSavedTelegramId ? 'opacity-30 pointer-events-none blur-[1px]' : ''}`}>
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary text-lg">notifications_active</span>
                        <h3 className="text-base font-bold dark:text-white light:text-slate-900">Active Rules</h3>
                        <span className="text-xs dark:text-gray-600 light:text-slate-400 ml-1">({alerts.length})</span>
                    </div>
                </div>

                {alerts.length === 0 ? (
                    <div className="glass-panel rounded-2xl p-10 text-center border dark:border-white/5 light:border-green-300 dark:bg-surface-dark/60 light:bg-white">
                        <div className="w-14 h-14 rounded-2xl dark:bg-primary/10 light:bg-primary/5 flex items-center justify-center mx-auto mb-4">
                            <span className="material-symbols-outlined text-2xl text-primary/40">rule</span>
                        </div>
                        <p className="text-sm dark:text-gray-400 light:text-slate-500">No alerts yet. Use the form above to create your first rule.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-3">
                        {alerts.map(alert => {
                            const meta = getStrategyMeta(alert.strategyType);
                            const isEditing = editingId === alert.id;
                            return (
                                <div key={alert.id}
                                    className={`glass-panel rounded-2xl border transition-all duration-300 dark:bg-surface-dark/60 light:bg-white relative overflow-hidden
                                    ${!alert.isActive ? 'opacity-50' : ''}
                                    ${isEditing ? 'dark:border-primary/30 light:border-primary/40 shadow-[0_0_20px_rgba(19,236,55,0.08)]' : 'dark:border-white/5 light:border-green-300'}`}>

                                    {/* Main row */}
                                    <div className="p-4 flex items-center gap-4">
                                        {/* Symbol Badge */}
                                        <div className="w-12 h-12 rounded-xl flex items-center justify-center border shrink-0"
                                            style={{ background: `${meta?.color || '#13ec37'}15`, borderColor: `${meta?.color || '#13ec37'}30` }}>
                                            <span className="text-xs font-black font-mono" style={{ color: meta?.color || '#13ec37' }}>
                                                {alert.symbol.substring(0, 3)}
                                            </span>
                                        </div>

                                        {/* Info */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="font-bold text-sm dark:text-white light:text-slate-900 font-mono tracking-wide">{alert.symbol}</span>
                                                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold tracking-wider"
                                                    style={{ background: `${meta?.color || '#13ec37'}15`, color: meta?.color || '#13ec37' }}>
                                                    {meta?.icon} {meta?.label}
                                                </span>
                                            </div>
                                            {/* Filter badges */}
                                            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                                                {alert.timeframes && (alert.timeframes as string[]).length > 0 ? (
                                                    (alert.timeframes as string[]).map(tf => (
                                                        <span key={tf} className="text-[9px] px-1.5 py-0.5 rounded dark:bg-white/5 light:bg-slate-100 dark:text-gray-400 light:text-slate-500 font-mono">{tf}</span>
                                                    ))
                                                ) : (
                                                    <span className="text-[9px] px-1.5 py-0.5 rounded dark:bg-white/5 light:bg-slate-100 dark:text-gray-500 light:text-slate-400">All TF</span>
                                                )}
                                                <span className="dark:text-gray-700 light:text-slate-300 text-[8px]">|</span>
                                                {alert.directions && (alert.directions as string[]).length > 0 ? (
                                                    (alert.directions as string[]).map(d => (
                                                        <span key={d} className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${d === 'BUY' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>{d}</span>
                                                    ))
                                                ) : (
                                                    <span className="text-[9px] px-1.5 py-0.5 rounded dark:bg-white/5 light:bg-slate-100 dark:text-gray-500 light:text-slate-400">Both</span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex items-center gap-1.5 shrink-0">
                                            <button onClick={() => {
                                                if (isEditing) { setEditingId(null); }
                                                else {
                                                    setEditingId(alert.id);
                                                    setEditTimeframes((alert.timeframes as string[]) || []);
                                                    setEditDirections((alert.directions as string[]) || []);
                                                }
                                            }}
                                                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${isEditing ? 'bg-primary/20 text-primary' : 'dark:text-gray-600 light:text-slate-400 hover:bg-white/5 hover:text-primary'}`}
                                                title="Edit filters">
                                                <span className="material-symbols-outlined text-sm">{isEditing ? 'close' : 'tune'}</span>
                                            </button>

                                            {/* Active/Pause Toggle */}
                                            <button onClick={() => toggleActive(alert)}
                                                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${alert.isActive
                                                    ? 'text-green-400 hover:bg-green-500/10'
                                                    : 'text-gray-500 hover:bg-yellow-500/10 hover:text-yellow-400'}`}
                                                title={alert.isActive ? 'Pause' : 'Resume'}>
                                                <span className="material-symbols-outlined text-sm">{alert.isActive ? 'pause_circle' : 'play_circle'}</span>
                                            </button>

                                            <button onClick={() => deleteAlert(alert.id)}
                                                className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-600 hover:bg-red-500/10 hover:text-red-400 transition-all"
                                                title="Delete">
                                                <span className="material-symbols-outlined text-sm">delete</span>
                                            </button>
                                        </div>
                                    </div>

                                    {/* Expanded edit panel */}
                                    {isEditing && (
                                        <div className="px-4 pb-4 border-t dark:border-white/5 light:border-slate-200 pt-4 space-y-4 animate-fade-in">
                                            {/* Edit Timeframes */}
                                            <div>
                                                <label className="block text-[10px] font-bold dark:text-gray-500 light:text-slate-400 uppercase tracking-widest mb-2">Timeframes</label>
                                                <div className="flex flex-wrap gap-2">
                                                    {TIMEFRAMES.map(tf => (
                                                        <button key={tf} type="button"
                                                            onClick={() => toggleTf(tf, editTimeframes, setEditTimeframes)}
                                                            className={`px-3 py-1.5 rounded-lg text-xs font-bold tracking-wider transition-all border ${editTimeframes.includes(tf)
                                                                ? 'bg-primary/20 text-primary border-primary/40'
                                                                : 'dark:bg-white/[0.03] light:bg-slate-50 dark:text-gray-500 light:text-slate-400 dark:border-white/5 light:border-slate-200 hover:bg-primary/10'
                                                                }`}>
                                                            {tf}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                            {/* Edit Directions */}
                                            <div>
                                                <label className="block text-[10px] font-bold dark:text-gray-500 light:text-slate-400 uppercase tracking-widest mb-2">Direction</label>
                                                <div className="flex gap-2">
                                                    <button type="button"
                                                        onClick={() => toggleDir('BUY', editDirections, setEditDirections)}
                                                        className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all border flex items-center justify-center gap-1 ${editDirections.includes('BUY')
                                                            ? 'bg-green-500/15 text-green-400 border-green-500/30'
                                                            : 'dark:bg-white/[0.03] light:bg-slate-50 dark:text-gray-500 light:text-slate-400 dark:border-white/5 light:border-slate-200'}`}>
                                                        ▲ BUY
                                                    </button>
                                                    <button type="button"
                                                        onClick={() => toggleDir('SELL', editDirections, setEditDirections)}
                                                        className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all border flex items-center justify-center gap-1 ${editDirections.includes('SELL')
                                                            ? 'bg-red-500/15 text-red-400 border-red-500/30'
                                                            : 'dark:bg-white/[0.03] light:bg-slate-50 dark:text-gray-500 light:text-slate-400 dark:border-white/5 light:border-slate-200'}`}>
                                                        ▼ SELL
                                                    </button>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => saveEdits(alert)}
                                                className="w-full py-2.5 rounded-xl bg-primary/90 text-black font-bold text-xs transition-all hover:bg-primary flex items-center justify-center gap-2">
                                                <span className="material-symbols-outlined text-sm">save</span>
                                                Save Changes
                                            </button>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
