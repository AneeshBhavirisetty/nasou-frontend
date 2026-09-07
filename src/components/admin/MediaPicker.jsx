import { useEffect, useRef, useState } from 'react';
import Modal from '../Modal';
import Icon from '../Icon';
import { Button } from '../ui';
import { useToast } from '../../context/ToastContext';
import {
  ACCEPT, MAX_IMAGES_PER_PRODUCT, deleteImage, listImages, onMediaChange, prettyBytes, putImages,
} from '../../lib/mediaStore';
import { cx } from '../../lib/format';

/* ============================================================================
 * MediaPicker — attach product images.
 *
 * Two ways in, both landing in the same store:
 *   Upload  — drop / browse new files; they are saved to blob storage.
 *   Library — pick from everything already in storage, reusable across products.
 * ==========================================================================*/
export default function MediaPicker({ open, onClose, selected = [], max = MAX_IMAGES_PER_PRODUCT, onDone }) {
  const toast = useToast();
  const [tab, setTab] = useState('library');
  const [library, setLibrary] = useState([]);
  const [picked, setPicked] = useState(selected);
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState(false);
  const fileRef = useRef(null);

  const refresh = () => listImages().then(setLibrary);
  useEffect(() => { refresh(); return onMediaChange(refresh); }, []);
  useEffect(() => { if (open) setPicked(selected); /* eslint-disable-next-line */ }, [open]);
  useEffect(() => { if (open && library.length === 0) setTab('upload'); }, [open, library.length]);

  const isPicked = (url) => picked.includes(url);
  const toggle = (url) => {
    setPicked((p) => {
      if (p.includes(url)) return p.filter((x) => x !== url);
      if (p.length >= max) { toast.warning(`Up to ${max} images per product.`); return p; }
      return [...p, url];
    });
  };

  const upload = async (files) => {
    if (!files?.length) return;
    setBusy(true);
    const { images, errors } = await putImages(files);
    setBusy(false);
    errors.forEach((e) => toast.error(e));
    if (images.length) {
      toast.success(`${images.length} image${images.length === 1 ? '' : 's'} uploaded to storage`);
      setPicked((p) => [...p, ...images.map((i) => i.url)].slice(0, max));
      setTab('library');
    }
  };

  const remove = async (rec) => {
    if (!window.confirm(`Delete "${rec.name}" from storage? Products using it will lose the image.`)) return;
    await deleteImage(rec.id);
    setPicked((p) => p.filter((u) => u !== rec.url));
    toast.success('Removed from storage');
  };

  return (
    <Modal open={open} onClose={onClose} title="Product images" size="lg">
      <div className="flex items-center gap-1 border-b border-line">
        {[['library', `Storage (${library.length})`], ['upload', 'Upload new']].map(([k, label]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={cx(
              'relative px-3.5 py-2.5 text-[13.5px] font-semibold transition',
              tab === k ? 'text-ink' : 'text-ink-50 hover:text-ink'
            )}
          >
            {label}
            {tab === k && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-forest" />}
          </button>
        ))}
        <span className="ml-auto text-[12px] text-ink-35">
          {picked.length}/{max} selected
        </span>
      </div>

      {tab === 'upload' ? (
        <div className="pt-4">
          <label
            onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => { e.preventDefault(); setDrag(false); upload(e.dataTransfer.files); }}
            className={cx(
              'flex cursor-pointer flex-col items-center rounded-lg border-2 border-dashed px-6 py-10 text-center transition',
              drag ? 'border-emerald bg-emerald-50/50' : 'border-line hover:border-ink-35'
            )}
          >
            <span className="grid h-12 w-12 place-items-center rounded-full bg-emerald-50 text-emerald-600">
              <Icon name={busy ? 'spinner' : 'upload'} size={22} className={busy ? 'animate-spin' : ''} />
            </span>
            <p className="mt-3 text-[14px] font-bold">{busy ? 'Uploading…' : 'Drop images here'}</p>
            <p className="mt-1 text-[12px] text-ink-50">PNG, JPG or WebP · up to 8 MB each · or click to browse</p>
            <input
              ref={fileRef}
              type="file"
              accept={ACCEPT}
              multiple
              className="hidden"
              onChange={(e) => { upload(e.target.files); e.target.value = ''; }}
            />
          </label>
          <p className="mt-3 text-[11.5px] leading-relaxed text-ink-35">
            Uploads are resized and saved to the shared image storage, so they can be reused on any
            other product from the Storage tab.
          </p>
        </div>
      ) : (
        <div className="pt-4">
          {library.length === 0 ? (
            <div className="rounded-lg border border-dashed border-line py-12 text-center">
              <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-sunk text-ink-35"><Icon name="image" size={22} /></span>
              <p className="mt-3 text-[13px] text-ink-50">Storage is empty.</p>
              <div className="mt-4"><Button size="sm" icon="upload" onClick={() => setTab('upload')}>Upload the first image</Button></div>
            </div>
          ) : (
            <div className="grid max-h-[46vh] grid-cols-3 gap-2.5 overflow-y-auto pr-1 sm:grid-cols-4">
              {library.map((rec) => {
                const on = isPicked(rec.url);
                const order = picked.indexOf(rec.url) + 1;
                return (
                  <div key={rec.id} className="group relative">
                    <button
                      onClick={() => toggle(rec.url)}
                      className={cx(
                        'block w-full overflow-hidden rounded-md border-2 transition',
                        on ? 'border-forest ring-2 ring-forest/20' : 'border-line hover:border-ink-35'
                      )}
                    >
                      <span className="photo-bed block aspect-square">
                        <img src={rec.url} alt={rec.name} className="h-full w-full object-cover" />
                      </span>
                    </button>
                    {on && (
                      <span className="tnum absolute left-1.5 top-1.5 grid h-5 w-5 place-items-center rounded-full bg-forest text-[10.5px] font-bold text-white">
                        {order}
                      </span>
                    )}
                    <button
                      onClick={() => remove(rec)}
                      aria-label={`Delete ${rec.name}`}
                      className="absolute right-1.5 top-1.5 grid h-6 w-6 place-items-center rounded-full bg-white/90 text-ink-35 opacity-0 shadow-card transition group-hover:opacity-100 hover:text-clay"
                    >
                      <Icon name="trash" size={12} />
                    </button>
                    <p className="mt-1 truncate text-[10.5px] text-ink-35">{prettyBytes(rec.bytes)}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
        <span className="text-[12px] text-ink-35">
          At least {1} image is required; the first one is the cover.
        </span>
        <div className="flex gap-3">
          <button onClick={onClose} className="h-10 rounded-md border border-line px-5 text-[13.5px] font-semibold text-ink-70 transition hover:border-ink-35">
            Cancel
          </button>
          <Button onClick={() => { onDone(picked); onClose(); }} icon="check" disabled={picked.length === 0}>
            Use {picked.length > 0 ? picked.length : ''} image{picked.length === 1 ? '' : 's'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
