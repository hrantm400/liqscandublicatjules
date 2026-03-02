import { useState, useEffect } from 'react';
import { userApi } from '../../services/userApi';
import { toast } from 'react-hot-toast';

interface AlertSubscription {
    id: string;
    symbol: string;
    strategyType: string;
    createdAt: string;
}

const STRATEGIES = [
    { value: 'SUPER_ENGULFING', label: 'Super Engulfing' },
    { value: 'RSI_DIVERGENCE', label: 'RSI Divergence' },
    { value: 'ICT_BIAS', label: 'ICT Bias' },
    { value: 'STRATEGY_1', label: 'Strategy 1 (4H SE + 5M Break)' },
    { value: 'CONFLUENCE', label: 'Confluence (Pro)' },
];

const COMMON_COINS = [
    'BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'XRPUSDT', 'ADAUSDT', 'DOGEUSDT', 'DOTUSDT', 'AVAXUSDT', 'LINKUSDT'
];

export function TelegramAlertsConfig() {
    const [telegramId, setTelegramId] = useState('');
    const [isSavedTelegramId, setIsSavedTelegramId] = useState(false);
    const [alerts, setAlerts] = useState<AlertSubscription[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const [newSymbol, setNewSymbol] = useState('');
    const [newStrategy, setNewStrategy] = useState(STRATEGIES[0].value);

    // Filter alerts to not include strategy 1 or confluence based on original file context if needed. 
    // Wait, the original had it. I'll keep it exactly as it was.

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
        } catch (error: any) {
            toast.error('Failed to load alerts data');
        } finally {
            setIsLoading(false);
        }
    };

    const saveTelegramId = async () => {
        if (!telegramId.trim()) {
            toast.error('Please enter a valid Telegram ID');
            return;
        }
        try {
            await userApi.saveTelegramId(telegramId.trim());
            setIsSavedTelegramId(true);
            toast.success('Telegram ID saved successfully!');
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to save Telegram ID');
        }
    };

    const createAlert = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newSymbol.trim()) {
            toast.error('Please enter a coin symbol');
            return;
        }

        // Auto-append USDT if user just typed 'BTC'
        let symbolToSave = newSymbol.trim().toUpperCase();
        if (!symbolToSave.endsWith('USDT') && !symbolToSave.endsWith('USD')) {
            symbolToSave += 'USDT';
        }

        try {
            const res = await userApi.createAlert(symbolToSave, newStrategy);
            setAlerts([res, ...alerts]);
            setNewSymbol('');
            toast.success(`Now tracking ${symbolToSave}`);
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to create alert');
        }
    };

    const deleteAlert = async (id: string) => {
        try {
            await userApi.deleteAlert(id);
            setAlerts(alerts.filter(a => a.id !== id));
            toast.success('Alert removed');
        } catch (error: any) {
            toast.error('Failed to delete alert');
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[200px] w-full border dark:border-white/5 light:border-green-300 rounded-xl">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6 w-full animate-fade-in relative z-10 px-0 mt-6 pt-6 border-t dark:border-white/10 light:border-slate-200">
            {/* Header */}
            <div>
                <h2 className="text-xl font-bold dark:text-white light:text-text-dark mb-2">
                    Telegram Signal Alerts
                </h2>
                <p className="dark:text-gray-400 light:text-slate-500 text-sm">
                    Connect your Telegram account and track specific coins to receive instant image notifications.
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">
                {/* Left Column: Telegram Setup & Add Alert Form */}
                <div className="space-y-6">
                    {/* Step 1: Telegram Connection */}
                    <div className="glass-panel p-6 rounded-2xl border dark:border-white/5 light:border-green-300 dark:bg-surface-dark/60 light:bg-white relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-full -z-10 transition-transform group-hover:scale-110"></div>

                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                                <span className="material-symbols-outlined text-blue-400 text-sm">send</span>
                            </div>
                            <h3 className="text-lg font-bold dark:text-white light:text-slate-900">1. Connect Telegram</h3>
                        </div>

                        <div className="space-y-4">
                            <p className="text-xs dark:text-gray-400 light:text-slate-500 leading-relaxed">
                                1. Open Telegram and find <strong className="text-primary hover:underline cursor-pointer">@LiquidityScanBot</strong><br />
                                2. Send <code className="dark:bg-white/10 light:bg-slate-200 px-1 py-0.5 rounded">/start</code> to the bot<br />
                                3. Paste your Chat ID below.
                            </p>

                            <div>
                                <label className="block text-[10px] font-bold dark:text-gray-500 light:text-slate-400 uppercase tracking-widest mb-1.5">
                                    Your Chat ID
                                </label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={telegramId}
                                        onChange={(e) => {
                                            setTelegramId(e.target.value);
                                            if (isSavedTelegramId) setIsSavedTelegramId(false);
                                        }}
                                        placeholder="e.g. 123456789"
                                        className="glass-input w-full px-3 py-2 rounded-lg text-sm border dark:border-white/10 light:border-slate-300 transition-all focus:ring-primary/30"
                                    />
                                    <button
                                        onClick={saveTelegramId}
                                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${isSavedTelegramId
                                            ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                                            : 'bg-primary text-black hover:bg-primary-hover shadow-glow'
                                            }`}
                                    >
                                        {isSavedTelegramId ? 'Saved' : 'Save'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Step 2: Add Alert */}
                    <div className={`glass-panel p-6 rounded-2xl border dark:border-white/5 light:border-green-300 dark:bg-surface-dark/60 light:bg-white relative overflow-hidden transition-all duration-300 ${!isSavedTelegramId ? 'opacity-50 pointer-events-none' : ''}`}>
                        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-full -z-10"></div>

                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                                <span className="material-symbols-outlined text-primary text-sm">add_alert</span>
                            </div>
                            <h3 className="text-lg font-bold dark:text-white light:text-slate-900">2. Track a Coin</h3>
                        </div>

                        <form onSubmit={createAlert} className="space-y-4">
                            <div>
                                <label className="block text-[10px] font-bold dark:text-gray-500 light:text-slate-400 uppercase tracking-widest mb-1.5">
                                    Coin Symbol
                                </label>
                                <input
                                    type="text"
                                    value={newSymbol}
                                    onChange={(e) => setNewSymbol(e.target.value)}
                                    placeholder="e.g. BTCUSDT"
                                    className="glass-input w-full px-4 py-2.5 rounded-lg text-sm font-mono uppercase border dark:border-white/10 light:border-slate-300"
                                    required
                                />

                                {/* Quick select chips */}
                                <div className="flex flex-wrap gap-1.5 mt-2">
                                    {COMMON_COINS.slice(0, 5).map(coin => (
                                        <span
                                            key={coin}
                                            onClick={() => setNewSymbol(coin)}
                                            className="text-[10px] px-2 py-0.5 rounded-full dark:bg-white/5 light:bg-slate-200 dark:text-gray-400 light:text-slate-600 cursor-pointer hover:bg-primary/20 hover:text-primary transition-colors border dark:border-white/5 light:border-slate-300"
                                        >
                                            {coin.replace('USDT', '')}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-bold dark:text-gray-500 light:text-slate-400 uppercase tracking-widest mb-1.5">
                                    Strategy to Track
                                </label>
                                <select
                                    value={newStrategy}
                                    onChange={(e) => setNewStrategy(e.target.value)}
                                    className="glass-input w-full px-4 py-2.5 rounded-lg text-sm border dark:border-white/10 light:border-slate-300 appearance-none cursor-pointer"
                                >
                                    {STRATEGIES.map(s => (
                                        <option key={s.value} value={s.value} className="dark:bg-[#0b140d] light:bg-white">
                                            {s.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <button
                                type="submit"
                                className="w-full py-2.5 rounded-lg bg-white/5 hover:bg-primary/20 text-white hover:text-primary transition-colors border border-white/10 hover:border-primary/50 text-sm font-medium flex items-center justify-center gap-2"
                            >
                                <span className="material-symbols-outlined text-sm">add</span>
                                Start Tracking
                            </button>
                        </form>
                    </div>
                </div>

                {/* Right Column: Active Alerts List */}
                <div className="h-full flex flex-col">
                    <div className="glass-panel p-6 rounded-2xl border dark:border-white/5 light:border-green-300 dark:bg-surface-dark/60 light:bg-white flex-1 flex flex-col relative overflow-hidden">
                        <div className="mb-4 flex justify-between items-center">
                            <h3 className="text-lg font-bold dark:text-white light:text-slate-900 flex items-center gap-2">
                                <span className="material-symbols-outlined text-primary">notifications_active</span>
                                My Active Alerts ({alerts.length})
                            </h3>
                        </div>

                        <div className="flex-1 overflow-y-auto">
                            {!isSavedTelegramId ? (
                                <div className="h-full flex flex-col items-center justify-center text-center space-y-4 py-12">
                                    <div className="w-16 h-16 rounded-full dark:bg-white/5 light:bg-slate-100 flex items-center justify-center">
                                        <span className="material-symbols-outlined text-3xl dark:text-gray-600 light:text-slate-300">lock</span>
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-bold dark:text-gray-300 light:text-slate-700">Telegram Required</h4>
                                        <p className="text-xs dark:text-gray-500 light:text-slate-500 mt-1 max-w-xs">
                                            Connect your Telegram Chat ID first to start adding tracking alerts.
                                        </p>
                                    </div>
                                </div>
                            ) : alerts.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-center space-y-4 py-12">
                                    <div className="w-16 h-16 rounded-full dark:bg-primary/10 light:bg-primary/5 flex items-center justify-center">
                                        <span className="material-symbols-outlined text-3xl text-primary/50">notifications_off</span>
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-bold dark:text-gray-300 light:text-slate-700">No Alerts Yet</h4>
                                        <p className="text-xs dark:text-gray-500 light:text-slate-500 mt-1 max-w-xs">
                                            Use the form to start tracking coins.
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col gap-3">
                                    {alerts.map(alert => (
                                        <div key={alert.id} className="dark:bg-white/[0.03] light:bg-white rounded-xl p-3 border dark:border-white/5 light:border-slate-200 flex items-center justify-between group hover:border-primary/30 transition-colors shadow-sm">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-full dark:bg-background-dark light:bg-slate-100 flex items-center justify-center border dark:border-white/5 light:border-slate-200">
                                                    <span className="text-[10px] font-bold text-primary font-mono">{alert.symbol.substring(0, 3)}</span>
                                                </div>
                                                <div>
                                                    <div className="font-bold text-sm dark:text-white light:text-slate-900 font-mono tracking-wide leading-none">{alert.symbol}</div>
                                                    <div className="text-[10px] dark:text-gray-400 light:text-slate-500 uppercase tracking-widest mt-1">{STRATEGIES.find(s => s.value === alert.strategyType)?.label}</div>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => deleteAlert(alert.id)}
                                                className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 hover:bg-red-500/10 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                                                title="Stop tracking"
                                            >
                                                <span className="material-symbols-outlined text-sm">delete</span>
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
