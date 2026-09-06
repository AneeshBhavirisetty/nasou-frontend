import { useState } from 'react';
import { Button } from './ui';
import { adminApi } from '../lib/api';
import { motion } from 'framer-motion';

export default function AdminProductCard({ product, onEdit, onDelete }) {
  const [loading, setLoading] = useState(false);
  const [inventoryLoading, setInventoryLoading] = useState(false);
  const [inventory, setInventory] = useState(product.stock ?? 0);

  const handleInventoryChange = async (change) => {
    setInventoryLoading(true);
    try {
      const newQuantity = Math.max(0, inventory + change);
      await adminApi.updateInventory(product.sku, { quantity: newQuantity });
      setInventory(newQuantity);
    } catch (err) {
      console.error('Failed to update inventory:', err);
      alert('Failed to update inventory. Please try again.');
    } finally {
      setInventoryLoading(false);
    }
  };

  const handleDelete = async () => {
    if (window.confirm(`Are you sure you want to delete "${product.name}"?`)) {
      setLoading(true);
      try {
        await adminApi.deleteProduct(product.id);
        onDelete(product.id);
      } catch (err) {
        console.error('Failed to delete product:', err);
        alert('Failed to delete product. Please try again.');
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-white rounded-xl p-6 shadow-card hover:shadow-lg transition-shadow"
    >
      <div className="flex items-start justify-between">
        <div className="flex-shrink-0 h-12 w-12 bg-forest/10 rounded flex items-center justify-center text-forest">
          {product.name.charAt(0)}
        </div>
        <div className="flex-1 ml-4">
          <h3 className="font-medium text-ink-70">{product.name}</h3>
          <p className="mt-1 text-sm text-ink-400">
            SKU: {product.sku} • {product.category}
          </p>
          <p className="mt-1 text-sm text-ink-400 line-through">
            ₹{((product.price || 0) / 100).toFixed(2)}
          </p>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-ink-600">Stock:</span>
          <div className="flex-1 bg-line/50 rounded-xl px-3 py-1.5 text-sm">
            {inventory} units
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => handleInventoryChange(-1)}
              variant="ghost"
              size="sm"
              disabled={inventoryLoading}
            >
              <Icon name="minus" size={14} />
            </Button>
            <Button
              onClick={() => handleInventoryChange(1)}
              variant="ghost"
              size="sm"
              disabled={inventoryLoading}
            >
              <Icon name="plus" size={14} />
            </Button>
          </div>
          {inventory === 0 && (
            <span className="px-2 py-0.5 bg-clay-100 text-clay-800 text-xs rounded">
              Out of Stock
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-ink-600">Price:</span>
          <span className="font-medium text-forest">
            ₹{((product.price || 0) / 100).toFixed(2)}
          </span>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-line">
        <div className="flex items-center justify-between">
          <Button
            onClick={() => onEdit(product)}
            variant="outline"
            size="sm"
          >
            Edit
          </Button>
          <Button
            onClick={handleDelete}
            variant="ghost"
            size="sm"
            disabled={loading}
          >
            {loading ? 'Deleting...' : 'Delete'}
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

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