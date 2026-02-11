import { useState } from 'react';
import { motion } from 'framer-motion';
import { useTheme } from '../contexts/ThemeContext';
import { ThemeToggle } from '../components/ThemeToggle';
import { pageVariants, staggerContainer, listItemVariants } from '../utils/animations';

export function Settings() {
  const { theme } = useTheme();
  const [notifications, setNotifications] = useState({
    email: true,
    push: false,
    signals: true,
  });

  return (
    <motion.div
      className="space-y-6"
      initial="initial"
      animate="animate"
      exit="exit"
      variants={staggerContainer}
    >
      <motion.div variants={listItemVariants} className="flex items-center justify-between">
        <h1 className="text-3xl font-bold dark:text-white light:text-text-dark">Settings</h1>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div variants={listItemVariants} className="glass-panel rounded-xl p-6 border dark:border-white/5 light:border-green-300 dark:bg-surface-dark/60 light:bg-white">
          <h2 className="text-xl font-bold dark:text-white light:text-text-dark mb-6">Appearance</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="dark:text-white light:text-text-dark font-medium">Theme</p>
                <p className="text-sm dark:text-gray-400 light:text-text-light-secondary">Switch between dark and light mode</p>
              </div>
              <ThemeToggle />
            </div>
          </div>
        </motion.div>

        <motion.div variants={listItemVariants} className="glass-panel rounded-xl p-6 border dark:border-white/5 light:border-green-300 dark:bg-surface-dark/60 light:bg-white">
          <h2 className="text-xl font-bold dark:text-white light:text-text-dark mb-6">Notifications</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="dark:text-white light:text-text-dark font-medium">Email Notifications</p>
                <p className="text-sm dark:text-gray-400 light:text-text-light-secondary">Receive email alerts for signals</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifications.email}
                  onChange={(e) => setNotifications({ ...notifications, email: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="dark:text-white light:text-text-dark font-medium">Push Notifications</p>
                <p className="text-sm dark:text-gray-400 light:text-text-light-secondary">Browser push notifications</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifications.push}
                  onChange={(e) => setNotifications({ ...notifications, push: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="dark:text-white light:text-text-dark font-medium">Signal Alerts</p>
                <p className="text-sm dark:text-gray-400 light:text-text-light-secondary">Alert when new signals are detected</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifications.signals}
                  onChange={(e) => setNotifications({ ...notifications, signals: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
