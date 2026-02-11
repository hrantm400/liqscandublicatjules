import React from 'react';
import { PatternResult } from '../types';
import { TrendingUp, TrendingDown, Shuffle, Play, Zap, Activity } from 'lucide-react';
import { ScenarioType } from '../services/scenarios';
import { playSound } from '../services/audio';

interface StrategyBuilderProps {
  onGenerate: () => void;
  onPlayScenario: (type: ScenarioType, isPlus: boolean, isBull: boolean) => void;
  xParam: number;
  setXParam: (n: number) => void;
  latestPattern: PatternResult | null;
  className?: string;
}

export const StrategyBuilder: React.FC<StrategyBuilderProps> = ({
  onGenerate,
  onPlayScenario,
  xParam,
  setXParam,
  latestPattern,
  className
}) => {
  
  const handlePlay = (type: ScenarioType, isPlus: boolean, isBull: boolean) => {
    playSound('click');
    onPlayScenario(type, isPlus, isBull);
  };

  const handleGenerate = () => {
    playSound('click');
    onGenerate();
  }

  return (
    <div className={`glass-panel p-6 rounded-2xl shadow-2xl backdrop-blur-xl border border-white/5 relative overflow-hidden ${className}`}>
      {/* Decorative Glows */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -z-10"></div>
      <div className="absolute bottom-0 left-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -z-10"></div>

      <div className="flex items-center justify-between mb-8 border-b border-white/5 pb-4">
        <div className="flex items-center space-x-2">
            <Activity className="text-primary" size={20} />
            <h2 className="text-lg font-bold text-white tracking-wide font-mono">
            COMMAND<span className="text-primary">_DECK</span>
            </h2>
        </div>
        <button 
            onClick={handleGenerate}
            onMouseEnter={() => playSound('hover')}
            className="group flex items-center space-x-2 px-4 py-2 bg-surface-dark/50 hover:bg-surface-dark/80 rounded-lg text-gray-300 text-xs font-mono border border-white/10 transition-all hover:border-primary/50 hover:shadow-[0_0_15px_rgba(19,236,55,0.3)]"
        >
            <Shuffle size={14} className="group-hover:rotate-180 transition-transform duration-500" />
            <span>RANDOMIZE</span>
        </button>
      </div>

      <div className="space-y-8">
        
        {/* Logic Sections */}
        {['RUN', 'REV'].map((strategy) => (
             <div key={strategy} className="space-y-3">
                <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] font-mono flex items-center">
                    <div className={`w-1.5 h-1.5 rounded-full mr-2 ${strategy === 'RUN' ? 'bg-primary shadow-[0_0_8px_rgba(19,236,55,0.5)]' : 'bg-primary/80 shadow-[0_0_8px_rgba(19,236,55,0.4)]'}`}></div>
                    {strategy === 'RUN' ? 'CONTINUATION' : 'REVERSAL'} ({strategy})
                </h3>
                <div className="grid grid-cols-2 gap-3">
                    {/* Bull Buttons */}
                    <div className="flex flex-col space-y-2">
                        <ControlButton 
                            onClick={() => handlePlay(strategy as any, false, true)}
                            label={strategy}
                            subLabel="BULL"
                            color="green"
                            icon={<TrendingUp size={14} />}
                        />
                         <ControlButton 
                            onClick={() => handlePlay(strategy as any, true, true)}
                            label={`${strategy}+`}
                            subLabel="PLUS"
                            color="green-glow"
                            icon={<Zap size={14} />}
                        />
                    </div>
                    {/* Bear Buttons */}
                    <div className="flex flex-col space-y-2">
                        <ControlButton 
                            onClick={() => handlePlay(strategy as any, false, false)}
                            label={strategy}
                            subLabel="BEAR"
                            color="red"
                            icon={<TrendingDown size={14} />}
                        />
                        <ControlButton 
                            onClick={() => handlePlay(strategy as any, true, false)}
                            label={`${strategy}+`}
                            subLabel="PLUS"
                            color="red-glow"
                            icon={<Zap size={14} />}
                        />
                    </div>
                </div>
            </div>
        ))}

        {/* X Logic Section */}
         <div className="space-y-4 pt-6 border-t border-white/5">
             <div className="flex items-center justify-between">
                <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] font-mono flex items-center">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_8px_rgba(19,236,55,0.5)] mr-2"></div>
                    X-FACTOR LOGIC
                </h3>
                 <span className="text-[10px] text-primary font-mono bg-primary/10 border border-primary/20 px-2 py-0.5 rounded">
                    DEPTH: {xParam}
                </span>
            </div>
            
            <div className="relative group">
                 <input 
                    type="range" 
                    min="2" 
                    max="10" 
                    value={xParam} 
                    onChange={(e) => setXParam(parseInt(e.target.value))}
                    className="w-full h-2 bg-surface-dark rounded-lg appearance-none cursor-pointer accent-primary"
                />
            </div>

            <div className="grid grid-cols-2 gap-3">
                 <ControlButton 
                    onClick={() => handlePlay('X', false, true)}
                    label="X-LOGIC"
                    subLabel="BULL"
                    color="purple"
                    icon={<TrendingUp size={14} />}
                />
                <ControlButton 
                    onClick={() => handlePlay('X', false, false)}
                    label="X-LOGIC"
                    subLabel="BEAR"
                    color="purple"
                    icon={<TrendingDown size={14} />}
                />
            </div>
        </div>
      </div>
    </div>
  );
};

// Reusable Fancy Button
const ControlButton: React.FC<{
    onClick: () => void;
    label: string;
    subLabel: string;
    icon: React.ReactNode;
    color: 'green' | 'red' | 'purple' | 'green-glow' | 'red-glow';
}> = ({ onClick, label, subLabel, icon, color }) => {
    
    const getColorClasses = () => {
        switch(color) {
            case 'green': return "border-primary/20 hover:border-primary/50 hover:bg-primary/10 text-primary";
            case 'green-glow': return "border-primary/40 bg-primary/5 hover:bg-primary/20 text-primary shadow-[0_0_10px_rgba(19,236,55,0.2)] hover:shadow-[0_0_15px_rgba(19,236,55,0.4)]";
            case 'red': return "border-red-500/20 hover:border-red-500/50 hover:bg-red-500/10 text-red-400";
            case 'red-glow': return "border-red-400/40 bg-red-500/5 hover:bg-red-500/20 text-red-300 shadow-[0_0_10px_rgba(248,113,113,0.1)] hover:shadow-[0_0_15px_rgba(248,113,113,0.3)]";
            case 'purple': return "border-primary/20 hover:border-primary/50 hover:bg-primary/10 text-primary";
            default: return "";
        }
    }

    return (
        <button 
            onClick={onClick}
            onMouseEnter={() => playSound('hover')}
            className={`
                group relative w-full py-3 px-4 rounded-lg border transition-all duration-300
                flex items-center justify-between overflow-hidden
                ${getColorClasses()}
            `}
        >
            <div className="flex flex-col items-start z-10">
                <span className="text-[10px] opacity-70 font-mono tracking-wider">{subLabel}</span>
                <span className="text-xs font-bold font-mono group-hover:scale-105 transition-transform">{label}</span>
            </div>
            <div className="z-10 opacity-70 group-hover:opacity-100 group-hover:translate-x-1 transition-all">
                {icon}
            </div>
            
            {/* Hover Shine Effect */}
            <div className="absolute inset-0 translate-x-[-100%] group-hover:translate-x-[100%] bg-gradient-to-r from-transparent via-white/5 to-transparent transition-transform duration-700 pointer-events-none" />
        </button>
    )
}
