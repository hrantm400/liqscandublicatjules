import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Search, DollarSign, CheckCircle, XCircle, Clock } from 'lucide-react';
// import { adminApi } from '../../services/userApi'; // TODO: Re-enable when API is created

export function PaymentsManagement() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [page, setPage] = useState(1);

  // TODO: Re-enable when API is created
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'payments', page, search, statusFilter],
    queryFn: async () => {
      // return adminApi.getPayments({ page, limit: 20, search, status: statusFilter });
      return { data: [], total: 0, page: 1, pageCount: 1 };
    },
  });

  const payments = data?.data || [];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-400" />;
      default:
        return <Clock className="w-4 h-4 text-yellow-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500/10 text-green-400';
      case 'failed':
        return 'bg-red-500/10 text-red-400';
      default:
        return 'bg-yellow-500/10 text-yellow-400';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-black text-white mb-2">Payments Management</h1>
        <p className="text-gray-400">View and manage all payments</p>
      </div>

      <div className="glass-panel rounded-2xl p-4 border border-white/10">
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search payments..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="" className="bg-background-dark">All Status</option>
            <option value="pending" className="bg-background-dark">Pending</option>
            <option value="completed" className="bg-background-dark">Completed</option>
            <option value="failed" className="bg-background-dark">Failed</option>
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        </div>
      ) : payments.length === 0 ? (
        <div className="glass-panel rounded-2xl p-12 text-center border border-white/10">
          <DollarSign className="w-16 h-16 text-gray-500 mx-auto mb-4" />
          <p className="text-gray-400">No payments found</p>
        </div>
      ) : (
        <div className="glass-panel rounded-2xl border border-white/10 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-white/5 border-b border-white/10">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase">User</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase">Amount</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase">Method</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {payments.map((payment: any) => (
                  <motion.tr
                    key={payment.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="hover:bg-white/5 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="font-medium text-white">{payment.user?.name || payment.user?.email}</div>
                      <div className="text-sm text-gray-400">{payment.user?.email}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-white">
                        ${typeof payment.amount === 'number' ? payment.amount.toFixed(2) : payment.amount} {payment.currency}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-lg text-sm font-bold flex items-center gap-2 w-fit ${getStatusColor(payment.status)}`}>
                        {getStatusIcon(payment.status)}
                        {payment.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-300">{payment.paymentMethod || '-'}</td>
                    <td className="px-6 py-4 text-gray-300">
                      {new Date(payment.createdAt).toLocaleDateString()}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
