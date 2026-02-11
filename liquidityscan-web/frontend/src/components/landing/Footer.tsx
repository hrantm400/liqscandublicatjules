import React from 'react';
import { Link } from 'react-router-dom';
import { Radar, Twitter, Github, Disc } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-[#0F1115] border-t border-white/5 py-16">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
          <div className="col-span-1 md:col-span-2">
             <div className="flex items-center gap-2 mb-6">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <Radar className="text-black w-5 h-5" />
              </div>
              <span className="font-display font-bold text-xl text-white">
                Liquidity<span className="text-primary">Scanner</span>
              </span>
            </div>
            <p className="text-gray-500 max-w-sm mb-6">
              The most advanced crypto screening tool for professional traders. Detect market manipulation and ride the institutional waves.
            </p>
            <div className="flex gap-4">
              <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-primary transition-colors"><Twitter className="w-5 h-5" /></a>
              <a href="https://discord.com" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-primary transition-colors"><Disc className="w-5 h-5" /></a>
              <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-primary transition-colors"><Github className="w-5 h-5" /></a>
            </div>
          </div>
          
          <div>
            <h4 className="font-bold text-white mb-6">Platform</h4>
            <ul className="space-y-4 text-gray-500">
              <li><a href="#features" className="hover:text-primary transition-colors">Features</a></li>
              <li><a href="#pricing" className="hover:text-primary transition-colors">Pricing</a></li>
              <li><a href="#demo" className="hover:text-primary transition-colors">Live Demo</a></li>
              <li><Link to="/dashboard" className="hover:text-primary transition-colors">Dashboard</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-white mb-6">Legal</h4>
            <ul className="space-y-4 text-gray-500">
              <li><Link to="/support" className="hover:text-primary transition-colors">Privacy Policy</Link></li>
              <li><Link to="/support" className="hover:text-primary transition-colors">Terms of Service</Link></li>
              <li><Link to="/support" className="hover:text-primary transition-colors">Disclaimer</Link></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/5 pt-8 text-center md:text-left flex flex-col md:flex-row justify-between items-center text-sm text-gray-600">
          <p>&copy; 2024 Liquidity Scanner Inc. All rights reserved.</p>
          <p className="mt-2 md:mt-0">Trading involves risk. Invest responsibly.</p>
        </div>
      </div>
    </footer>
  );
};
