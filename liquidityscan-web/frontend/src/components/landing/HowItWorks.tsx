import React from 'react';
import { motion } from 'framer-motion';
import { Cable, Sliders, LineChart, Wallet, ArrowRight } from 'lucide-react';

const steps = [
  {
    icon: <Cable className="w-6 h-6" />,
    title: "Connect Exchange",
    desc: "Link your Binance or Bybit account via read-only API keys. Your funds remain 100% safe."
  },
  {
    icon: <Sliders className="w-6 h-6" />,
    title: "Select Strategy",
    desc: "Choose from our pre-built institutional algorithms or customize parameters to fit your style."
  },
  {
    icon: <LineChart className="w-6 h-6" />,
    title: "Receive Signals",
    desc: "Get instant alerts via Telegram, Discord, or Webhook when high-probability setups are detected."
  },
  {
    icon: <Wallet className="w-6 h-6" />,
    title: "Execute & Profit",
    desc: "Enter trades with confidence using our defined invalidation levels and take-profit targets."
  }
];

export const HowItWorks: React.FC = () => {
  return (
    <section className="py-32 relative overflow-hidden">
      {/* Dynamic Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-0 w-1/3 h-1/3 bg-blue-500/5 blur-[100px] rounded-full" />
        <div className="absolute bottom-1/4 right-0 w-1/3 h-1/3 bg-primary/5 blur-[100px] rounded-full" />
      </div>

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <div className="text-center mb-24">
          <h2 className="font-display text-4xl md:text-5xl font-bold mb-6">
            How It <span className="text-primary text-glow">Works</span>
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto text-lg">
            From setup to first trade in under <span className="text-white font-bold">5 minutes</span>.
          </p>
        </div>

        <div className="relative">
          {/* Animated Connecting Line (Desktop) */}
          <div className="hidden md:block absolute top-12 left-0 w-full h-0.5 bg-white/5 z-0">
             <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/40 to-transparent w-1/3 mx-auto animate-[shimmer_3s_infinite_linear]"></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 relative z-10">
            {steps.map((step, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.2, duration: 0.6 }}
                className="relative group"
              >
                <div className="flex flex-col items-center text-center">
                  {/* Icon Container */}
                  <div className="relative w-24 h-24 mb-8">
                    <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <div className="w-full h-full rounded-2xl bg-[#0A0A0A] border border-white/10 flex items-center justify-center relative z-10 group-hover:border-primary/50 group-hover:scale-110 transition-all duration-300 shadow-xl">
                      <div className="text-gray-400 group-hover:text-primary transition-colors duration-300">
                        {step.icon}
                      </div>
                    </div>
                    
                    {/* Step Number Badge */}
                    <div className="absolute -top-3 -right-3 w-8 h-8 bg-[#0F1115] border border-white/10 rounded-full flex items-center justify-center text-xs font-bold font-mono text-gray-500 group-hover:text-primary group-hover:border-primary transition-colors z-20 shadow-lg">
                      {idx + 1}
                    </div>
                  </div>

                  <h3 className="text-xl font-bold mb-4 text-white group-hover:text-primary transition-colors font-display">
                    {step.title}
                  </h3>
                  <p className="text-gray-400 text-sm leading-relaxed max-w-[250px] mx-auto group-hover:text-gray-300 transition-colors">
                    {step.desc}
                  </p>
                  
                  {/* Mobile Arrow */}
                  {idx < steps.length - 1 && (
                    <div className="md:hidden mt-8 text-gray-700">
                      <ArrowRight className="w-6 h-6 rotate-90 mx-auto" />
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
