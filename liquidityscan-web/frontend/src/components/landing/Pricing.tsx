import React from 'react';
import { Link } from 'react-router-dom';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Check } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

const plans = [
  {
    name: "Trader",
    price: "$49",
    period: "/month",
    features: ["Real-time Scanner", "Top 50 Pairs", "Standard Alerts", "Discord Access"],
    cta: "Start Trial",
    popular: false,
    link: "/register"
  },
  {
    name: "Professional",
    price: "$99",
    period: "/month",
    features: ["All Trader Features", "All 300+ Pairs", "No Repaint Indicators", "API Access", "Priority Support"],
    cta: "Get Professional",
    popular: true,
    link: "/register"
  },
  {
    name: "Institutional",
    price: "$299",
    period: "/month",
    features: ["All Pro Features", "Dedicated Server", "Custom Algorithms", "1-on-1 Onboarding", "White Label"],
    cta: "Contact Sales",
    popular: false,
    link: "/support"
  }
];

export const Pricing: React.FC = () => {
  const { isAuthenticated } = useAuthStore();

  return (
    <section id="pricing" className="py-32 relative">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />
      
      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <div className="text-center mb-16">
          <h2 className="font-display text-4xl font-bold mb-4">Simple, Transparent Pricing</h2>
          <p className="text-gray-400">Pay for value. Cancel anytime.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {plans.map((plan, idx) => (
            <Card 
              key={idx} 
              className={`relative flex flex-col ${plan.popular ? 'border-primary/50 shadow-[0_0_30px_rgba(19,236,55,0.1)]' : ''}`}
              delay={idx * 0.1}
            >
              {plan.popular && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-primary text-black font-bold px-4 py-1 rounded-full text-xs uppercase tracking-wide">
                  Most Popular
                </div>
              )}
              
              <div className="mb-8">
                <h3 className="text-gray-400 font-medium mb-2">{plan.name}</h3>
                <div className="flex items-baseline">
                  <span className="text-4xl font-bold text-white font-display">{plan.price}</span>
                  <span className="text-gray-500 ml-2">{plan.period}</span>
                </div>
              </div>

              <div className="flex-1 mb-8 space-y-4">
                {plan.features.map((feature, fIdx) => (
                  <div key={fIdx} className="flex items-center gap-3">
                    <div className={`p-0.5 rounded-full ${plan.popular ? 'bg-primary text-black' : 'bg-gray-800 text-gray-400'}`}>
                      <Check className="w-3 h-3" />
                    </div>
                    <span className="text-gray-300 text-sm">{feature}</span>
                  </div>
                ))}
              </div>

              <Link to={isAuthenticated ? "/subscription" : plan.link}>
                <Button variant={plan.popular ? 'primary' : 'outline'} className="w-full justify-center">
                  {plan.cta}
                </Button>
              </Link>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};
