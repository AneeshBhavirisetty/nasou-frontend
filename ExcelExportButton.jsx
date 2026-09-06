import { useState } from 'react';
import { Button } from './ui';
import { adminApi } from '../lib/api';
import { motion } from 'framer-motion';

export default function ExcelExportButton({ endpoint, filename, label }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleExport = async () => {
    setLoading(true);
    setError('');
    try {
      // Assuming the endpoint returns the Excel file as a blob
      const response = await adminApi.export(endpoint, {
        method: 'GET',
        // We might need to handle this differently depending on how the API works
        // For now, we'll assume there's an export method in adminApi
      });

      // Create a blob from the response and trigger download
      const blob = new Blob([response], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename || 'export.xlsx';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Export failed:', err);
      setError('Failed to export data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      onClick={handleExport}
      variant="outline"
      size="sm"
      disabled={loading}
      className="flex items-center gap-2"
    >
      {loading ? 'Exporting...' : label || 'Export to Excel'}
      {!loading && (
        <>
          <Icon name="fileExcel" size={16} />
        </>
      )}
    </Button>
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
      <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
      <path d="M14 2v4h5" />
    </svg>
  );
};