import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Users, BookOpen, DollarSign, TrendingUp, ArrowUpRight, ArrowDownRight } from 'lucide-react';
// import { adminApi } from '../../services/userApi'; // TODO: Re-enable when API is created

export function AdminDashboard() {
  // TODO: Re-enable when API is created
  const { data: analytics, isLoading } = useQuery({
    queryKey: ['admin', 'analytics'],
    queryFn: async () => {
      // return adminApi.getAnalytics();
      return {
        stats: {
          totalUsers: 0,
          totalPayments: 0,
          revenue: 0,
        },
        recentUsers: [],
      };
    },
  });

  const stats = [
    {
      label: 'Total Users',
      value: analytics?.stats?.totalUsers || 0,
      icon: Users,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
      change: '+12%',
      trend: 'up',
    },
    {
      label: 'Revenue',
      value: `$${analytics?.stats?.revenue?.toFixed(2) || '0.00'}`,
      icon: DollarSign,
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-500/10',
      change: '+18%',
      trend: 'up',
    },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-black text-white mb-2">Admin Dashboard</h1>
        <p className="text-gray-400">Overview of your platform</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="glass-panel rounded-2xl p-6 border border-white/10"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`w-12 h-12 rounded-xl ${stat.bgColor} flex items-center justify-center`}>
                  <Icon className={`w-6 h-6 ${stat.color}`} />
                </div>
                <div className={`flex items-center gap-1 text-sm font-bold ${
                  stat.trend === 'up' ? 'text-green-400' : 'text-red-400'
                }`}>
                  {stat.trend === 'up' ? (
                    <ArrowUpRight className="w-4 h-4" />
                  ) : (
                    <ArrowDownRight className="w-4 h-4" />
                  )}
                  {stat.change}
                </div>
              </div>
              <div className="text-3xl font-black text-white mb-1">{stat.value}</div>
              <div className="text-sm text-gray-400">{stat.label}</div>
            </motion.div>
          );
        })}
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 gap-6">
        {/* Recent Users */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="glass-panel rounded-2xl p-6 border border-white/10"
        >
          <h2 className="text-xl font-bold text-white mb-4">Recent Users</h2>
          <div className="space-y-3">
            {analytics?.recentUsers?.length > 0 ? (
              analytics.recentUsers.map((user: any) => (
                <div key={user.id} className="flex items-center gap-3 p-3 rounded-lg bg-white/5">
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                    {user.name?.[0] || user.email?.[0] || 'U'}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-white">{user.name || user.email}</div>
                    <div className="text-xs text-gray-400">{user.email}</div>
                  </div>
                  <div className="text-xs text-gray-500">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-400">No recent users</div>
            )}
          </div>
        </motion.div>

      </div>
    </div>
  );
}
