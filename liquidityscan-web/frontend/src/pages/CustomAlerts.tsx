import { useState, useEffect } from 'react';
import { userApi } from '../services/userApi';
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

export default function CustomAlerts() {
    const [telegramId, setTelegramId] = useState('');
    const [isSavedTelegramId, setIsSavedTelegramId] = useState(false);
    const [alerts, setAlerts] = useState<AlertSubscription[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const [newSymbol, setNewSymbol] = useState('');
    const [newStrategy, setNewStrategy] = useState(STRATEGIES[0].value);

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
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-fade-in relative z-10 px-4 sm:px-0">

            {/* Header */}
            <div>
                <h1 className="text-2xl sm:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r dark:from-white dark:to-gray-400 light:from-slate-800 light:to-slate-500 mb-2">
                    Custom Telegram Alerts
                </h1>
                <p className="dark:text-gray-400 light:text-slate-500 text-sm sm:text-base">
                    Connect your Telegram account and track specific coins to receive instant notifications the second a signal is detected.
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Left Column: Telegram Setup & Add Alert Form */}
                <div className="lg:col-span-1 space-y-6">

                    {/* Step 1: Telegram Connection */}
                    <div className="glass-panel p-6 rounded-2xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-full -z-10 transition-transform group-hover:scale-110"></div>

                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                                <span className="material-symbols-outlined text-blue-400 text-sm">send</span>
                            </div>
                            <h2 className="text-lg font-bold dark:text-white light:text-slate-900">1. Connect Telegram</h2>
                        </div>

                        <div className="space-y-4">
                            <p className="text-xs dark:text-gray-400 light:text-slate-500 leading-relaxed">
                                To receive alerts, start a chat with our bot and get your Chat ID. <br /><br />
                                1. Open Telegram and search for <strong className="text-primary hover:underline cursor-pointer">@LiquidityScanBot</strong><br />
                                2. Send <code className="dark:bg-white/10 light:bg-slate-200 px-1 py-0.5 rounded">/start</code> to the bot<br />
                                3. The bot will reply with your Chat ID. Paste it below.
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
                                        className="glass-input w-full px-3 py-2 rounded-lg text-sm transition-all focus:ring-primary/30"
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
                    <div className={`glass-panel p-6 rounded-2xl relative overflow-hidden transition-all duration-300 ${!isSavedTelegramId ? 'opacity-50 pointer-events-none' : ''}`}>
                        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-full -z-10"></div>

                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                                <span className="material-symbols-outlined text-primary text-sm">add_alert</span>
                            </div>
                            <h2 className="text-lg font-bold dark:text-white light:text-slate-900">2. Track a Coin</h2>
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
                                    className="glass-input w-full px-4 py-2.5 rounded-lg text-sm font-mono uppercase"
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
                                    className="glass-input w-full px-4 py-2.5 rounded-lg text-sm appearance-none cursor-pointer"
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
                <div className="lg:col-span-2">
                    <div className="glass-panel rounded-2xl overflow-hidden shadow-glow-light-md dark:shadow-none h-full flex flex-col">
                        <div className="p-6 border-b dark:border-white/5 light:border-slate-200 dark:bg-white/[0.02] light:bg-slate-50 flex justify-between items-center">
                            <h2 className="text-lg font-bold dark:text-white light:text-slate-900 flex items-center gap-2">
                                <span className="material-symbols-outlined text-primary">notifications_active</span>
                                My Active Alerts ({alerts.length})
                            </h2>
                        </div>

                        <div className="p-6 flex-1 overflow-y-auto">
                            {!isSavedTelegramId ? (
                                <div className="h-full flex flex-col items-center justify-center text-center space-y-4 py-12">
                                    <div className="w-16 h-16 rounded-full dark:bg-white/5 light:bg-slate-100 flex items-center justify-center">
                                        <span className="material-symbols-outlined text-3xl dark:text-gray-600 light:text-slate-300">lock</span>
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-bold dark:text-gray-300 light:text-slate-700">Telegram Required</h3>
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
                                        <h3 className="text-sm font-bold dark:text-gray-300 light:text-slate-700">No Alerts Yet</h3>
                                        <p className="text-xs dark:text-gray-500 light:text-slate-500 mt-1 max-w-xs">
                                            Use the panel on the left to start tracking your favorite coins and strategies.
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {alerts.map(alert => (
                                        <div key={alert.id} className="dark:bg-white/[0.03] light:bg-white rounded-xl p-4 border dark:border-white/5 light:border-slate-200 flex items-center justify-between group hover:border-primary/30 transition-colors shadow-sm">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full dark:bg-background-dark light:bg-slate-100 flex items-center justify-center border dark:border-white/5 light:border-slate-200">
                                                    <span className="text-xs font-bold text-primary font-mono">{alert.symbol.substring(0, 3)}</span>
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-sm dark:text-white light:text-slate-900 font-mono tracking-wide">{alert.symbol}</h4>
                                                    <p className="text-[10px] dark:text-gray-400 light:text-slate-500 uppercase tracking-widest">{STRATEGIES.find(s => s.value === alert.strategyType)?.label}</p>
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
