import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuthStore } from '../store/authStore';
import { userApi } from '../services/userApi';
import { PaymentWidget } from '../components/PaymentWidget';

const FREE_FEATURES = [
  { text: 'BTC, ETH, XAU, XAG only', included: true },
  { text: '1 RSI signal / day', included: true },
  { text: '1 ICT Bias signal / day', included: true },
  { text: '24h history', included: true },
  { text: '400+ pairs', included: false },
  { text: 'All strategies', included: false },
  { text: 'Telegram alerts', included: false },
  { text: 'Full archive & stats', included: false },
];

const PRO_FEATURES = [
  { text: '500+ pairs (all markets)', included: true },
  { text: 'Unlimited RSI signals', included: true },
  { text: 'Unlimited ICT Bias signals', included: true },
  { text: 'Full history & archive', included: true },
  { text: 'All SE variants (Plus/Fractals)', included: true },
  { text: '15+ strategy presets', included: true },
  { text: 'Telegram God Mode alerts', included: true },
  { text: 'Priority support', included: true },
];

export function Subscriptions() {
  const { user } = useAuthStore();
  const [showPayment, setShowPayment] = useState(false);
  const [tier, setTier] = useState<any>(null);

  useEffect(() => {
    userApi.getTier().then(setTier).catch(() => { });
  }, []);

  const isPaid = tier?.isPaid || user?.subscriptionId;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 md:p-8 max-w-5xl mx-auto space-y-8"
    >
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl md:text-4xl font-black dark:text-white light:text-text-dark mb-2">
          {isPaid ? '🎉 You\'re Pro!' : 'Upgrade to Pro'}
        </h1>
        <p className="dark:text-gray-400 light:text-text-light-secondary max-w-lg mx-auto">
          {isPaid
            ? 'Full access unlocked. All strategies, unlimited signals, Telegram alerts.'
            : 'Unlock 500+ pairs, all strategies, and Telegram God Mode alerts.'
          }
        </p>
      </div>

      {/* Current Status */}
      {isPaid && (
        <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="glass-panel rounded-2xl p-6 border border-primary/30 bg-primary/5 text-center">
          <div className="flex items-center justify-center gap-3 mb-3">
            <span className="material-symbols-outlined text-primary text-3xl">workspace_premium</span>
            <span className="text-2xl font-black text-primary">PRO ACTIVE</span>
          </div>
          <p className="text-sm dark:text-gray-400 light:text-gray-500">
            Tier: <strong className="text-primary">{tier?.tier || 'PAID'}</strong>
            {user?.subscriptionExpiresAt && (
              <> · Expires: <strong className="dark:text-white light:text-text-dark">{new Date(user.subscriptionExpiresAt as string).toLocaleDateString()}</strong></>
            )}
          </p>
        </motion.div>
      )}

      {/* Plan Comparison */}
      {!showPayment && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* FREE Card */}
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}
            className="glass-panel rounded-2xl overflow-hidden border dark:border-white/10 light:border-gray-200 flex flex-col">
            <div className="p-6 border-b dark:border-white/5 light:border-gray-100">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl dark:bg-white/5 light:bg-gray-100 flex items-center justify-center">
                  <span className="material-symbols-outlined dark:text-gray-400 light:text-gray-500">person</span>
                </div>
                <div>
                  <h3 className="text-lg font-bold dark:text-white light:text-text-dark">Free</h3>
                  <p className="text-[10px] dark:text-gray-500 light:text-gray-400 uppercase tracking-widest">Starter</p>
                </div>
              </div>
              <div className="text-3xl font-black dark:text-white light:text-text-dark">$0<span className="text-sm font-normal dark:text-gray-500 light:text-gray-400">/forever</span></div>
            </div>
            <div className="p-6 space-y-3">
              {FREE_FEATURES.map(f => (
                <div key={f.text} className="flex items-center gap-3 text-sm">
                  <span className={`material-symbols-outlined text-base ${f.included ? 'text-primary' : 'dark:text-gray-700 light:text-gray-300'}`}>
                    {f.included ? 'check_circle' : 'cancel'}
                  </span>
                  <span className={f.included ? 'dark:text-gray-300 light:text-gray-600' : 'dark:text-gray-600 light:text-gray-400 line-through'}>
                    {f.text}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* PRO Card */}
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}
            className="glass-panel rounded-2xl overflow-hidden border-2 border-primary/40 relative flex flex-col">
            {/* Popular Badge */}
            <div className="absolute top-4 right-4 bg-primary text-black text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider">
              Most Popular
            </div>
            <div className="p-6 border-b border-primary/10 bg-primary/[0.03]">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center border border-primary/30">
                  <span className="material-symbols-outlined text-primary">diamond</span>
                </div>
                <div>
                  <h3 className="text-lg font-bold dark:text-white light:text-text-dark">Pro</h3>
                  <p className="text-[10px] text-primary uppercase tracking-widest font-bold">Full Access</p>
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black dark:text-white light:text-text-dark">$24.50</span>
                <span className="text-sm dark:text-gray-500 light:text-gray-400 line-through">$49</span>
                <span className="text-sm dark:text-gray-400 light:text-gray-500">/1st month</span>
              </div>
              <p className="text-xs text-primary mt-1">50% OFF first month • Then $49/mo</p>
            </div>
            <div className="p-6 space-y-3">
              {PRO_FEATURES.map(f => (
                <div key={f.text} className="flex items-center gap-3 text-sm">
                  <span className="material-symbols-outlined text-base text-primary">check_circle</span>
                  <span className="dark:text-gray-300 light:text-gray-600">{f.text}</span>
                </div>
              ))}
              {/* Push button to bottom if contents are smaller */}
              <div className="flex-1"></div>
              {!isPaid && (
                <button
                  onClick={() => setShowPayment(true)}
                  className="w-full mt-4 py-4 md:py-3 rounded-2xl bg-primary text-black font-bold text-base transition-transform hover:scale-[1.02] active:scale-[0.98] shadow-[0_10px_30px_rgba(19,236,55,0.2)] flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-xl md:text-base">bolt</span>
                  Upgrade Now
                </button>
              )}
            </div>
          </motion.div>
        </div>
      )}

      {/* Payment Widget */}
      {showPayment && !isPaid && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <PaymentWidget
            onSuccess={() => { setShowPayment(false); window.location.reload(); }}
            onClose={() => setShowPayment(false)}
          />
        </motion.div>
      )}

      {/* Value Proposition */}
      {!isPaid && !showPayment && (
        <div className="glass-panel rounded-2xl p-6 border dark:border-white/5 light:border-gray-200">
          <h3 className="text-sm font-black dark:text-gray-400 light:text-gray-500 uppercase tracking-widest mb-4">Why Pro?</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { icon: 'trending_up', title: '90%+ Win Rate', desc: 'Proven on majors with SE + ICT Bias strategies' },
              { icon: 'notifications_active', title: 'Telegram Alerts', desc: 'Real-time PNG signal cards pushed to your phone' },
              { icon: 'query_stats', title: '15+ Strategies', desc: 'SE, RSI Divergence, ICT Bias, Strategy 1, and more' },
            ].map(item => (
              <div key={item.title} className="p-4 rounded-xl dark:bg-white/[0.02] light:bg-gray-50 border dark:border-white/5 light:border-gray-200">
                <span className="material-symbols-outlined text-primary text-2xl mb-2 block">{item.icon}</span>
                <h4 className="font-bold dark:text-white light:text-text-dark text-sm mb-1">{item.title}</h4>
                <p className="text-xs dark:text-gray-400 light:text-gray-500">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}
