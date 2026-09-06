import { useState } from 'react';
import { Button } from './ui';
import { useToast } from '../context/ToastContext';

/* Demo export: simulates a server-side workbook build, then confirms.
   (No real endpoint in the mock storefront.) */
export default function ExcelExportButton({ filename = 'export.xlsx', label = 'Export to Excel' }) {
  const toast = useToast();
  const [state, setState] = useState('idle'); // idle | working | done

  const run = () => {
    if (state === 'working') return;
    setState('working');
    setTimeout(() => {
      setState('done');
      toast.success(`${filename} is ready — check your downloads folder.`);
      setTimeout(() => setState('idle'), 2500);
    }, 1100);
  };

  return (
    <Button
      onClick={run}
      variant="outline"
      size="sm"
      icon={state === 'done' ? 'check' : 'external'}
      loading={state === 'working'}
    >
      {state === 'working' ? 'Building…' : state === 'done' ? 'Ready' : label}
    </Button>
  );
}
