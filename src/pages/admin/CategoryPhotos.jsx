import { useState } from 'react';
import Icon from '../../components/Icon';
import CategoryCard from '../../components/home/CategoryCard';
import { AdminPageHead, Panel, ViewOnlyBanner } from '../../components/admin/AdminUI';
import { Button } from '../../components/ui';
import { useIam } from '../../context/IamStore';
import { useToast } from '../../context/ToastContext';
import { coverPhoto, departments } from '../../data/catalog';
import { categoryPhotoUrl, settingsStore, useSettings } from '../../store/settings';
import { del, post } from '../../lib/api';
import { LIVE } from '../../lib/config';

/* Category photos (client, 29 Oct 2026): the photo on each card of the home
   page's "Everything a site needs" section. Owner, Operations and Management
   can change them (the sitePhotos permission). Each upload is kept in blob
   storage at "Nivora Site/categories/<CATEGORY>/cover.<ext>" (nasou-api
   SitePhotoService); without one, the card uses a photo from the category's
   products. The preview is the storefront's own card. */

const when = (iso) => (iso ? new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : '');

/* width and height of a picked file, to warn about a shape that will be cropped */
const measure = (file) => new Promise((resolve) => {
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.onload = () => { resolve({ w: img.naturalWidth, h: img.naturalHeight }); URL.revokeObjectURL(url); };
  img.onerror = () => { resolve(null); URL.revokeObjectURL(url); };
  img.src = url;
});

function PhotoRow({ dept, entry, canEdit }) {
  const toast = useToast();
  const [busy, setBusy] = useState('');
  const uploaded = categoryPhotoUrl({ [dept.slug]: entry }, dept.slug);

  const upload = async (file) => {
    if (!file) return;
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return toast.error('Choose a JPEG, PNG or WebP image.');
    if (file.size > 5 * 1024 * 1024) return toast.error('Keep the photo under 5 MB.');
    const size = await measure(file);
    setBusy('upload');
    try {
      const form = new FormData();
      form.append('file', file);
      const all = await post(`/admin/site-photos/categories/${dept.slug}`, form);
      settingsStore.set((s) => ({ ...s, categoryPhotos: all }));
      const ratio = size ? size.w / size.h : 4 / 3;
      toast.success(ratio < 1.15 || ratio > 1.55
        ? `${dept.name} photo saved — it is not landscape 4:3, so its edges are trimmed on the card.`
        : `${dept.name} photo saved`);
    } catch (x) {
      toast.error(x.message);
    } finally {
      setBusy('');
    }
  };

  const reset = async () => {
    setBusy('reset');
    try {
      const all = await del(`/admin/site-photos/categories/${dept.slug}`);
      settingsStore.set((s) => ({ ...s, categoryPhotos: all }));
      toast.success(`${dept.name} is back to the automatic photo`);
    } catch (x) {
      toast.error(x.message);
    } finally {
      setBusy('');
    }
  };

  return (
    <div className="flex flex-col gap-3 rounded-[22px] border border-line bg-white/70 p-3 shadow-card">
      <CategoryCard dept={dept} photo={uploaded || coverPhoto(`dept:${dept.slug}`)} uploaded={!!uploaded} className="shadow-none" />
      <div className="px-1">
        <p className="text-[12.5px] font-bold text-ink">{uploaded ? 'Uploaded photo' : 'Automatic — taken from its products'}</p>
        {entry && <p className="text-[11.5px] text-ink-50">{entry.updatedBy} · {when(entry.updatedAt)}</p>}
        <p className="mt-1 break-all font-mono text-[10.5px] text-ink-35">{entry?.path || `Nivora Site/categories/${dept.name.toUpperCase()}/cover.jpg`}</p>
      </div>
      {canEdit && (
        <div className="mt-auto flex flex-wrap gap-2">
          <label className="flex-1">
            <span className={`inline-flex h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-md px-4 text-[13px] font-bold shadow-btn button-primary ${busy ? 'pointer-events-none opacity-60' : ''}`}>
              <Icon name={busy === 'upload' ? 'spinner' : 'upload'} size={15} className={busy === 'upload' ? 'animate-spin' : ''} />
              {uploaded ? 'Replace photo' : 'Upload photo'}
            </span>
            <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={!!busy} onChange={(e) => { upload(e.target.files?.[0]); e.target.value = ''; }} />
          </label>
          {uploaded && <Button size="sm" variant="outline" icon="refresh" loading={busy === 'reset'} disabled={!!busy} onClick={reset} className="h-10">Use automatic</Button>}
        </div>
      )}
    </div>
  );
}

export default function CategoryPhotos() {
  const { can } = useIam();
  const canEdit = LIVE && can('sitePhotos', 'edit');
  const photos = useSettings((s) => s.categoryPhotos) || {};

  return (
    <div className="space-y-5">
      <AdminPageHead title="Category photos" note="The photo on each card of the home page’s “Everything a site needs” section." />
      {!can('sitePhotos', 'edit') && <ViewOnlyBanner what="category photos" />}
      {!LIVE && <p className="rounded-[14px] bg-amber-50 px-3 py-2 text-[12.5px] font-semibold text-amber">Uploading needs the live API (not available in the browser demo).</p>}
      <Panel title="How it works" note="Upload a landscape photo, ideally 4:3 and at least 1200 × 900 px (JPEG, PNG or WebP, up to 5 MB). Every card shows its photo in the same 4:3 frame. Each photo is stored in Azure Blob Storage at the path under it — replacing that file there works too (cards update within a few minutes). Without an upload, a card uses a photo from the category’s products." />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {departments.map((d) => <PhotoRow key={d.slug} dept={d} entry={photos[d.slug]} canEdit={canEdit} />)}
      </div>
    </div>
  );
}
