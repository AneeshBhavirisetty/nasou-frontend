/* Paying an online order. The API opens the order and sends the options:
   - provider "razorpay" (live keys): Razorpay's own window, which resolves with
     the ids + signature the API verifies with Razorpay before the order counts;
   - provider "test" (a server without Razorpay keys — dev, local): a clearly
     marked "Test payment" window. Nothing is charged; Pay resolves with
     { test: true } and the API records a test payment. Without it the order is
     not paid — exactly as with Razorpay (client, 6 Nov 2026: "no scanner shown
     but the order got placed").
   Closing either window rejects with `dismissed: true`. */

const SRC = 'https://checkout.razorpay.com/v1/checkout.js';
let loading = null;

function load() {
  if (window.Razorpay) return Promise.resolve();
  loading ||= new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = SRC;
    s.async = true;
    s.onload = resolve;
    s.onerror = () => {
      loading = null;
      s.remove();
      reject(new Error('Razorpay could not load — check your connection and try again.'));
    };
    document.head.appendChild(s);
  });
  return loading;
}

export async function openCheckout(o) {
  if (o?.provider === 'test') return openTestCheckout(o);
  await load();
  return new Promise((resolve, reject) => {
    const rzp = new window.Razorpay({
      key: o.key,
      order_id: o.orderId,
      amount: o.amount,
      currency: o.currency,
      name: o.name,
      description: o.description,
      prefill: { ...o.prefill, ...(o.method ? { method: o.method } : {}) },
      timeout: o.timeout,
      theme: { color: '#1f5c4a' },
      handler: (r) => resolve({ razorpayOrderId: r.razorpay_order_id, razorpayPaymentId: r.razorpay_payment_id, razorpaySignature: r.razorpay_signature }),
      modal: {
        confirm_close: true,
        ondismiss: () => reject(Object.assign(new Error('Payment not finished.'), { dismissed: true })),
      },
    });
    /* a failed attempt keeps Razorpay's window open so the customer can try another way */
    rzp.open();
  });
}

const METHOD = { upi: 'UPI', card: 'Card', netbanking: 'Net banking' };
const rupees = (paise) => `₹${(Number(paise || 0) / 100).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

/* A small QR-like pattern (not a real code) so the window reads as "scan to pay" in testing. */
function fakeQr(seed) {
  const n = 21;
  let h = 0;
  for (const c of String(seed)) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const cells = [];
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const finder = (x < 7 && y < 7) || (x > 13 && y < 7) || (x < 7 && y > 13);
      let on;
      if (finder) {
        const fx = x > 13 ? x - 14 : x;
        const fy = y > 13 ? y - 14 : y;
        on = fx === 0 || fx === 6 || fy === 0 || fy === 6 || (fx > 1 && fx < 5 && fy > 1 && fy < 5);
      } else {
        h = (h * 1103515245 + 12345) >>> 0;
        on = (h >>> 16) % 2 === 0;
      }
      if (on) cells.push(`<rect x="${x}" y="${y}" width="1" height="1"/>`);
    }
  }
  return `<svg viewBox="-1 -1 23 23" width="168" height="168" fill="#1f3b34" aria-hidden="true">${cells.join('')}</svg>`;
}

function openTestCheckout(o) {
  return new Promise((resolve, reject) => {
    const overlay = document.createElement('div');
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'Test payment');
    overlay.style.cssText = 'position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(17,32,28,.55);font-family:inherit';
    const card = document.createElement('div');
    card.style.cssText = 'width:100%;max-width:380px;max-height:100%;overflow:auto;border-radius:20px;background:#fff;box-shadow:0 24px 60px rgba(0,0,0,.25);padding:20px';
    card.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;gap:8px">
        <b style="font-size:17px;color:#1f5c4a">Nivorva</b>
        <span style="border-radius:999px;background:#fff4e0;color:#9a5b00;font-size:11px;font-weight:800;letter-spacing:.08em;padding:4px 10px">TEST MODE</span>
      </div>
      <p data-k="desc" style="margin:10px 0 0;font-size:13px;color:#6b7c76"></p>
      <p data-k="amount" style="margin:2px 0 0;font-size:28px;font-weight:700;color:#1f3b34"></p>
      <div style="margin:14px 0;display:flex;flex-direction:column;align-items:center;gap:8px;border:1px solid #e5dfd3;border-radius:14px;padding:14px;background:#f6f3ed">
        <div data-k="qr"></div>
        <span data-k="method" style="font-size:12.5px;color:#6b7c76"></span>
      </div>
      <p style="margin:0 0 14px;font-size:12.5px;line-height:1.5;color:#6b7c76">Razorpay is not connected on this server, so this is a test payment — no money moves. On the live site this is Razorpay's secure window.</p>
      <button data-k="pay" type="button" style="width:100%;height:46px;border:0;border-radius:12px;background:#1f5c4a;color:#fff;font-size:15px;font-weight:700;cursor:pointer"></button>
      <button data-k="cancel" type="button" style="width:100%;height:42px;margin-top:8px;border:1px solid #e5dfd3;border-radius:12px;background:#fff;color:#1f5c4a;font-size:14px;font-weight:700;cursor:pointer">Cancel payment</button>`;
    const el = (k) => card.querySelector(`[data-k="${k}"]`);
    el('desc').textContent = o.description || 'Your order';
    el('amount').textContent = rupees(o.amount);
    el('qr').innerHTML = fakeQr(o.orderId);
    el('method').textContent = `${METHOD[o.method] || 'UPI'} · test code — tap Pay below instead of scanning`;
    el('pay').textContent = `Pay ${rupees(o.amount)} (test)`;

    const close = () => {
      document.removeEventListener('keydown', onKey);
      overlay.remove();
    };
    const dismiss = () => {
      close();
      reject(Object.assign(new Error('Payment not finished.'), { dismissed: true }));
    };
    const onKey = (e) => { if (e.key === 'Escape') dismiss(); };
    el('pay').addEventListener('click', () => { close(); resolve({ test: true }); });
    el('cancel').addEventListener('click', dismiss);
    document.addEventListener('keydown', onKey);
    overlay.appendChild(card);
    document.body.appendChild(overlay);
    el('pay').focus();
  });
}
