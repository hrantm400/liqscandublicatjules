import { useState, useEffect, useCallback } from 'react';
import { userApi } from '../services/userApi';
import { toast } from 'react-hot-toast';

interface PaymentWidgetProps {
    onSuccess?: () => void;
    onClose?: () => void;
}

const PRICING = {
    monthly: { original: 49, current: 24.50, label: 'Monthly', plan: 'monthly' },
    annual: { original: 588, current: 490, label: 'Annual', plan: 'annual' },
};

export function PaymentWidget({ onSuccess, onClose }: PaymentWidgetProps) {
    const [step, setStep] = useState<'checkout' | 'generating' | 'awaiting' | 'success'>('checkout');
    const [plan, setPlan] = useState<'monthly' | 'annual'>('monthly');
    const [timeLeft, setTimeLeft] = useState(900);
    const [copied, setCopied] = useState(false);
    const [paymentId, setPaymentId] = useState('');
    const [paymentUrl, setPaymentUrl] = useState('');

    // Polling for payment confirmation
    const checkPaymentStatus = useCallback(async () => {
        if (!paymentId || step !== 'awaiting') return;
        try {
            const status = await userApi.getPaymentStatus(paymentId);
            if (status.status === 'completed') {
                setStep('success');
                toast.success('Payment confirmed! 🎉');
                onSuccess?.();
            }
        } catch { /* silent */ }
    }, [paymentId, step, onSuccess]);

    useEffect(() => {
        let timer: ReturnType<typeof setInterval>;
        if (step === 'awaiting' && timeLeft > 0) {
            timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
        }
        return () => clearInterval(timer);
    }, [step, timeLeft]);

    // Poll every 10 seconds for payment confirmation
    useEffect(() => {
        let poll: ReturnType<typeof setInterval>;
        if (step === 'awaiting') {
            poll = setInterval(checkPaymentStatus, 10000);
        }
        return () => clearInterval(poll);
    }, [step, checkPaymentStatus]);

    const formatTime = (s: number) => {
        const m = Math.floor(s / 60).toString().padStart(2, '0');
        const sec = (s % 60).toString().padStart(2, '0');
        return `${m}:${sec}`;
    };

    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handlePay = async () => {
        setStep('generating');
        try {
            const price = PRICING[plan];
            const result = await userApi.createPayment(
                price.current,
                'USD',
                undefined
            );
            setPaymentId(result.id);
            setPaymentUrl(result.paymentUrl || '');
            setStep('awaiting');
        } catch (e: any) {
            toast.error(e.message || 'Payment failed');
            setStep('checkout');
        }
    };

    const selected = PRICING[plan];

    return (
        <div className="w-full max-w-[440px] mx-auto">
            <div className="rounded-3xl border dark:border-white/10 light:border-green-300 dark:bg-surface-dark/90 light:bg-white backdrop-blur-xl overflow-hidden shadow-2xl">
                <div className="p-6 md:p-8">

                    {/* Header */}
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center border border-primary/30">
                                <span className="material-symbols-outlined text-primary text-2xl">diamond</span>
                            </div>
                            <div>
                                <h2 className="text-xl font-black dark:text-white light:text-text-dark uppercase tracking-wide">Full Access</h2>
                                <p className="text-[10px] text-primary font-bold tracking-[0.2em] uppercase">Scanner Pro</p>
                            </div>
                        </div>
                        {onClose && (
                            <button onClick={onClose} className="w-8 h-8 rounded-lg dark:bg-white/5 light:bg-gray-100 flex items-center justify-center dark:text-gray-400 light:text-gray-500 hover:text-white transition-colors">
                                <span className="material-symbols-outlined text-lg">close</span>
                            </button>
                        )}
                    </div>

                    {/* CHECKOUT */}
                    {step === 'checkout' && (
                        <div className="space-y-5 animate-fade-in">
                            {/* Plan Cards */}
                            <div className="space-y-3">
                                {/* Monthly */}
                                <div
                                    onClick={() => setPlan('monthly')}
                                    className={`relative cursor-pointer rounded-2xl p-4 transition-all border ${plan === 'monthly'
                                            ? 'bg-primary/[0.08] border-primary/40 shadow-[inset_0_0_20px_rgba(19,236,55,0.05)]'
                                            : 'dark:bg-white/[0.02] light:bg-gray-50 dark:border-white/5 light:border-gray-200 hover:dark:border-white/10 hover:light:border-green-300'
                                        }`}
                                >
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <div className="dark:text-white light:text-text-dark font-semibold flex items-center gap-2">
                                                Monthly
                                                <span className="bg-primary/20 text-primary text-[10px] uppercase font-bold px-2 py-0.5 rounded-md border border-primary/30">-50% 1st Month</span>
                                            </div>
                                            <div className="text-sm dark:text-gray-400 light:text-gray-500 mt-1">Full platform features</div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-xl font-bold dark:text-white light:text-text-dark">${PRICING.monthly.current.toFixed(2)}</div>
                                            <div className="text-xs dark:text-gray-600 light:text-gray-400 line-through">${PRICING.monthly.original.toFixed(2)}</div>
                                        </div>
                                    </div>
                                    <div className={`absolute top-1/2 -left-px -translate-y-1/2 w-1 h-8 rounded-r-full transition-all ${plan === 'monthly' ? 'bg-primary shadow-[0_0_10px_rgba(19,236,55,0.8)]' : 'bg-transparent'}`} />
                                </div>

                                {/* Annual */}
                                <div
                                    onClick={() => setPlan('annual')}
                                    className={`relative cursor-pointer rounded-2xl p-4 transition-all border ${plan === 'annual'
                                            ? 'bg-primary/[0.08] border-primary/40 shadow-[inset_0_0_20px_rgba(19,236,55,0.05)]'
                                            : 'dark:bg-white/[0.02] light:bg-gray-50 dark:border-white/5 light:border-gray-200 hover:dark:border-white/10 hover:light:border-green-300'
                                        }`}
                                >
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <div className="dark:text-white light:text-text-dark font-semibold">Annual</div>
                                            <div className="text-sm text-primary mt-1">Save $98 per year</div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-xl font-bold dark:text-white light:text-text-dark">${PRICING.annual.current}</div>
                                            <div className="text-xs dark:text-gray-600 light:text-gray-400 line-through">${PRICING.annual.original}</div>
                                        </div>
                                    </div>
                                    <div className={`absolute top-1/2 -left-px -translate-y-1/2 w-1 h-8 rounded-r-full transition-all ${plan === 'annual' ? 'bg-primary shadow-[0_0_10px_rgba(19,236,55,0.8)]' : 'bg-transparent'}`} />
                                </div>
                            </div>

                            {/* Features */}
                            <div className="pt-1 pb-1 space-y-2">
                                {[
                                    '500+ Pairs & All Strategies',
                                    'Telegram God Mode Alerts',
                                    'Full Signal Archive & Stats',
                                    'Priority Support'
                                ].map(f => (
                                    <div key={f} className="flex items-center gap-3 text-sm dark:text-gray-300 light:text-gray-600">
                                        <span className="material-symbols-outlined text-primary text-base">check_circle</span>
                                        {f}
                                    </div>
                                ))}
                            </div>

                            {/* Pay Button */}
                            <button
                                onClick={handlePay}
                                className="w-full relative group overflow-hidden rounded-2xl bg-primary text-black font-bold text-lg py-4 transition-transform hover:scale-[1.02] active:scale-[0.98] shadow-[0_10px_30px_rgba(19,236,55,0.2)]"
                            >
                                <div className="relative flex items-center justify-center gap-2 z-10">
                                    <span className="material-symbols-outlined">payments</span>
                                    Pay ${selected.current.toFixed(2)} USDT
                                </div>
                            </button>

                            <div className="flex items-center justify-center gap-1.5 text-xs dark:text-gray-500 light:text-gray-400 font-medium tracking-wide">
                                <span className="material-symbols-outlined text-sm">shield</span>
                                SECURE WEB3 CHECKOUT
                            </div>
                        </div>
                    )}

                    {/* GENERATING */}
                    {step === 'generating' && (
                        <div className="py-16 flex flex-col items-center justify-center space-y-8 animate-fade-in">
                            <div className="relative w-24 h-24 flex items-center justify-center">
                                <div className="absolute inset-0 border-[3px] dark:border-white/5 light:border-gray-200 rounded-full" />
                                <div className="absolute inset-0 border-[3px] border-primary rounded-full border-t-transparent animate-spin" />
                                <span className="material-symbols-outlined text-primary text-3xl">account_balance_wallet</span>
                            </div>
                            <div className="text-center space-y-2">
                                <h3 className="text-lg font-semibold dark:text-white light:text-text-dark">Preparing Transaction</h3>
                                <p className="text-sm dark:text-gray-400 light:text-gray-500">Creating secure payment...</p>
                            </div>
                        </div>
                    )}

                    {/* AWAITING PAYMENT */}
                    {step === 'awaiting' && (
                        <div className="space-y-5 animate-fade-in">
                            {/* Status Bar */}
                            <div className="flex justify-between items-center dark:bg-white/[0.02] light:bg-gray-50 border dark:border-white/5 light:border-gray-200 p-3 rounded-2xl">
                                <div className="flex items-center gap-2">
                                    <span className="relative flex h-2.5 w-2.5">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary" />
                                    </span>
                                    <span className="text-sm font-medium dark:text-gray-300 light:text-gray-600">Awaiting Deposit</span>
                                </div>
                                <div className="flex items-center gap-1.5 text-primary bg-primary/10 px-3 py-1.5 rounded-xl border border-primary/20">
                                    <span className="material-symbols-outlined text-base">schedule</span>
                                    <span className="font-semibold text-sm tracking-widest font-mono">{formatTime(timeLeft)}</span>
                                </div>
                            </div>

                            {/* Amount */}
                            <div className="dark:bg-white/[0.02] light:bg-gray-50 rounded-2xl p-4 border dark:border-white/5 light:border-gray-200">
                                <div className="text-[10px] dark:text-gray-500 light:text-gray-400 uppercase tracking-widest font-semibold mb-1">Send exactly</div>
                                <div className="flex items-center justify-between">
                                    <div className="text-2xl font-black dark:text-white light:text-text-dark flex items-center gap-2">
                                        {selected.current.toFixed(2)} <span className="text-primary text-lg">USDT</span>
                                    </div>
                                    <button
                                        onClick={() => handleCopy(selected.current.toString())}
                                        className="w-10 h-10 flex items-center justify-center dark:bg-white/5 light:bg-gray-100 hover:bg-primary/20 rounded-xl transition-all"
                                    >
                                        <span className="material-symbols-outlined text-base dark:text-gray-400 light:text-gray-500">{copied ? 'check' : 'content_copy'}</span>
                                    </button>
                                </div>
                            </div>

                            {/* Payment Link */}
                            {paymentUrl && (
                                <a
                                    href={paymentUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="block w-full py-3 rounded-2xl bg-primary text-black font-bold text-center transition-transform hover:scale-[1.02] active:scale-[0.98]"
                                >
                                    Open Payment Page →
                                </a>
                            )}

                            <div className="dark:bg-white/[0.02] light:bg-gray-50 rounded-2xl p-4 border dark:border-white/5 light:border-gray-200">
                                <div className="flex justify-between items-center mb-2">
                                    <div className="text-[10px] dark:text-gray-500 light:text-gray-400 uppercase tracking-widest font-semibold">Network</div>
                                    <div className="text-[10px] bg-red-500/10 text-red-400 px-2 py-1 rounded-md font-bold tracking-wide">TRC20</div>
                                </div>
                                <p className="text-xs dark:text-gray-400 light:text-gray-500 leading-relaxed">
                                    Send USDT via <strong className="text-primary">TRC20 network only</strong>. Other networks will result in lost funds.
                                </p>
                            </div>

                            <p className="text-center text-[10px] dark:text-gray-600 light:text-gray-400">
                                Payment is verified automatically. This page will update when confirmed.
                            </p>
                        </div>
                    )}

                    {/* SUCCESS */}
                    {step === 'success' && (
                        <div className="py-12 flex flex-col items-center justify-center space-y-6 animate-fade-in">
                            <div className="relative w-24 h-24 flex items-center justify-center">
                                <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full" />
                                <div className="w-20 h-20 rounded-full bg-primary/20 border-2 border-primary flex items-center justify-center relative z-10">
                                    <span className="material-symbols-outlined text-primary text-4xl">check_circle</span>
                                </div>
                            </div>
                            <div className="text-center space-y-2">
                                <h2 className="text-2xl font-black dark:text-white light:text-text-dark">Access Granted</h2>
                                <p className="text-primary font-medium tracking-wide">Payment verified ✓</p>
                                <p className="text-sm dark:text-gray-400 light:text-gray-500 pt-2 leading-relaxed">
                                    Full platform access and Telegram alerts<br />have been unlocked.
                                </p>
                            </div>
                            <button
                                onClick={() => { onSuccess?.(); onClose?.(); window.location.href = '/dashboard'; }}
                                className="mt-4 px-10 py-4 bg-primary hover:bg-primary/90 text-black font-bold rounded-2xl transition-all flex items-center gap-2 shadow-[0_10px_30px_rgba(19,236,55,0.3)]"
                            >
                                ENTER PLATFORM <span className="material-symbols-outlined">arrow_forward</span>
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
