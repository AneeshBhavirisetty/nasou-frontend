import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { adminApi } from '../../lib/api';
import { Button, Container, Field } from '../../components/ui';
import AdminProductCard from '../../components/AdminProductCard';
import { motion } from 'framer-motion';
import ExcelExportButton from '../../components/ExcelExportButton';

export default function AdminProducts() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        const params = {};
        if (search) params.query = search;
        if (filterCategory) params.category = filterCategory;

        const data = await adminApi.products(params);
        setProducts(data);
      } catch (err) {
        console.error('Failed to fetch products:', err);
        // Demo data
        setProducts([
          {
            id: 1,
            sku: 'NS001',
            name: 'Organic Cotton T-Shirt',
            category: 'Clothing',
            price: 999,
            stock: 50,
            image: 'https://via.placeholder.com/300',
          },
          {
            id: 2,
            sku: 'NS002',
            name: 'Bamboo Water Bottle',
            category: 'Accessories',
            price: 499,
            stock: 30,
            image: 'https://via.placeholder.com/300',
          },
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [search, filterCategory]);

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      try {
        await adminApi.deleteProduct(id);
        setProducts(products.filter(p => p.id !== id));
      } catch (err) {
        setError('Failed to delete product. Please try again.');
      }
    }
  };

  const handleEdit = (product) => {
    navigate(`/admin/products/edit/${product.id}`);
  };

  const handleCreate = () => {
    navigate('/admin/products/create');
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
            <h1 className="text-2xl font-bold text-forest">Product Management</h1>
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
                Loading Products…
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
            <h1 className="text-2xl font-bold text-forest">Product Management</h1>
            <div className="flex items-center gap-3">
              <Button
                onClick={handleCreate}
                variant="secondary"
              >
                <Icon name="plus" size={16} /> Add Product
              </Button>
              <ExcelExportButton endpoint="/admin/products/export" filename="products.xlsx" />
            </div>
          </div>

          {/* Search and filters */}
          <div className="bg-white rounded-xl p-6 shadow-card">
            <form className="grid gap-4 md:grid-cols-[200px_1fr_1fr_200px] items-end">
              <div>
                <Label htmlFor="search" className="mb-1 block text-sm font-medium text-ink-70">
                  Search products
                </Label>
                <Field
                  id="search"
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name, SKU, or category"
                />
              </div>
              <div>
                <Label htmlFor="category" className="mb-1 block text-sm font-medium text-ink-70">
                  Category
                </Label>
                <Field
                  id="category"
                  type="text"
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  placeholder="Filter by category"
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
                    setFilterCategory('');
                  }}
                  variant="ghost"
                  size="sm"
                >
                  Reset
                </Button>
              </div>
            </form>
          </div>

          {/* Products list */}
          <div className="bg-white rounded-xl p-6 shadow-card">
            {products.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-ink-50">No products found.</p>
                <Button
                  onClick={handleCreate}
                  variant="outline"
                >
                  Add First Product
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {products.map((product) => (
                  <motion.div
                    key={product.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: products.indexOf(product) * 0.05, duration: 0.3 }}
                  >
                    <AdminProductCard
                      product={product}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                    />
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          {/* Pagination placeholder */}
          <div className="flex items-center justify-between pt-4 border-t border-line">
            <p className="text-sm text-ink-400">
              Showing {products.length} products
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