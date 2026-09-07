import { useState } from 'react';
import { Button } from './ui';
import { useToast } from '../context/ToastContext';
import { downloadSheet, isoDate } from '../lib/exportSheet';

/* Simple one-click export for tables that do not need a date/status filter
   (Products, Users). Orders uses <ExportDialog> instead. */
export default function ExcelExportButton({ filename = 'export', label = 'Export to Excel', headers = [], rows = [] }) {
  const toast = useToast();
  const [state, setState] = useState('idle');

  const run = () => {
    if (state === 'working' || rows.length === 0) return;
    setState('working');
    setTimeout(() => {
      downloadSheet(`${filename}-${isoDate()}.csv`, headers, rows);
      setState('done');
      toast.success(`${rows.length} rows exported`);
      setTimeout(() => setState('idle'), 2200);
    }, 400);
  };

  return (
    <Button
      onClick={run}
      variant="outline"
      size="sm"
      icon={state === 'done' ? 'check' : 'external'}
      loading={state === 'working'}
      disabled={rows.length === 0}
    >
      {state === 'working' ? 'Building…' : state === 'done' ? 'Ready' : label}
    </Button>
  );
}
