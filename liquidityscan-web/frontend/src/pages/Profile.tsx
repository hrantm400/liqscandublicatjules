import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { User, Signal } from '../types';
import { motion } from 'framer-motion';
import { ReferralSection } from '../components/ReferralSection';
import { fetchSignals } from '../services/signalsApi';

export function Profile() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [profile, setProfile] = useState<User | null>(user);
  const [loading, setLoading] = useState(!user);
  const [signals, setSignals] = useState<Signal[]>([]);
  const [statsLoading, setStatsLoading] = useState(true);
  const hasFetchedRef = useRef(false);

  useEffect(() => {
    if (hasFetchedRef.current) return;
    const fetchProfile = async () => {
      hasFetchedRef.current = true;
      if (user) {
        setProfile(user);
        setLoading(false);
        return;
      }
      setLoading(false);
    };
    fetchProfile();
  }, []);

  // Fetch signal stats
  useEffect(() => {
    const loadStats = async () => {
      try {
        setStatsLoading(true);
        const all = await fetchSignals(undefined, 500);
        setSignals(all);
      } catch (e) {
        console.error('Failed to load signal stats:', e);
      } finally {
        setStatsLoading(false);
      }
    };
    loadStats();
  }, []);

  const getInitials = (name?: string, email?: string) => {
    if (name) {
      const parts = name.split(' ');
      if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
      return name.substring(0, 2).toUpperCase();
    }
    if (email) return email.substring(0, 2).toUpperCase();
    return 'U';
  };

  // Compute stats
  const completedSignals = signals.filter(s => s.lifecycleStatus === 'COMPLETED');
  const winSignals = completedSignals.filter(s => s.result === 'WIN');
  const lossSignals = completedSignals.filter(s => s.result === 'LOSS');
  const expiredSignals = signals.filter(s => s.lifecycleStatus === 'EXPIRED');
  const pendingSignals = signals.filter(s => s.lifecycleStatus === 'PENDING');
  const activeSignals = signals.filter(s => s.lifecycleStatus === 'ACTIVE');
  const winRate = completedSignals.length > 0
    ? ((winSignals.length / completedSignals.length) * 100).toFixed(1) : '—';

  // Per-strategy stats
  const strategies = ['SUPER_ENGULFING', 'ICT_BIAS', 'RSI_DIVERGENCE'];
  const strategyStats = strategies.map(st => {
    const stSignals = signals.filter(s => s.strategyType === st);
    const stCompleted = stSignals.filter(s => s.lifecycleStatus === 'COMPLETED');
    const stWin = stCompleted.filter(s => s.result === 'WIN').length;
    const stTotal = stCompleted.length;
    const wr = stTotal > 0 ? ((stWin / stTotal) * 100).toFixed(0) : '—';
    return {
      name: st.replace(/_/g, ' '),
      total: stSignals.length,
      wins: stWin,
      losses: stTotal - stWin,
      winRate: wr,
      pct: stTotal > 0 ? (stWin / stTotal) * 100 : 0,
    };
  });

  // Recent closed
  const recentClosed = [...completedSignals, ...expiredSignals]
    .sort((a, b) => new Date(b.closedAt || b.detectedAt || 0).getTime() - new Date(a.closedAt || a.detectedAt || 0).getTime())
    .slice(0, 8);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <div className="dark:text-white light:text-text-dark text-lg">Loading profile...</div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="dark:text-white light:text-text-dark mb-4">Not logged in</div>
          <a href="/login" className="px-4 py-2 bg-primary text-black rounded-lg font-bold hover:bg-primary/90 inline-block">Go to Login</a>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-black dark:text-white light:text-text-dark mb-1">Profile</h1>
          <p className="text-sm dark:text-gray-400 light:text-text-light-secondary">Account & signal performance overview</p>
        </div>

        {/* Profile Card */}
        <div className="glass-panel rounded-2xl p-8 dark:border-white/10 light:border-green-300">
          <div className="flex items-start gap-6">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/30 to-primary/60 ring-4 dark:ring-white/20 light:ring-green-300/50 flex items-center justify-center text-2xl font-bold text-white">
              {getInitials(profile.name, profile.email)}
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold dark:text-white light:text-text-dark mb-1">
                {profile.name || profile.email?.split('@')[0] || 'User'}
              </h2>
              <p className="text-sm dark:text-gray-400 light:text-text-light-secondary mb-4">{profile.email}</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-3 rounded-xl dark:bg-white/5 light:bg-green-50 border dark:border-white/10 light:border-green-300">
                  <div className="text-[10px] dark:text-gray-500 light:text-text-light-secondary uppercase tracking-wider">User ID</div>
                  <div className="text-sm font-mono dark:text-white light:text-text-dark mt-1" title={profile.id}>{profile.id.substring(0, 8)}...</div>
                </div>
                <div className="p-3 rounded-xl dark:bg-white/5 light:bg-green-50 border dark:border-white/10 light:border-green-300">
                  <div className="text-[10px] dark:text-gray-500 light:text-text-light-secondary uppercase tracking-wider">Member Since</div>
                  <div className="text-sm dark:text-white light:text-text-dark mt-1">{new Date(profile.createdAt).toLocaleDateString()}</div>
                </div>
                <div className="p-3 rounded-xl dark:bg-white/5 light:bg-green-50 border dark:border-white/10 light:border-green-300">
                  <div className="text-[10px] dark:text-gray-500 light:text-text-light-secondary uppercase tracking-wider">Subscription</div>
                  <div className="text-sm dark:text-white light:text-text-dark mt-1">{profile.subscriptionId ? 'Pro Plan' : 'Free Plan'}</div>
                </div>
                <div className="p-3 rounded-xl dark:bg-white/5 light:bg-green-50 border dark:border-white/10 light:border-green-300">
                  <div className="text-[10px] dark:text-gray-500 light:text-text-light-secondary uppercase tracking-wider">Last Updated</div>
                  <div className="text-sm dark:text-white light:text-text-dark mt-1">{new Date(profile.updatedAt).toLocaleDateString()}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Signal Performance Overview */}
        <div className="glass-panel rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-5">
            <span className="material-symbols-outlined text-primary text-xl">monitoring</span>
            <h3 className="text-sm font-black dark:text-white light:text-text-dark uppercase tracking-widest">Signal Performance</h3>
          </div>

          {statsLoading ? (
            <div className="flex items-center justify-center h-24">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <>
              {/* Global Stats Row */}
              <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-6">
                <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="p-4 rounded-xl dark:bg-white/5 light:bg-green-50 text-center border dark:border-white/10 light:border-green-300">
                  <div className="text-2xl font-black text-primary font-mono">{signals.length}</div>
                  <div className="text-[9px] dark:text-gray-500 light:text-slate-400 uppercase tracking-wider mt-1">Total Signals</div>
                </motion.div>
                <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} transition={{ delay: 0.05 }} className="p-4 rounded-xl dark:bg-white/5 light:bg-green-50 text-center border dark:border-white/10 light:border-green-300">
                  <div className="text-2xl font-black text-green-400 font-mono">{winSignals.length}</div>
                  <div className="text-[9px] dark:text-gray-500 light:text-slate-400 uppercase tracking-wider mt-1">Wins</div>
                </motion.div>
                <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} transition={{ delay: 0.1 }} className="p-4 rounded-xl dark:bg-white/5 light:bg-green-50 text-center border dark:border-white/10 light:border-green-300">
                  <div className="text-2xl font-black text-red-400 font-mono">{lossSignals.length}</div>
                  <div className="text-[9px] dark:text-gray-500 light:text-slate-400 uppercase tracking-wider mt-1">Losses</div>
                </motion.div>
                <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} transition={{ delay: 0.15 }} className="p-4 rounded-xl dark:bg-white/5 light:bg-green-50 text-center border dark:border-white/10 light:border-green-300">
                  <div className="text-2xl font-black text-yellow-400 font-mono">{expiredSignals.length}</div>
                  <div className="text-[9px] dark:text-gray-500 light:text-slate-400 uppercase tracking-wider mt-1">Expired</div>
                </motion.div>
                <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} transition={{ delay: 0.2 }} className="p-4 rounded-xl dark:bg-white/5 light:bg-green-50 text-center border dark:border-white/10 light:border-green-300">
                  <div className="text-2xl font-black text-blue-400 font-mono">{activeSignals.length + pendingSignals.length}</div>
                  <div className="text-[9px] dark:text-gray-500 light:text-slate-400 uppercase tracking-wider mt-1">Active</div>
                </motion.div>
                <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} transition={{ delay: 0.25 }} className="p-4 rounded-xl bg-primary/10 text-center border border-primary/30">
                  <div className="text-2xl font-black text-primary font-mono drop-shadow-[0_0_12px_rgba(19,236,55,0.3)]">{winRate}%</div>
                  <div className="text-[9px] text-primary/60 uppercase tracking-wider mt-1">Win Rate</div>
                </motion.div>
              </div>

              {/* Strategy Breakdown */}
              <h4 className="text-xs font-bold dark:text-gray-400 light:text-slate-500 uppercase tracking-widest mb-3">By Strategy</h4>
              <div className="flex flex-col gap-3 mb-6">
                {strategyStats.map(({ name, total, wins, losses, winRate: wr, pct }) => (
                  <div key={name} className="flex items-center gap-3">
                    <span className="text-xs font-bold dark:text-gray-400 light:text-slate-500 w-32 truncate">{name}</span>
                    <div className="flex-1 h-3 dark:bg-white/5 light:bg-gray-100 rounded-full overflow-hidden">
                      <motion.div className="h-full bg-primary rounded-full" initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8, ease: 'easeOut' }} />
                    </div>
                    <span className="text-sm font-black font-mono w-12 text-right" style={{ color: pct >= 60 ? '#13ec37' : pct >= 45 ? '#f59e0b' : '#ff4444' }}>{wr}%</span>
                    <span className="text-[9px] dark:text-gray-500 light:text-slate-400 w-20 text-right">{wins}W / {losses}L ({total})</span>
                  </div>
                ))}
              </div>

              {/* Recent Closed Signals */}
              {recentClosed.length > 0 && (
                <>
                  <h4 className="text-xs font-bold dark:text-gray-400 light:text-slate-500 uppercase tracking-widest mb-3">Recent Closed Signals</h4>
                  <div className="grid gap-2">
                    {recentClosed.map(sig => {
                      const isWin = sig.result === 'WIN';
                      const isExpired = sig.lifecycleStatus === 'EXPIRED';
                      const closedDate = sig.closedAt || sig.detectedAt;
                      const biasResult = sig.bias_result;
                      return (
                        <div key={sig.id} className="flex items-center justify-between p-3 rounded-xl dark:bg-white/5 light:bg-green-50/50 border dark:border-white/5 light:border-green-200 hover:dark:bg-white/10 hover:light:bg-green-50 transition-colors cursor-pointer"
                          onClick={() => navigate(`/signals/${sig.id}`)}>
                          <div className="flex items-center gap-3">
                            <span className={`text-xs font-black px-2 py-1 rounded ${isWin ? 'bg-green-500/20 text-green-400' : isExpired ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400'}`}>
                              {biasResult || (isWin ? 'WIN' : isExpired ? 'EXPIRED' : 'LOSS')}
                            </span>
                            <span className="text-sm font-bold dark:text-white light:text-text-dark">{sig.symbol}</span>
                            <span className="text-[10px] dark:text-gray-500 light:text-slate-400">{sig.strategyType.replace(/_/g, ' ')}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-xs font-mono dark:text-gray-400 light:text-slate-500">{sig.timeframe}</span>
                            {sig.pnlPercent != null && (
                              <span className={`text-xs font-bold font-mono ${sig.pnlPercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                {sig.pnlPercent >= 0 ? '+' : ''}{sig.pnlPercent.toFixed(2)}%
                              </span>
                            )}
                            {closedDate && (
                              <span className="text-[10px] dark:text-gray-600 light:text-slate-400">{new Date(closedDate).toLocaleDateString()}</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </>
          )}
        </div>

        {/* Referral Section */}
        <ReferralSection />

        {/* Actions */}
        <div className="flex gap-4">
          <button onClick={() => navigate('/settings')} className="px-6 py-3 dark:bg-white/5 light:bg-green-50 dark:border-white/10 light:border-green-300 border dark:text-white light:text-text-dark rounded-xl font-bold hover:dark:bg-white/10 hover:light:bg-green-100 transition-all">
            ⚙️ Settings
          </button>
          <button
            onClick={() => { logout(); navigate('/login', { replace: true }); }}
            className="px-6 py-3 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl font-bold hover:bg-red-500/20 transition-all"
          >
            Logout
          </button>
        </div>
      </motion.div>
    </div>
  );
}
