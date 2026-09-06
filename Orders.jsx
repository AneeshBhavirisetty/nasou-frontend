import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { adminApi } from '../../lib/api';
import { Button, Container, Field } from '../../components/ui';
import { motion } from 'framer-motion';
import ExcelExportButton from '../../components/ExcelExportButton';

export default function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setLoading(true);
        const params = {};
        if (search) params.query = search;
        if (filterStatus) params.status = filterStatus;

        const data = await adminApi.orders(params);
        setOrders(data);
      } catch (err) {
        console.error('Failed to fetch orders:', err);
        // Demo data
        setOrders([
          {
            id: 1,
            orderNumber: 'ORD-001',
            user: { fullName: 'Priya Sharma' },
            totalAmount: 1499,
            status: 'delivered',
            createdAt: '2024-01-20T10:30:00Z',
          },
          {
            id: 2,
            orderNumber: 'ORD-002',
            user: { fullName: 'Rahul Kumar' },
            totalAmount: 899,
            status: 'processing',
            createdAt: '2024-01-21T14:22:00Z',
          },
          {
            id: 3,
            orderNumber: 'ORD-003',
            user: { fullName: 'Amit Patel' },
            totalAmount: 2499,
            status: 'pending',
            createdAt: '2024-01-22T09:15:00Z',
          },
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [search, filterStatus]);

  const handleViewOrder = (id) => {
    navigate(`/admin/orders/${id}`);
  };

  const handleUpdateStatus = async (id, status) => {
    try {
      await adminApi.updateOrderStatus(id, status);
      setOrders(orders.map(order =>
        order.id === id ? { ...order, status } : order
      ));
    } catch (err) {
      setError('Failed to update order status. Please try again.');
    }
  };

  if (loading) {
    return (
      <Container className="py-10">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          <div className="text-center space-y-6">
            <h1 className="text-2xl font-bold text-forest">Order Management</h1>
            <div className="flex flex-col items-center space-y-4">
              <div className="animate-pulse h-8 w-24 bg-line rounded" />
              <div className="animate-pulse h-8 w-32 bg-line rounded" />
              <div className="animate-pulse h-8 w-20 bg-line rounded" />
              <Button
                type="button"
                full
                size="lg"
                disabled
                className="mt-4"
              >
                Loading Orders…
              </Button>
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
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-forest">Order Management</h1>
            <div className="flex items-center gap-3">
              <Button
                onClick={() => alert('Order details view would go here')}
                variant="secondary"
              >
                <Icon name="eye" size={16} /> View Order
              </Button>
              <ExcelExportButton endpoint="/admin/orders/export" filename="orders.xlsx" />
            </div>
          </div>

          {/* Search and filters */}
          <div className="bg-white rounded-xl p-6 shadow-card">
            <form className="grid gap-4 md:grid-cols-[200px_1fr_1fr_200px] items-end">
              <div>
                <Label htmlFor="search" className="mb-1 block text-sm font-medium text-ink-70">
                  Search orders
                </Label>
                <Field
                  id="search"
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by order number, user name, or email"
                />
              </div>
              <div>
                <Label htmlFor="status" className="mb-1 block text-sm font-medium text-ink-70">
                  Status
                </Label>
                <Field
                  id="status"
                  type="text"
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  placeholder="Filter by status"
                />
              </div>
              <div className="flex items-end">
                <Button
                  type="submit"
                  onClick={(e) => e.preventDefault()}
                  variant="outline"
                >
                  Filter
                </Button>
                <Button
                  onClick={() => {
                    setSearch('');
                    setFilterStatus('');
                  }}
                  variant="ghost"
                  size="sm"
                >
                  Reset
                </Button>
              </div>
            </form>
          </div>

          {/* Orders list */}
          <div className="bg-white rounded-xl p-6 shadow-card">
            {orders.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-ink-50">No orders found.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {orders.map((order) => (
                  <motion.div
                    key={order.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: orders.indexOf(order) * 0.05, duration: 0.3 }}
                  >
                    <div className="bg-white rounded-xl p-4 shadow-card hover:shadow-lg transition-shadow">
                      <div className="flex items-start justify-between">
                        <div className="flex-shrink-0 h-10 w-10 bg-forest/10 rounded flex items-center justify-center text-forest">
                          {order.orderNumber.charAt(0)}
                        </div>
                        <div className="flex-1 ml-4">
                          <h3 className="font-medium text-ink-70">{order.orderNumber}</h3>
                          <p className="mt-1 text-sm text-ink-400">
                            {order.user?.fullName} • {order.user?.email}
                          </p>
                          <p className="mt-1 text-sm text-ink-400">
                            ₹{((order.totalAmount || 0) / 100).toFixed(2)} •
                            <span className={`px-2 py-0.5 rounded text-xs ${
                              order.status === 'delivered'
                                ? 'bg-emerald/10 text-emerald'
                                : order.status === 'processing'
                                ? 'bg-forest/10 text-forest'
                                : order.status === 'pending'
                                ? 'bg-line/10 text-ink-70'
                                : order.status === 'cancelled'
                                ? 'bg-clay/10 text-clay-800'
                                : 'bg-line/10 text-ink-70'
                            }`}
                              >{order.status}</span>
                          </p>
                        </div>
                      </div>

                      <div className="mt-3 pt-2 border-t border-line">
                        <div className="flex items-center justify-between">
                          <Button
                            onClick={() => handleViewOrder(order.id)}
                            variant="outline"
                            size="sm"
                          >
                            View Details
                          </Button>
                          <div className="flex items-center gap-2">
                            <Button
                              onClick={() => handleUpdateStatus(order.id, 'processing')}
                              variant="ghost"
                              size="sm"
                              disabled={order.status === 'processing'}
                            >
                              Processing
                            </Button>
                            <Button
                              onClick={() => handleUpdateStatus(order.id, 'delivered')}
                              variant="ghost"
                              size="sm"
                              disabled={order.status === 'delivered'}
                            >
                              Delivered
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          {/* Pagination placeholder */}
          <div className="flex items-center justify-between pt-4 border-t border-line">
            <p className="text-sm text-ink-400">
              Showing {orders.length} orders
            </p>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" disabled>
                « Previous
              </Button>
              <Button variant="ghost" size="sm" disabled>
                Next »
              </Button>
            </div>
          </div>
        </div>
      </motion.div>
    </Container>
  );
}

// Helper component for Label since we don't have one
const Label = ({ htmlFor, children, className }) => (
  <label htmlFor={htmlFor} className={className}>
    {children}
  </label>
);

// Helper Icon component since we don't have one imported
const Icon = ({ name, size = 16 }) => {
  // In a real app, this would use an icon library
  // For now, we'll return a placeholder
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="lucide lucide-{name}"
    >
      {/* This is a placeholder - in reality, we'd have proper icon paths */}
      <circle cx="12" cy="12" r={10} />
    </svg>
  );
};