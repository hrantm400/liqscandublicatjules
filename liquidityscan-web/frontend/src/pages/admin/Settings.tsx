import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Save, Bell, Shield, Globe, Database } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { settingsApi, DataProvider } from '../../services/settingsApi';
import toast from 'react-hot-toast';

export function Settings() {
  const [settings, setSettings] = useState({
    siteName: 'LiquidityScan',
    siteDescription: 'Trading Platform',
    maintenanceMode: false,
    allowRegistrations: true,
  });

  const queryClient = useQueryClient();

  const { data: dbSettings, isLoading } = useQuery({
    queryKey: ['admin', 'settings'],
    queryFn: settingsApi.getSettings,
  });

  const updateProviderMutation = useMutation({
    mutationFn: settingsApi.updateProvider,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'settings'] });
      toast.success('Data provider updated successfully!');
    },
    onError: () => {
      toast.error('Failed to update data provider');
    }
  });

  return (
    <div className="space-y-6">
      {isLoading && (
        <div className="flex justify-center p-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      )}
      {!isLoading && (
        <>
          <div>
            <h1 className="text-4xl font-black text-white mb-2">Settings</h1>
            <p className="dark:text-gray-400 light:text-slate-500">Manage platform settings</p>
          </div>

          <div className="glass-panel rounded-2xl p-6 border border-white/10 space-y-6">
            <div>
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <Globe className="w-5 h-5" />
                General Settings
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-white mb-2">Site Name</label>
                  <input
                    type="text"
                    value={settings.siteName}
                    onChange={(e) => setSettings({ ...settings, siteName: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-white mb-2">Site Description</label>
                  <input
                    type="text"
                    value={settings.siteDescription}
                    onChange={(e) => setSettings({ ...settings, siteDescription: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <Database className="w-5 h-5" />
                Data Source Provider
              </h2>
              <div className="space-y-4">
                <p className="text-sm dark:text-gray-400 light:text-slate-500 mb-4">
                  Select which API the bot should use to fetch prices and scan the market.
                  Coinray helps bypass Binance limits.
                </p>

                <div className="flex items-center gap-4">
                  <button
                    onClick={() => updateProviderMutation.mutate(DataProvider.BINANCE)}
                    className={`flex-1 py-4 px-6 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all ${dbSettings?.activeProvider === DataProvider.BINANCE
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-white/10 bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                      }`}
                  >
                    <div className="font-bold text-lg">Binance API</div>
                    <div className="text-xs opacity-70">Strict Rate Limits (418)</div>
                  </button>

                  <button
                    onClick={() => updateProviderMutation.mutate(DataProvider.COINRAY)}
                    className={`flex-1 py-4 px-6 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all ${dbSettings?.activeProvider === DataProvider.COINRAY
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-white/10 bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                      }`}
                  >
                    <div className="font-bold text-lg">Coinray API</div>
                    <div className="text-xs opacity-70">Private & Unlimited</div>
                  </button>
                </div>

                {updateProviderMutation.isPending && (
                  <p className="text-primary text-sm mt-2 animate-pulse">Switching provider...</p>
                )}
              </div>
            </div>

            <div>
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Security Settings
              </h2>
              <div className="space-y-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.maintenanceMode}
                    onChange={(e) => setSettings({ ...settings, maintenanceMode: e.target.checked })}
                    className="w-5 h-5 rounded bg-white/5 border border-white/10 text-primary focus:ring-2 focus:ring-primary"
                  />
                  <span className="text-white font-bold">Maintenance Mode</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.allowRegistrations}
                    onChange={(e) => setSettings({ ...settings, allowRegistrations: e.target.checked })}
                    className="w-5 h-5 rounded bg-white/5 border border-white/10 text-primary focus:ring-2 focus:ring-primary"
                  />
                  <span className="text-white font-bold">Allow New Registrations</span>
                </label>
              </div>
            </div>

            <button className="px-6 py-3 bg-primary text-black font-bold rounded-xl hover:bg-primary/90 transition-all flex items-center gap-2">
              <Save className="w-5 h-5" />
              Save Settings
            </button>
          </div>
        </>)}
    </div>
  );
}
