/* Document uploads (retailer signup, requirement 5). In the demo the file
   stays in the browser: small images and PDFs are kept as data URLs so the
   reviewer can open them; larger ones keep their name and size only. The API
   stores the bytes in object storage instead. */

export const MAX_DOC_BYTES = 5 * 1024 * 1024;
const KEEP_INLINE = 350 * 1024;
const TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];

export function readDocument(file, type) {
  return new Promise((resolve, reject) => {
    if (!file) return reject(new Error('Choose a file.'));
    if (!TYPES.includes(file.type)) return reject(new Error('Upload a PDF, JPG, PNG or WebP file.'));
    if (file.size > MAX_DOC_BYTES) return reject(new Error('Files must be 5 MB or smaller.'));
    const meta = { type, name: file.name, size: file.size, mime: file.type, uploadedAt: Date.now(), status: 'submitted' };
    if (file.size > KEEP_INLINE) return resolve(meta);
    const r = new FileReader();
    r.onload = () => resolve({ ...meta, dataUrl: r.result });
    r.onerror = () => resolve(meta);
    r.readAsDataURL(file);
  });
}
