import React from 'react';
import { Card } from '../ui/Card';
import { Target, Activity } from 'lucide-react';

export const Features: React.FC = () => {
  return (
    <section id="features" className="py-32 relative overflow-hidden">
      {/* Background gradients */}
      <div className="absolute right-0 top-1/4 w-1/3 h-1/3 bg-blue-600/10 blur-[120px] rounded-full pointer-events-none" />
      
      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <div className="text-center mb-20">
          <h2 className="font-display text-4xl md:text-5xl font-bold mb-6">
            Built for <span className="text-primary">Precision</span>
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto text-lg">
            Stop trading blind. Our advanced algorithms process millions of data points per second to give you the edge you need.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Feature 1 */}
          <Card className="min-h-[440px] flex flex-col justify-between group overflow-hidden relative">
             <div className="relative z-10">
               <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-6 text-primary border border-primary/20 shadow-[0_0_15px_rgba(19,236,55,0.1)]">
                 <Target className="w-6 h-6" />
               </div>
               <h3 className="text-2xl font-bold mb-4 font-display text-white">Real-Time Scanner</h3>
               <p className="text-gray-400 leading-relaxed">
                 Instantly scans 300+ pairs across Binance and Bybit. Filter by volume spike, RSI divergence, or liquidation cascades.
               </p>
             </div>
             
             {/* Abstract UI Representation */}
             <div className="mt-8 bg-[#020202] border border-white/5 rounded-t-xl p-4 transform group-hover:-translate-y-2 transition-transform duration-500 opacity-80 group-hover:opacity-100 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.8)] relative overflow-hidden">
               {/* Animated Scanning Bar */}
               <div className="absolute top-0 left-0 right-0 h-[2px] bg-primary/50 shadow-[0_0_10px_rgba(19,236,55,0.8)] animate-[scanDown_3s_ease-in-out_infinite] z-20"></div>
               
               <div className="flex gap-2 mb-4 border-b border-white/5 pb-2">
                 <div className="h-2 w-16 bg-white/20 rounded-full"></div>
                 <div className="h-2 w-8 bg-white/10 rounded-full"></div>
               </div>
               <div className="space-y-3 relative">
                 {[1,2,3].map((i) => (
                   <div key={i} className="flex justify-between items-center py-2 border-b border-white/5 group-hover:bg-white/[0.02] px-2 rounded transition-colors">
                     <span className="font-mono text-xs text-gray-300">BTC/USDT</span>
                     <span className="font-mono text-xs text-primary bg-primary/10 px-1.5 py-0.5 rounded">LONG</span>
                     <span className="font-mono text-xs text-gray-500">Just now</span>
                   </div>
                 ))}
                 {/* Fading bottom */}
                 <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-[#020202] to-transparent"></div>
               </div>
             </div>
          </Card>

          {/* Feature 2 */}
          <Card className="min-h-[440px] flex flex-col justify-between group overflow-hidden relative" delay={0.2}>
             <div className="relative z-10">
               <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center mb-6 text-blue-400 border border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.1)]">
                 <Activity className="w-6 h-6" />
               </div>
               <h3 className="text-2xl font-bold mb-4 font-display text-white">Confluence Detection</h3>
               <p className="text-gray-400 leading-relaxed">
                 We don't just give you one signal. We layer Volume, Open Interest, and Delta to confirm high-probability setups.
               </p>
             </div>
             
             {/* Abstract Chart Representation */}
             <div className="mt-8 relative h-[180px] w-full border-t border-l border-white/5 opacity-80 group-hover:opacity-100 transition-opacity bg-gradient-to-br from-white/[0.03] to-transparent rounded-tr-xl overflow-hidden">
               <div className="absolute inset-0 bg-grid-pattern opacity-10"></div>
               <svg className="w-full h-full overflow-visible relative z-10" preserveAspectRatio="none">
                 <path d="M0,100 C50,80 100,120 150,60 S250,90 300,40 S400,20 500,0" fill="none" stroke="#3b82f6" strokeWidth="2" className="drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                 <path d="M0,130 C50,110 100,150 150,90 S250,120 300,70 S400,50 500,30" fill="none" stroke="#9ca3af" strokeWidth="1" strokeDasharray="4 4" opacity="0.3" />
                 
                 {/* Dots */}
                 <circle cx="150" cy="60" r="3" fill="#3b82f6" className="animate-pulse" />
                 <circle cx="300" cy="40" r="3" fill="#3b82f6" className="animate-pulse" />
               </svg>
               
               <div className="absolute top-8 right-8 bg-blue-500/10 text-blue-400 px-3 py-1.5 text-xs rounded-lg border border-blue-500/30 backdrop-blur-md flex items-center gap-2">
                 <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></div>
                 RSI Divergence
               </div>
             </div>
          </Card>
        </div>
      </div>
    </section>
  );
};
