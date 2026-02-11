import React from 'react';
import { Card } from '../ui/Card';
import { BarChart, Scale, TrendingDown, Zap, ArrowRight } from 'lucide-react';

const strategies = [
  {
    icon: <BarChart className="w-8 h-8" />,
    title: "Super Engulfing",
    desc: "Detects massive candle engulfing patterns backed by 3x volume spikes. Perfect for trend reversals.",
    color: "text-primary",
    bg: "bg-primary/10",
    border: "border-primary/20"
  },
  {
    icon: <Scale className="w-8 h-8" />,
    title: "ICT Bias",
    desc: "Institutional order block detection coupled with Fair Value Gaps (FVG) to identify smart money entry points.",
    color: "text-teal-400",
    bg: "bg-teal-400/10",
    border: "border-teal-400/20"
  },
  {
    icon: <TrendingDown className="w-8 h-8" />,
    title: "RSI Divergence",
    desc: "Classic momentum divergence strategy automated. Spots when price makes a higher high but momentum drops.",
    color: "text-blue-400",
    bg: "bg-blue-400/10",
    border: "border-blue-400/20"
  }
];

export const Strategies: React.FC = () => {
  return (
    <section id="strategies" className="py-24 relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-primary/5 blur-[100px] rounded-full pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <div className="mb-20 text-center">
           <h2 className="font-display text-4xl md:text-5xl font-bold mb-4">Three Pillars of <span className="text-primary text-glow">Profitability</span></h2>
           <p className="text-gray-400 max-w-2xl mx-auto">
             Our core algorithms that power your edge.
           </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {strategies.map((strategy, idx) => (
            <Card key={idx} delay={idx * 0.1} className="group hover:-translate-y-2 hover:shadow-[0_0_30px_rgba(0,0,0,0.5)]">
               <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 ${strategy.bg} ${strategy.border} border transition-all duration-300 group-hover:scale-110`}>
                 <div className={`${strategy.color}`}>
                   {strategy.icon}
                 </div>
               </div>
               
               <h3 className="text-2xl font-bold mb-4 font-display text-white group-hover:text-primary transition-colors">{strategy.title}</h3>
               
               <p className="text-gray-400 text-sm leading-relaxed mb-8">
                 {strategy.desc}
               </p>
               
               <div className="flex items-center justify-between mt-auto pt-6 border-t border-white/5">
                 <div className="flex items-center gap-2 text-xs font-mono text-green-400">
                   <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></div>
                   ALGORITHM ACTIVE
                 </div>
                 <Zap className={`w-4 h-4 ${strategy.color} opacity-0 group-hover:opacity-100 transition-all duration-300 transform group-hover:translate-x-1`} />
               </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};
