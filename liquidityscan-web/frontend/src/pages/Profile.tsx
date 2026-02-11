import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
// import { authApi } from '../services/api'; // TODO: Re-enable when API service is recreated
import { User } from '../types';
import { motion } from 'framer-motion';
import { ReferralSection } from '../components/ReferralSection';

export function Profile() {
  const navigate = useNavigate();
  const { user, setUser, logout, token } = useAuthStore();
  const [profile, setProfile] = useState<User | null>(user);
  const [loading, setLoading] = useState(!user);
  const [error, setError] = useState('');
  const hasFetchedRef = useRef(false); // Prevent infinite loop

  useEffect(() => {
    // Prevent infinite loop - only fetch once
    if (hasFetchedRef.current) {
      return;
    }

    const fetchProfile = async () => {
      hasFetchedRef.current = true;
      
      // If user already exists in store, use it immediately
      if (user) {
        setProfile(user);
        setLoading(false);
        // Don't refresh in background to avoid unnecessary API calls
        return;
      }
      
      // If no user, try to fetch from API
      // TODO: Re-enable when API service is recreated
      // try {
      //   setLoading(true);
      //   const data = await authApi.getProfile();
      //   setProfile(data);
      //   setUser(data);
      // } catch (err: any) {
      //   console.error('[Profile] Failed to fetch profile:', err);
      //   setError(err.message || 'Failed to load profile');
      // } finally {
      //   setLoading(false);
      // }
      setLoading(false);
    };

    fetchProfile();
  }, []); // Empty deps - only run once on mount

  const getInitials = (name?: string, email?: string) => {
    if (name) {
      const parts = name.split(' ');
      if (parts.length >= 2) {
        return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
      }
      return name.substring(0, 2).toUpperCase();
    }
    if (email) {
      return email.substring(0, 2).toUpperCase();
    }
    return 'U';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <div className="text-white text-lg">Loading profile...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="text-red-400 mb-4">{error}</div>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-primary text-black rounded-lg font-bold hover:bg-primary/90"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="text-white mb-4">Not logged in</div>
          <a
            href="/app/login"
            className="px-4 py-2 bg-primary text-black rounded-lg font-bold hover:bg-primary/90 inline-block"
          >
            Go to Login
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        {/* Header */}
        <div>
          <h1 className="text-3xl font-black dark:text-white light:text-text-dark mb-2">
            Profile
          </h1>
          <p className="text-sm dark:text-gray-400 light:text-text-light-secondary">
            Manage your account settings and preferences
          </p>
        </div>

        {/* Profile Card */}
        <div className="glass-panel rounded-2xl p-8 dark:border-white/10 light:border-green-300">
          <div className="flex items-start gap-6">
            {/* Avatar */}
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary/30 to-primary/60 ring-4 dark:ring-white/20 light:ring-green-300/50 flex items-center justify-center text-3xl font-bold text-white">
              {getInitials(profile.name, profile.email)}
            </div>

            {/* User Info */}
            <div className="flex-1">
              <h2 className="text-2xl font-bold dark:text-white light:text-text-dark mb-2">
                {profile.name || profile.email?.split('@')[0] || 'User'}
              </h2>
              <p className="text-sm dark:text-gray-400 light:text-text-light-secondary mb-4">
                {profile.email}
              </p>

              {/* Account Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                <div className="p-4 rounded-xl dark:bg-white/5 light:bg-green-50 dark:border-white/10 light:border-green-300 border">
                  <div className="text-xs dark:text-gray-500 light:text-text-light-secondary mb-1">User ID</div>
                  <div className="text-sm font-mono dark:text-white light:text-text-dark" title={profile.id}>
                    {profile.id.substring(0, 8)}...
                  </div>
                </div>

                <div className="p-4 rounded-xl dark:bg-white/5 light:bg-green-50 dark:border-white/10 light:border-green-300 border">
                  <div className="text-xs dark:text-gray-500 light:text-text-light-secondary mb-1">Member Since</div>
                  <div className="text-sm dark:text-white light:text-text-dark">
                    {new Date(profile.createdAt).toLocaleDateString()}
                  </div>
                </div>

                <div className="p-4 rounded-xl dark:bg-white/5 light:bg-green-50 dark:border-white/10 light:border-green-300 border">
                  <div className="text-xs dark:text-gray-500 light:text-text-light-secondary mb-1">Subscription</div>
                  <div className="text-sm dark:text-white light:text-text-dark">
                    {profile.subscriptionId ? 'Pro Plan' : 'Free Plan'}
                  </div>
                </div>

                <div className="p-4 rounded-xl dark:bg-white/5 light:bg-green-50 dark:border-white/10 light:border-green-300 border">
                  <div className="text-xs dark:text-gray-500 light:text-text-light-secondary mb-1">Last Updated</div>
                  <div className="text-sm dark:text-white light:text-text-dark">
                    {new Date(profile.updatedAt).toLocaleDateString()}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Referral Section */}
        <ReferralSection />

        {/* Actions */}
        <div className="flex gap-4">
          <button
            onClick={() => {
              logout();
              navigate('/login', { replace: true });
            }}
            className="px-6 py-3 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl font-bold hover:bg-red-500/20 transition-all"
          >
            Logout
          </button>
        </div>
      </motion.div>
    </div>
  );
}
