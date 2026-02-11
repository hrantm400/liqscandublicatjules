import React from 'react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { Navbar } from '../components/landing/Navbar';
import { Hero } from '../components/landing/Hero';
import { Features } from '../components/landing/Features';
import { Strategies } from '../components/landing/Strategies';
import { Stats } from '../components/landing/Stats';
import { HowItWorks } from '../components/landing/HowItWorks';
import { Pricing } from '../components/landing/Pricing';
import { Footer } from '../components/landing/Footer';
import { Button } from '../components/ui/Button';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

// Enhanced Background Component
const MatrixBackground = () => (
  <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
    {/* Deep Space Base */}
    <div className="absolute inset-0 bg-[#020202]" />

    {/* Moving Cyber Grid */}
    <div className="absolute inset-0 opacity-[0.15] bg-grid-moving" 
         style={{ perspective: '500px', transform: 'scale(1.5)' }} />

    {/* Floating Neon Orbs */}
    <div className="absolute top-[-10%] left-[20%] w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px] animate-pulse-slow mix-blend-screen" />
    <div className="absolute bottom-[-10%] right-[10%] w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[150px] animate-pulse-slow mix-blend-screen" style={{ animationDelay: '2s' }} />
    <div className="absolute top-[40%] left-[-10%] w-[400px] h-[400px] bg-purple-600/10 rounded-full blur-[100px] animate-pulse-slow mix-blend-screen" style={{ animationDelay: '4s' }} />

    {/* Digital Noise Overlay */}
    <div className="absolute inset-0 opacity-[0.03] mix-blend-overlay bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
    
    {/* Scanlines */}
    <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-[1] bg-[length:100%_4px,3px_100%] pointer-events-none" />
  </div>
);

const SectionReveal = ({ children, className = "" }: { children: React.ReactNode, className?: string }) => (
  <motion.div
    initial={{ opacity: 0, y: 50 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: "-100px" }}
    transition={{ duration: 0.8, ease: "easeOut" }}
    className={className}
  >
    {children}
  </motion.div>
);

export const LandingPage: React.FC = () => {
  const { isAuthenticated } = useAuthStore();

  return (
    <>
      <Helmet>
        <title>Liquidity Scanner | Detect Unseen Moves</title>
        <meta name="description" content="Institutional-grade liquidity scanner for crypto trading. Real-time pattern detection, 78% win rate, 300+ pairs monitored 24/7." />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;700&family=Space+Grotesk:wght@500;700;900&display=swap" rel="stylesheet" />
      </Helmet>

      <div className="min-h-screen text-white selection:bg-primary/30 font-sans overflow-x-hidden relative">
        <MatrixBackground />

        <div className="relative z-10">
          <Navbar />
          
          <main>
            <Hero />
            
            <SectionReveal>
              <Stats />
            </SectionReveal>
            
            <SectionReveal>
              <Features />
            </SectionReveal>
            
            <SectionReveal>
              <Strategies />
            </SectionReveal>
            
            <SectionReveal>
              <HowItWorks />
            </SectionReveal>
            
            <SectionReveal>
              <Pricing />
            </SectionReveal>
            
            {/* Final CTA */}
            <SectionReveal className="py-32 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-radial from-primary/10 to-transparent opacity-50 pointer-events-none" />
              <div className="max-w-5xl mx-auto px-6 text-center relative z-10">
                <h2 className="font-display text-6xl md:text-8xl font-black mb-8 tracking-tighter leading-none">
                  STOP GUESSING. <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-green-200 to-primary animate-gradient text-glow">START PRINTING.</span>
                </h2>
                <p className="text-xl md:text-2xl text-gray-400 mb-12 max-w-3xl mx-auto font-light leading-relaxed">
                  Join 10,000+ traders who have upgraded their edge. <br/>
                  <span className="text-white font-medium">No credit card required for the 7-day trial.</span>
                </p>
                
                <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                  <Link to={isAuthenticated ? "/dashboard" : "/register"}>
                    <Button className="px-12 py-6 text-xl font-display font-bold shadow-[0_0_50px_-10px_rgba(19,236,55,0.4)] hover:shadow-[0_0_80px_-10px_rgba(19,236,55,0.6)] transition-all duration-300 transform hover:scale-105">
                      {isAuthenticated ? "LAUNCH TERMINAL" : "GET STARTED NOW"}
                    </Button>
                  </Link>
                  <span className="text-gray-500 font-mono text-sm hidden sm:block">
                    // LIMITED SPOTS AVAILABLE
                  </span>
                </div>
              </div>
            </SectionReveal>
          </main>

          <Footer />
        </div>
      </div>
    </>
  );
};
