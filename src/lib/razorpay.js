/* Razorpay Checkout (live API only). The API opens the Razorpay order and
   sends the options; this opens Razorpay's own window on them and resolves
   with the ids + signature, which the API verifies with Razorpay before the
   order counts as paid. Closing the window rejects with `dismissed: true`. */

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
