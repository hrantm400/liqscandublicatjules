import React, { useEffect, useState, useRef } from 'react';
import { motion, useInView, useSpring, useMotionValue } from 'framer-motion';

const stats = [
  { label: "Pairs Monitored", value: 300, suffix: "+", sub: "Binance & Bybit" },
  { label: "Win Rate", value: 78, suffix: "%", sub: "Verified Backtest" },
  { label: "Uptime", value: 99.9, suffix: "%", sub: "Cloud Infrastructure" },
  { label: "Latency", value: 50, prefix: "<", suffix: "ms", sub: "Global Edge Nodes" },
];

const AnimatedNumber = ({ value, prefix = "", suffix = "" }: { value: number, prefix?: string, suffix?: string }) => {
  const ref = useRef<HTMLSpanElement>(null);
  const motionValue = useMotionValue(0);
  const springValue = useSpring(motionValue, { damping: 50, stiffness: 100 });
  const isInView = useInView(ref, { once: true, margin: "-50px" });

  useEffect(() => {
    if (isInView) {
      motionValue.set(value);
    }
  }, [isInView, value, motionValue]);

  useEffect(() => {
    return springValue.on("change", (latest) => {
      if (ref.current) {
        // Fix for decimals if needed, here we assume mostly integers unless specified
        ref.current.textContent = latest.toFixed(value % 1 === 0 ? 0 : 1);
      }
    });
  }, [springValue, value]);

  return (
    <span className="flex items-center justify-center gap-0.5">
      {prefix && <span>{prefix}</span>}
      <span ref={ref}>0</span>
      {suffix && <span>{suffix}</span>}
    </span>
  );
};

export const Stats: React.FC = () => {
  return (
    <section className="py-12 border-y border-white/5 bg-[#0A0A0A]/50 backdrop-blur-md relative overflow-hidden">
       {/* Decorative subtle grid */}
       <div className="absolute inset-0 bg-grid-pattern opacity-10 pointer-events-none"></div>
       <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-primary/20 to-transparent"></div>
       
      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-12 text-center">
          {stats.map((stat, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1 }}
            >
              <div className="font-display text-4xl md:text-5xl font-bold text-white mb-2 text-glow flex justify-center">
                <AnimatedNumber value={stat.value} prefix={stat.prefix} suffix={stat.suffix} />
              </div>
              <div className="text-primary font-bold text-sm uppercase tracking-wider mb-1">
                {stat.label}
              </div>
              <div className="text-gray-500 text-xs font-mono">
                {stat.sub}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
