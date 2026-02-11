import React from 'react';
import { ArrowRight, CheckCircle, XCircle, Trophy, BrainCircuit } from 'lucide-react';
import { playSound } from '../services/audio';

interface QuizInterfaceProps {
  options: string[];
  onSelect: (option: string) => void;
  selectedOption: string | null;
  correctOption: string | null;
  score: number;
  totalQuestions: number;
  onNext: () => void;
  className?: string;
}

export const QuizInterface: React.FC<QuizInterfaceProps> = ({
  options,
  onSelect,
  selectedOption,
  correctOption,
  score,
  totalQuestions,
  onNext,
  className
}) => {
  
  const handleSelect = (option: string) => {
    if (selectedOption) return; // Prevent changing answer
    onSelect(option);
    if (option === correctOption) {
        playSound('success');
    } else {
        playSound('error');
    }
  };

  const isAnswered = selectedOption !== null;

  return (
    <div className={`glass-panel p-6 rounded-2xl shadow-2xl border border-white/5 flex flex-col h-full justify-between ${className}`}>
      
      {/* Quiz Header */}
      <div>
        <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-2">
                <BrainCircuit className="text-primary" size={24} />
                <h2 className="text-xl font-bold text-white font-mono tracking-wide">
                    PATTERN<span className="text-primary">_EXAM</span>
                </h2>
            </div>
            <div className="flex items-center space-x-2 bg-surface-dark/50 px-3 py-1 rounded-full border border-primary/20">
                <Trophy size={14} className="text-primary" />
                <span className="text-sm font-mono text-white">SCORE: {score}/{totalQuestions}</span>
            </div>
        </div>

        {/* Question Prompt */}
        <div className="mb-6">
            <p className="text-gray-300 text-sm font-light">
                Analyze the last candle formation. Identify the correct SuperEngulfing strategy setup.
            </p>
        </div>

        {/* Options Grid */}
        <div className="grid grid-cols-1 gap-3">
            {options.map((option, idx) => {
                let btnClass = "bg-surface-dark/50 border-white/10 hover:bg-surface-dark hover:border-primary/50";
                let icon = <div className="w-5 h-5 rounded-full border border-gray-500 flex items-center justify-center text-[10px] text-gray-400">{String.fromCharCode(65+idx)}</div>;
                
                if (isAnswered) {
                    if (option === correctOption) {
                        btnClass = "bg-green-500/20 border-green-500 text-green-300 shadow-[0_0_15px_rgba(34,197,94,0.3)]";
                        icon = <CheckCircle size={20} className="text-green-400" />;
                    } else if (option === selectedOption && option !== correctOption) {
                        btnClass = "bg-red-500/20 border-red-500 text-red-300 opacity-80";
                        icon = <XCircle size={20} className="text-red-400" />;
                    } else {
                        btnClass = "opacity-40 border-transparent grayscale";
                    }
                }

                return (
                    <button
                        key={idx}
                        onClick={() => handleSelect(option)}
                        disabled={isAnswered}
                        className={`
                            relative w-full py-4 px-4 rounded-xl border-2 transition-all duration-200
                            flex items-center justify-between group
                            text-left font-mono font-bold text-sm
                            ${btnClass}
                        `}
                    >
                        <span>{option}</span>
                        {icon}
                    </button>
                );
            })}
        </div>
      </div>

      {/* Footer / Next Button */}
      <div className="mt-8">
        {isAnswered ? (
            <button 
                onClick={onNext}
                className="w-full py-3 bg-primary hover:bg-primary-hover text-black rounded-xl font-bold font-mono flex items-center justify-center space-x-2 shadow-lg shadow-[0_0_20px_rgba(19,236,55,0.4)] transition-all animate-in fade-in slide-in-from-bottom-2"
            >
                <span>NEXT SCENARIO</span>
                <ArrowRight size={16} />
            </button>
        ) : (
            <div className="w-full py-3 text-center text-gray-500 text-xs font-mono uppercase tracking-widest animate-pulse">
                Waiting for input...
            </div>
        )}
      </div>
    </div>
  );
};
