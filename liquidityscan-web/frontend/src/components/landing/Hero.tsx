import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '../ui/Button';
import { Play, TrendingUp, Zap, ShieldCheck, Activity, Terminal } from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer, YAxis } from 'recharts';
import { useAuthStore } from '../../store/authStore';

const data = [
  { value: 4000 }, { value: 3000 }, { value: 5000 }, { value: 2780 },
  { value: 1890 }, { value: 6390 }, { value: 3490 }, { value: 5490 },
  { value: 4000 }, { value: 7000 }, { value: 6500 }, { value: 8500 },
];

export const Hero: React.FC = () => {
  const { isAuthenticated } = useAuthStore();

  return (
    <section className="relative min-h-[110vh] pt-32 pb-20 overflow-hidden flex items-center justify-center">
      
      <div className="max-w-[1400px] mx-auto px-6 w-full grid grid-cols-1 lg:grid-cols-2 gap-20 items-center relative z-10">
        
        {/* Left Column: Typography & CTA */}
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="relative z-20"
        >
          {/* Status Badge */}
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-10 backdrop-blur-md group hover:bg-white/10 transition-colors cursor-default"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
            <span className="text-xs font-mono text-primary uppercase tracking-widest group-hover:text-white transition-colors">
              AI-Powered V3.0 Live
            </span>
          </motion.div>
          
          <h1 className="font-display text-6xl sm:text-7xl md:text-8xl font-black leading-[0.9] mb-8 tracking-tighter text-white">
            DETECT <br />
            <span className="relative inline-block">
              <span className="relative z-10 text-transparent bg-clip-text bg-gradient-to-r from-primary via-[#a8ff78] to-primary animate-gradient text-glow">
                UNSEEN MOVES
              </span>
              {/* Glitch Effect Underlay (Simulated) */}
              <span className="absolute top-0 left-0 -ml-[2px] text-red-500 opacity-20 mix-blend-screen animate-pulse-slow pointer-events-none" aria-hidden="true">UNSEEN MOVES</span>
              <span className="absolute top-0 left-0 ml-[2px] text-blue-500 opacity-20 mix-blend-screen animate-pulse-slow pointer-events-none" aria-hidden="true">UNSEEN MOVES</span>
            </span>
          </h1>
          
          <p className="text-gray-400 text-xl md:text-2xl mb-12 max-w-lg leading-relaxed font-light">
            The only <span className="text-white font-medium">institutional-grade</span> liquidity scanner for retail. 
            Identify smart money flow and hidden divergences before they print.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-5 mb-16">
            <Link to={isAuthenticated ? "/dashboard" : "/register"}>
              <Button className="w-full sm:w-auto text-lg px-12 py-5 shadow-[0_0_40px_-10px_rgba(19,236,55,0.6)] hover:shadow-[0_0_60px_-5px_rgba(19,236,55,0.8)] transition-all transform hover:-translate-y-1">
                {isAuthenticated ? "Launch Terminal" : "Start Free Trial"} <Terminal className="w-5 h-5 ml-2" />
              </Button>
            </Link>
            <a href="#demo">
              <Button variant="secondary" className="w-full sm:w-auto text-lg px-10 py-5 bg-white/5 border-white/10 hover:bg-white/10 backdrop-blur-sm">
                <Play className="w-4 h-4 fill-white mr-2" /> Watch Demo
              </Button>
            </a>
          </div>

          <div className="grid grid-cols-3 gap-8 border-t border-white/5 pt-10">
            <div className="flex flex-col gap-2 group">
              <Zap className="text-primary w-8 h-8 mb-2 group-hover:scale-110 transition-transform duration-300" />
              <h3 className="font-bold text-white text-lg">Real-time</h3>
              <p className="text-sm text-gray-500 font-mono group-hover:text-primary transition-colors">&lt; 50ms Latency</p>
            </div>
            <div className="flex flex-col gap-2 group">
              <ShieldCheck className="text-primary w-8 h-8 mb-2 group-hover:scale-110 transition-transform duration-300" />
              <h3 className="font-bold text-white text-lg">No Repaint</h3>
              <p className="text-sm text-gray-500 font-mono group-hover:text-primary transition-colors">Confirmed Signals</p>
            </div>
            <div className="flex flex-col gap-2 group">
              <TrendingUp className="text-primary w-8 h-8 mb-2 group-hover:scale-110 transition-transform duration-300" />
              <h3 className="font-bold text-white text-lg">78% Win Rate</h3>
              <p className="text-sm text-gray-500 font-mono group-hover:text-primary transition-colors">Backtested Data</p>
            </div>
          </div>
        </motion.div>

        {/* Right Column: 3D Visualization */}
        <div className="relative perspective-1000 h-[600px] flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0, rotateX: 20, rotateY: -20, scale: 0.8 }}
            animate={{ opacity: 1, rotateX: 0, rotateY: 0, scale: 1 }}
            transition={{ duration: 1.5, ease: "easeOut" }}
            className="relative w-full max-w-lg aspect-[4/5] md:aspect-square"
          >
            {/* Background Glow */}
            <div className="absolute inset-0 bg-primary/20 blur-[100px] rounded-full animate-pulse-slow" />

            {/* Main Floating Card */}
            <div className="absolute inset-0 animate-float">
              <div className="w-full h-full bg-[#050505] rounded-3xl p-1 border border-white/5 relative z-10 box-glow overflow-hidden shadow-2xl">
                <div className="absolute inset-0 bg-grid-pattern opacity-20" />
                
                {/* Simulated Terminal Header */}
                <div className="h-12 border-b border-white/10 flex items-center px-6 gap-2 bg-white/5">
                  <div className="w-3 h-3 rounded-full bg-red-500/50" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
                  <div className="w-3 h-3 rounded-full bg-green-500/50" />
                  <div className="ml-auto font-mono text-xs text-gray-500">liq_scan_v3.exe</div>
                </div>

                {/* Content */}
                <div className="p-8 h-[calc(100%-3rem)] flex flex-col relative">
                   <div className="flex justify-between items-start mb-8">
                     <div>
                       <div className="flex items-center gap-2 mb-1">
                         <span className="font-mono text-2xl font-bold text-white tracking-wider">BTC/USDT</span>
                         <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-white/10 border border-white/10 text-gray-300">PERP</span>
                       </div>
                       <div className="text-4xl font-mono font-bold text-primary text-glow">$68,420.50</div>
                     </div>
                     <Activity className="text-primary w-8 h-8 animate-pulse" />
                   </div>

                   {/* Chart Container */}
                   <div className="flex-1 w-full relative group rounded-xl overflow-hidden border border-white/5 bg-white/5">
                      {/* Scanning line effect */}
                      <div className="absolute top-0 bottom-0 w-[2px] bg-primary/80 z-20 shadow-[0_0_20px_#13ec37] animate-[scan_3s_ease-in-out_infinite]" />
                      <div className="absolute inset-0 bg-gradient-to-t from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                      
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={data}>
                          <defs>
                            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#13ec37" stopOpacity={0.4}/>
                              <stop offset="95%" stopColor="#13ec37" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <YAxis hide domain={['dataMin - 1000', 'dataMax + 1000']} />
                          <Area 
                            type="monotone" 
                            dataKey="value" 
                            stroke="#13ec37" 
                            strokeWidth={3}
                            fillOpacity={1} 
                            fill="url(#colorValue)"
                            isAnimationActive={true}
                            animationDuration={2000}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                      
                      {/* Signal Badge */}
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-black/80 backdrop-blur-md border border-primary text-primary px-6 py-3 rounded-xl font-bold shadow-[0_0_30px_rgba(19,236,55,0.3)] z-30 flex flex-col items-center">
                        <span className="text-[10px] text-gray-400 uppercase tracking-widest mb-1">Pattern Detected</span>
                        <div className="flex items-center gap-2 text-lg">
                           <span className="relative flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
                          </span>
                          SUPER ENGULFING
                        </div>
                      </div>
                   </div>

                   <div className="mt-6 grid grid-cols-2 gap-4">
                      <div className="bg-white/5 rounded-xl p-4 border border-white/5 hover:border-primary/30 transition-colors">
                        <div className="text-gray-500 text-xs mb-1">24h Vol</div>
                        <div className="font-mono text-white font-bold">$42.8B</div>
                      </div>
                      <div className="bg-white/5 rounded-xl p-4 border border-white/5 hover:border-primary/30 transition-colors">
                        <div className="text-gray-500 text-xs mb-1">Liq. Zone</div>
                        <div className="font-mono text-primary font-bold">$69,000</div>
                      </div>
                   </div>
                </div>
              </div>
            </div>

            {/* Floating Elements Behind */}
            <motion.div 
              className="absolute -right-12 top-20 w-48 h-32 bg-[#0A0A0A] rounded-2xl p-4 border border-white/10 z-0 animate-float-delayed shadow-xl"
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 1 }}
            >
               <div className="flex items-center gap-2 mb-2">
                 <div className="w-2 h-2 rounded-full bg-red-500" />
                 <span className="text-xs text-gray-400">RSI Divergence</span>
               </div>
               <div className="h-1 bg-white/10 rounded-full overflow-hidden mb-2">
                 <div className="h-full bg-red-500 w-[70%]" />
               </div>
               <div className="text-xs font-mono text-red-400">Overbought (82)</div>
            </motion.div>

             <motion.div 
              className="absolute -left-8 bottom-32 w-48 h-24 bg-[#0A0A0A] rounded-2xl p-4 border border-white/10 z-20 animate-float shadow-xl"
              style={{ animationDelay: '1s' }}
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 1.2 }}
            >
               <div className="flex items-center justify-between mb-2">
                 <span className="text-xs text-gray-400">Active Signals</span>
                 <span className="text-xs text-primary font-bold">12</span>
               </div>
               <div className="flex -space-x-2">
                 {[1,2,3,4].map(i => (
                   <div key={i} className="w-6 h-6 rounded-full bg-white/10 border border-black flex items-center justify-center text-[10px]">
                     {i}
                   </div>
                 ))}
               </div>
            </motion.div>

          </motion.div>
        </div>
      </div>
    </section>
  );
};
