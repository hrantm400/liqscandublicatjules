import { useState } from 'react';
import { motion } from 'framer-motion';
import { Save, Bell, Shield, Globe } from 'lucide-react';

export function Settings() {
  const [settings, setSettings] = useState({
    siteName: 'LiquidityScan',
    siteDescription: 'Trading Platform',
    maintenanceMode: false,
    allowRegistrations: true,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-black text-white mb-2">Settings</h1>
        <p className="text-gray-400">Manage platform settings</p>
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
    </div>
  );
}
