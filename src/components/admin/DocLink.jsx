import { useEffect, useState } from 'react';
import { fileUrl } from '../../lib/api';

/* A retailer document stored by the API (Azure Blob behind
   GET /retailer-documents/{id}). The request needs the signed-in person's
   token, so the file is fetched and shown from a short-lived object URL;
   images get a preview. In the browser demo documents are data URLs. */
export default function DocLink({ doc, label, className = '' }) {
  const [preview, setPreview] = useState(null);
  const image = (doc?.mime || '').startsWith('image/');

  useEffect(() => {
    if (!doc?.url || !image) return undefined;
    let url = null;
    let live = true;
    fileUrl(doc.url).then((u) => { url = u; if (live) setPreview(u); }).catch(() => {});
    return () => { live = false; if (url) URL.revokeObjectURL(url); };
  }, [doc?.url, image]);

  if (!doc) return null;
  if (!doc.url) {
    if (!doc.dataUrl) return null;
    return image
      ? <img src={doc.dataUrl} alt={label} className={`mt-3 max-h-40 w-full rounded-[10px] bg-white object-contain ${className}`} />
      : <a href={doc.dataUrl} target="_blank" rel="noreferrer" className="mt-2 inline-block text-[12px] font-bold text-forest hover:underline">Open PDF ↗</a>;
  }
  const open = async () => {
    const w = window.open('', '_blank');
    try {
      const u = await fileUrl(doc.url);
      if (w) w.location.href = u; else window.location.href = u;
    } catch (e) {
      if (w) w.close();
      window.alert(e.message);
    }
  };
  return (
    <div className={className}>
      {preview && <img src={preview} alt={label} className="mt-3 max-h-40 w-full rounded-[10px] bg-white object-contain" />}
      <button type="button" onClick={open} className="mt-2 inline-block text-[12px] font-bold text-forest hover:underline">Open {image ? 'image' : 'document'} ↗</button>
    </div>
  );
}
