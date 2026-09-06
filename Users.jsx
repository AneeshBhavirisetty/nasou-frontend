import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { adminApi } from '../../lib/api';
import { Button, Container, Field } from '../../components/ui';
import { motion } from 'framer-motion';
import ExcelExportButton from '../../components/ExcelExportButton';

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        const params = {};
        if (search) params.query = search;
        if (filterRole) params.role = filterRole;

        const data = await adminApi.users(params);
        setUsers(data);
      } catch (err) {
        console.error('Failed to fetch users:', err);
        // Demo data
        setUsers([
          {
            id: 1,
            fullName: 'Priya Sharma',
            email: 'priya@example.com',
            phone: '+91 98765 43210',
            role: 'ADMIN',
            createdAt: '2024-01-15T10:30:00Z',
          },
          {
            id: 2,
            fullName: 'Rahul Kumar',
            email: 'rahul@example.com',
            phone: '+91 98765 43211',
            role: 'RETAILER',
            createdAt: '2024-01-16T14:22:00Z',
          },
          {
            id: 3,
            fullName: 'Amit Patel',
            email: 'amit@example.com',
            phone: '+91 98765 43212',
            role: 'CUSTOMER',
            createdAt: '2024-01-17T09:15:00Z',
          },
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [search, filterRole]);

  const handleEdit = (user) => {
    // In a real app, we'd navigate to an edit page
    alert(`Edit functionality for ${user.fullName} would go here`);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      try {
        await adminApi.updateUser(id, { role: 'DELETED' }); // Soft delete or actual delete
        setUsers(users.filter(u => u.id !== id));
      } catch (err) {
        setError('Failed to delete user. Please try again.');
      }
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
            <h1 className="text-2xl font-bold text-forest">User Management</h1>
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
                Loading Users…
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
            <h1 className="text-2xl font-bold text-forest">User Management</h1>
            <div className="flex items-center gap-3">
              <Button
                onClick={() => alert('Add user functionality would go here')}
                variant="secondary"
              >
                <Icon name="plus" size={16} /> Add User
              </Button>
              <ExcelExportButton endpoint="/admin/users/export" filename="users.xlsx" />
            </div>
          </div>

          {/* Search and filters */}
          <div className="bg-white rounded-xl p-6 shadow-card">
            <form className="grid gap-4 md:grid-cols-[200px_1fr_1fr_200px] items-end">
              <div>
                <Label htmlFor="search" className="mb-1 block text-sm font-medium text-ink-70">
                  Search users
                </Label>
                <Field
                  id="search"
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name, email, or phone"
                />
              </div>
              <div>
                <Label htmlFor="role" className="mb-1 block text-sm font-medium text-ink-70">
                  Role
                </Label>
                <Field
                  id="role"
                  type="text"
                  value={filterRole}
                  onChange={(e) => setFilterRole(e.target.value)}
                  placeholder="Filter by role"
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
                    setFilterRole('');
                  }}
                  variant="ghost"
                  size="sm"
                >
                  Reset
                </Button>
              </div>
            </form>
          </div>

          {/* Users list */}
          <div className="bg-white rounded-xl p-6 shadow-card">
            {users.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-ink-50">No users found.</p>
                <Button
                  onClick={() => alert('Add user functionality would go here')}
                  variant="outline"
                >
                  Add First User
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {users.map((user) => (
                  <motion.div
                    key={user.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: users.indexOf(user) * 0.05, duration: 0.3 }}
                  >
                    <div className="bg-white rounded-xl p-4 shadow-card hover:shadow-lg transition-shadow">
                      <div className="flex items-start justify-between">
                        <div className="flex-shrink-0 h-10 w-10 bg-forest/10 rounded flex items-center justify-center text-forest">
                          {user.fullName.charAt(0)}
                        </div>
                        <div className="flex-1 ml-4">
                          <h3 className="font-medium text-ink-70">{user.fullName}</h3>
                          <p className="mt-1 text-sm text-ink-400">
                            {user.email} • {user.phone}
                          </p>
                          <p className="mt-1 text-sm text-ink-400">
                            <span className={`px-2 py-0.5 rounded text-xs ${
                              user.role === 'ADMIN'
                                ? 'bg-forest/10 text-forest'
                                : user.role === 'RETAILER'
                                ? 'bg-emerald/10 text-emerald'
                                : 'bg-line/10 text-ink-70'
                            }`}
                              >{user.role}</span>
                          </p>
                        </div>
                      </div>

                      <div className="mt-3 pt-2 border-t border-line">
                        <div className="flex items-center justify-between">
                          <Button
                            onClick={() => handleEdit(user)}
                            variant="outline"
                            size="sm"
                          >
                            Edit
                          </Button>
                          <Button
                            onClick={() => handleDelete(user.id)}
                            variant="ghost"
                            size="sm"
                          >
                            Delete
                          </Button>
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
              Showing {users.length} users
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