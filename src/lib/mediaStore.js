/* ============================================================================
 * mediaStore — stand-in for the product-image blob storage.
 *
 * Files are downscaled in the browser, then kept in IndexedDB (localStorage is
 * far too small for images). Every record exposes a `url` the app can drop
 * straight into an <img src>, so when the real blob storage lands you only swap
 * `putImage` for an upload call and keep returning { id, url, name }.
 *
 * LIVE: photos are uploaded to nasou-api (POST /admin/media or /seller/media),
 * which keeps them in Azure Blob Storage (or a local volume) and returns a
 * URL; nothing is kept in the browser.
 * ==========================================================================*/

import { LIVE } from './config';
import { api } from './api';
import { getStoredSession } from './auth';

const isTeam = () => getStoredSession()?.role === 'ADMIN';
const fromServer = (m) => ({ id: m.id, name: m.name, url: m.url, width: m.width, height: m.height, bytes: m.bytes, at: Date.parse(m.createdAt) || Date.now() });
let sessionUploads = []; // a retailer's uploads this session (sellers have no library listing)

const DB = 'nasou_media';
const STORE = 'images';
const EVENT = 'nasou:media';
const MAX_EDGE = 900;      // px — plenty for a product card / detail gallery
const QUALITY = 0.82;

export const MAX_IMAGES_PER_PRODUCT = 3;
export const MIN_IMAGES_PER_PRODUCT = 1;
export const ACCEPT = 'image/png,image/jpeg,image/webp';

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'id' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx(mode, fn) {
  return openDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const t = db.transaction(STORE, mode);
        const req = fn(t.objectStore(STORE));
        t.oncomplete = () => resolve(req?.result);
        t.onerror = () => reject(t.error);
      })
  );
}

const ping = () => window.dispatchEvent(new Event(EVENT));

export function onMediaChange(handler) {
  window.addEventListener(EVENT, handler);
  return () => window.removeEventListener(EVENT, handler);
}

/* Downscale to a sane edge and re-encode, so the demo store stays small. */
function shrink(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read that file.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('That file is not a readable image.'));
      img.onload = () => {
        const scale = Math.min(1, MAX_EDGE / Math.max(img.width, img.height));
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const c = document.createElement('canvas');
        c.width = w; c.height = h;
        const ctx = c.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);
        resolve({ url: c.toDataURL('image/jpeg', QUALITY), w, h });
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

/** Upload one file into the store. Returns the media record. */
export async function putImage(file) {
  if (!file.type.startsWith('image/')) throw new Error(`${file.name} is not an image.`);
  if (file.size > 8 * 1024 * 1024) throw new Error(`${file.name} is larger than 8 MB.`);
  const { url, w, h } = await shrink(file);
  if (LIVE) {
    const blob = await (await fetch(url)).blob();
    const form = new FormData();
    form.append('file', new File([blob], file.name.replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg' }));
    const rec = fromServer(await api(isTeam() ? '/admin/media' : '/seller/media', { method: 'POST', body: form }));
    sessionUploads = [rec, ...sessionUploads];
    ping();
    return rec;
  }
  const rec = {
    id: `img_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
    name: file.name,
    url,
    width: w,
    height: h,
    bytes: Math.round((url.length * 3) / 4),
    at: Date.now(),
  };
  await tx('readwrite', (s) => s.put(rec));
  ping();
  return rec;
}

export async function putImages(files) {
  const out = [];
  const errors = [];
  for (const f of Array.from(files)) {
    try { out.push(await putImage(f)); } catch (e) { errors.push(e.message); }
  }
  return { images: out, errors };
}

export async function listImages() {
  if (LIVE) {
    if (!isTeam()) return sessionUploads;
    const page = await api('/admin/media?size=200');
    return (page?.items || []).map(fromServer);
  }
  const all = await tx('readonly', (s) => s.getAll());
  return (all || []).sort((a, b) => b.at - a.at);
}

export async function deleteImage(id) {
  if (LIVE) {
    if (isTeam()) await api(`/admin/media/${id}`, { method: 'DELETE' });
    sessionUploads = sessionUploads.filter((m) => m.id !== id);
    ping();
    return;
  }
  await tx('readwrite', (s) => s.delete(id));
  ping();
}

export const prettyBytes = (n) =>
  n > 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`;
