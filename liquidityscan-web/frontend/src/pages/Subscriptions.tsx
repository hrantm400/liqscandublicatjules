import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { userApi } from '../services/userApi';
import { SubscriptionCard } from '../components/subscriptions/SubscriptionCard';
import { FeatureComparison } from '../components/subscriptions/FeatureComparison';
import { BackgroundEffects } from '../components/subscriptions/BackgroundEffects';
import { useAuthStore } from '../store/authStore';

const faqs = [
  {
    question: 'Is Free Forever really free?',
    answer:
      'Yes. Free Forever is free forever. No credit card required. You get BTC, ETH, EURUSD, XAUUSD on 4H and Daily with standard REV/RUN signals.',
  },
  {
    question: 'What pairs and timeframes are included?',
    answer:
      'Free Forever includes BTC, ETH (crypto) and EURUSD, XAUUSD (forex) on 4H and Daily timeframes only.',
  },
  {
    question: 'What are the limits?',
    answer:
      'No Order Blocks or RSI Divergence filters on Free Forever. Only standard REV/RUN signals.',
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] },
  },
};

export function Subscriptions() {
  const { isAuthenticated } = useAuthStore();
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  const { data: subscriptions, isLoading: subscriptionsLoading } = useQuery({
    queryKey: ['subscriptions'],
    queryFn: () => userApi.getSubscriptions(),
  });

  const { data: mySubscription } = useQuery({
    queryKey: ['mySubscription'],
    queryFn: () => userApi.getMySubscription(),
    enabled: isAuthenticated,
  });

  if (subscriptionsLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#0a0a0a] flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-10 h-10 border-2 border-emerald-400/40 border-t-emerald-500 rounded-full"
        />
      </div>
    );
  }

  const plans =
    subscriptions?.filter((s: any) => ['SCOUT', 'FULL_ACCESS'].includes(s.tier)).sort((a: any, b: any) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)) || [];

  return (
    <div className="min-h-screen relative overflow-hidden bg-slate-50 dark:bg-[#0a0a0a]">
      <BackgroundEffects />

      {/* Hero: calm, readable */}
      <section className="relative z-10 pt-28 pb-16 md:pt-32 md:pb-20 px-6 sm:px-8">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-4"
          >
            <motion.span
              variants={itemVariants}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-xs font-medium tracking-wide"
            >
              No credit card · Start in seconds
            </motion.span>
            <motion.h1
              variants={itemVariants}
              className="text-4xl sm:text-5xl font-bold text-slate-900 dark:text-white tracking-tight"
            >
              Simple pricing
            </motion.h1>
            <motion.p
              variants={itemVariants}
              className="text-lg text-slate-600 dark:text-slate-400 max-w-xl mx-auto"
            >
              Free Forever to try, or Full Access for all pairs and filters.
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* Plans */}
      {plans.length > 0 && (
        <section className="relative z-10 px-6 sm:px-8 pb-20 md:pb-28">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="max-w-4xl mx-auto"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
              {plans.map((subscription: any, index: number) => (
                <SubscriptionCard
                  key={subscription.id}
                  subscription={subscription}
                  currentSubscriptionId={mySubscription?.subscription?.id}
                  index={index}
                />
              ))}
            </div>
          </motion.div>
        </section>
      )}

      {/* Comparison */}
      {plans.length > 0 && (
        <section className="relative z-10 px-6 sm:px-8 pb-20 md:pb-28">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.45 }}
            className="max-w-4xl mx-auto"
          >
            <h2 className="text-2xl font-semibold text-slate-900 dark:text-white text-center mb-8">
              What&apos;s included
            </h2>
            <FeatureComparison subscriptions={plans} />
          </motion.div>
        </section>
      )}

      {/* FAQ */}
      <section className="relative z-10 px-6 sm:px-8 pb-24 md:pb-32">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl font-semibold text-slate-900 dark:text-white text-center mb-10">
            FAQ
          </h2>
          <motion.div
            className="space-y-2"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-40px' }}
          >
            {faqs.map((faq, index) => (
              <motion.div
                key={index}
                variants={itemVariants}
                className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 overflow-hidden transition-colors hover:border-slate-300 dark:hover:border-slate-700"
                onClick={() => setExpandedFaq(expandedFaq === index ? null : index)}
              >
                <button
                  type="button"
                  className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left"
                >
                  <span className="font-medium text-slate-900 dark:text-white">
                    {faq.question}
                  </span>
                  <motion.span
                    animate={{ rotate: expandedFaq === index ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                    className="text-slate-400 dark:text-slate-500 flex-shrink-0"
                  >
                    <span className="material-symbols-outlined text-xl">expand_more</span>
                  </motion.span>
                </button>
                <motion.div
                  initial={false}
                  animate={{
                    height: expandedFaq === index ? 'auto' : 0,
                    opacity: expandedFaq === index ? 1 : 0,
                  }}
                  transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                  className="overflow-hidden"
                >
                  <p className="px-5 pb-4 pt-0 text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                    {faq.answer}
                  </p>
                </motion.div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 px-6 sm:px-8 py-10 border-t border-slate-200 dark:border-slate-800">
        <div className="max-w-4xl mx-auto flex flex-wrap items-center justify-center gap-6 text-sm text-slate-500 dark:text-slate-500">
          <span className="flex items-center gap-2">
            <span className="material-symbols-outlined text-emerald-500 text-lg">check_circle</span>
            Free Forever
          </span>
          <span className="flex items-center gap-2">
            <span className="material-symbols-outlined text-lg">lock_open</span>
            No credit card
          </span>
          <span>Cancel anytime</span>
        </div>
      </footer>
    </div>
  );
}
