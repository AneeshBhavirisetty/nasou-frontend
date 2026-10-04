import { useState } from 'react';
import Modal from '../Modal';
import { Button } from '../ui';
import { TEXTAREA_CLS, LABEL_CLS } from './AdminUI';

/* A confirm step that needs a written reason — rejections, suspensions,
   deletion requests, "view as retailer". The reason goes in the audit log
   and, where relevant, to the person affected. */
export default function ReasonDialog({ open, onClose, title, intro, label = 'Reason', placeholder = '', confirm = 'Confirm', tone = 'primary', minLength = 8, children, onConfirm, extraValid = true }) {
  const [text, setText] = useState('');
  const [err, setErr] = useState('');
  if (!open) return null;
  const submit = (e) => {
    e.preventDefault();
    if (text.trim().length < minLength) return setErr(`Write at least ${minLength} characters.`);
    if (!extraValid) return setErr('Complete the confirmation above.');
    try {
      onConfirm(text.trim());
      setText('');
      onClose();
    } catch (x) {
      setErr(x.message);
    }
  };
  return (
    <Modal open onClose={onClose} title={title} size="md">
      <form onSubmit={submit} className="space-y-4">
        {intro && <div className="text-[13.5px] leading-relaxed text-ink-70">{intro}</div>}
        {children}
        <label className="block">
          <span className={LABEL_CLS}>{label}</span>
          <textarea value={text} onChange={(e) => { setText(e.target.value); setErr(''); }} placeholder={placeholder} className={TEXTAREA_CLS} autoFocus />
        </label>
        {err && <p role="alert" className="rounded-md bg-clay-50 px-3 py-2.5 text-[13px] text-clay-600">{err}</p>}
        <div className="flex justify-end gap-3 border-t border-line pt-4">
          <button type="button" onClick={onClose} className="h-10 rounded-md border border-line px-5 text-[13.5px] font-semibold text-ink-70 hover:border-ink-35">Cancel</button>
          <Button type="submit" className={tone === 'danger' ? '!border-clay !bg-clay hover:!bg-clay-600' : ''}>{confirm}</Button>
        </div>
      </form>
    </Modal>
  );
}
