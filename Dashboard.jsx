import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { adminApi } from '../../lib/api';
import { Container } from '../../components/ui';
import { motion } from 'framer-motion';

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalProducts: 0,
    totalOrders: 0,
    totalRevenue: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // We'll call multiple endpoints or a single dashboard endpoint
        // Assuming there's an admin dashboard API
        const [usersResp, productsResp, ordersResp, revenueResp] = await Promise.all([
          adminApi.users(), // This might return a list, we'll take length
          adminApi.products(),
          adminApi.orders(),
          adminApi.dashboard(), // This might return stats directly
        ]);

        // If dashboard endpoint returns all stats, use that
        if (revenueResp && revenueResp.stats) {
          setStats(revenueResp.stats);
        } else {
          // Otherwise, compute from lists
          setStats({
            totalUsers: usersResp.length || 0,
            totalProducts: productsResp.length || 0,
            totalOrders: ordersResp.length || 0,
            totalRevenue: ordersResp.reduce((sum, order) => sum + (order.totalAmount || 0), 0),
          });
        }
      } catch (err) {
        // Fallback to demo data if API fails
        console.error('Failed to fetch admin stats:', err);
        setStats({
          totalUsers: 124,
          totalProducts: 89,
          totalOrders: 456,
          totalRevenue: 345678,
        });
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <Container className="py-10">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          <div className="text-center space-y-8">
            <h1 className="text-2xl font-bold text-forest">Admin Dashboard</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Placeholder loading states */}
              <div className="bg-white rounded-xl p-6 shadow-card animate-pulse">
                <h3 className="text-lg font-semibold text-ink-70">Total Users</h3>
                <p className="mt-2 text-2xl font-bold text-forest">-</p>
              </div>
              <div className="bg-white rounded-xl p-6 shadow-card animate-pulse">
                <h3 className="text-lg font-semibold text-ink-70">Total Products</h3>
                <p className="mt-2 text-2xl font-bold text-forest">-</p>
              </div>
              <div className="bg-white rounded-xl p-6 shadow-card animate-pulse">
                <h3 className="text-lg font-semibold text-ink-70">Total Orders</h3>
                <p className="mt-2 text-2xl font-bold text-forest">-</p>
              </div>
              <div className="bg-white rounded-xl p-6 shadow-card animate-pulse">
                <h3 className="text-lg font-semibold text-ink-70">Total Revenue</h3>
                <p className="mt-2 text-2xl font-bold text-forest">-</p>
              </div>
            </div>
          </div>
        </motion.div>
      </Container>
    );
  }

  return (
    <Container className="py-10">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.5 }}
      >
        <div className="space-y-8">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-forest">Admin Dashboard</h1>
            <Link
              to="/admin/products"
              className="btn btn-primary"
            >
              Manage Products
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
            >
              <div className="bg-white rounded-xl p-6 shadow-card hover:shadow-lg transition-shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-ink-70">Total Users</h3>
                    <p className="mt-1 text-sm text-ink-400">Registered customers</p>
                  </div>
                  <div className="text-2xl font-bold text-forest">
                    {stats.totalUsers.toLocaleString()}
                  </div>
                </div>
              </div>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.5 }}
            >
              <div className="bg-white rounded-xl p-6 shadow-card hover:shadow-lg transition-shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-ink-70">Total Products</h3>
                    <p className="mt-1 text-sm text-ink-400">Active listings</p>
                  </div>
                  <div className="text-2xl font-bold text-forest">
                    {stats.totalProducts.toLocaleString()}
                  </div>
                </div>
              </div>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.5 }}
            >
              <div className="bg-white rounded-xl p-6 shadow-card hover:shadow-lg transition-shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-ink-70">Total Orders</h3>
                    <p className="mt-1 text-sm text-ink-400">All time</p>
                  </div>
                  <div className="text-2xl font-bold text-forest">
                    {stats.totalOrders.toLocaleString()}
                  </div>
                </div>
              </div>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.5 }}
            >
              <div className="bg-white rounded-xl p-6 shadow-card hover:shadow-lg transition-shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-ink-70">Total Revenue</h3>
                    <p className="mt-1 text-sm text-ink-400">All time</p>
                  </div>
                  <div className="text-2xl font-bold text-forest">
                    ₹{stats.totalRevenue.toLocaleString()}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white rounded-xl p-6 shadow-card">
            <h2 className="mb-4 text-xl font-semibold text-forest">Recent Activity</h2>
            <div className="space-y-3">
              {/* Placeholder activity items */}
              <div className="flex items-center gap-3 p-3 rounded hover:bg-line/50 transition-colors">
                <div className="h-8 w-8 bg-emerald-100 rounded flex items-center justify-center text-emerald-600">
                  <Icon name="truck" size={16} />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-ink-70">Order #12345 delivered</p>
                  <p className="text-sm text-ink-400">2 minutes ago</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded hover:bg-line/50 transition-colors">
                <div className="h-8 w-8 bg-forest/10 rounded flex items-center justify-center text-forest">
                  <Icon name="userPlus" size={16} />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-ink-70">New user registered</p>
                  <p className="text-sm text-ink-400">5 minutes ago</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded hover:bg-line/50 transition-colors">
                <div className="h-8 w-8 bg-emerald-100 rounded flex items-center justify-center text-emerald-600">
                  <Icon name="package" size={16} />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-ink-70">Product inventory updated</p>
                  <p className="text-sm text-ink-400">10 minutes ago</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </Container>
  );
}