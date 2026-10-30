export const brand = {
  name: 'Nivorva',
  short: 'Nivorva',
  tagline: 'Every trusted counter. One cart.',
  promise:
    'Plumbing, electrical, hardware and more from verified local retailers — search by size, brand or SKU, order once, and track every seller’s part to your site.',
  email: 'hello@nivora.in',
  phone: '+91 97058 07551',
  toll: '1800 120 000 066',
  /* WhatsApp Business number (digits only, with country code) for wa.me links */
  whatsapp: '919705807551',
  address: 'Tirupati, Andhra Pradesh 517501',
  gst: '37ABCDE1234F1Z5',
  since: 2016,
};

export const currency = { symbol: '₹', code: 'INR', locale: 'en-IN' };

export const announcements = [
  'Nivorva is now a marketplace — shop verified retailers in one cart',
  'Free delivery on orders above ₹999 · GST invoice on every order',
  'Search by item code, size or supplier — {skus} products live',   // {skus}: the live catalogue size
  'Delivering across Tirupati · dispatch same day on in-stock items before 2pm',
];

export const valueProps = [
  { icon: 'tag', title: 'Verified pricing', body: 'Every price is set in the catalogue, never guessed at the counter. What you see is what you pay.' },
  { icon: 'shieldCheck', title: 'Verified retailers', body: 'Every seller’s business, GST, PAN and bank are checked before they can list a single product.' },
  { icon: 'truck', title: 'Every part tracked', body: 'One payment, many sellers — each seller ships their part and you watch every one to your site.' },
  { icon: 'fileText', title: 'GST invoice, always', body: 'Input-credit-ready tax invoice on 100% of orders, downloadable the moment you check out.' },
];

export const testimonials = [
  { quote: 'I stopped calling three shops for one elbow. The size and supplier filters find the exact fitting in seconds.', name: 'Ravi Kumar', role: 'Plumbing contractor, Kukatpally' },
  { quote: 'Prices match the invoice every time. For a site running 40 flats that predictability is worth more than a discount.', name: 'S. Anjaneyulu', role: 'Site supervisor, My Home Group' },
  { quote: 'Ordered CPVC fittings at 11am, they were on site by the evening. First time an online supplier actually did that.', name: 'Farhan Sheikh', role: 'MEP subcontractor, Gachibowli' },
];

export const faqs = [
  { q: 'Are the prices inclusive of GST?', a: 'Prices shown are exclusive of GST; 18% GST is added at checkout and itemised on your invoice.' },
  { q: 'How fast is delivery?', a: 'In-stock items ordered before 2pm are dispatched the same working day and usually arrive the next working day. We deliver within Tirupati only.' },
  { q: 'Can I order a fitting that shows "out of stock"?', a: 'You can add it to your wishlist and we will email you when it is back. Most fast-moving SKUs restock within a week.' },
  { q: 'Do you supply to trade / bulk buyers?', a: 'Yes. Create an account and contact us for slab pricing on orders above ₹25,000.' },
  { q: 'What is your returns policy?', a: 'Unused fittings in original packaging can be returned within 7 days of delivery for a full refund of the item value.' },
];

export const footerColumns = [
  {
    title: 'Shop',
    links: [
      { label: 'All products', to: '/shop' },
      { label: 'Plumbing', to: '/shop?dept=plumbing' },
      { label: 'Electrical', to: '/shop?dept=electrical' },
      { label: 'Interior Designing', to: '/shop?dept=interior-designing' },
      { label: 'Hardware', to: '/shop?dept=hardware' },
      { label: 'Bath & Kitchen Essentials', to: '/shop?dept=bath-kitchen' },
      { label: 'Sanitary', to: '/shop?dept=sanitary' },
    ],
  },
  {
    title: 'Catalogue',
    links: [
      { label: 'Search by item code', to: '/shop' },
      { label: 'Deals', to: '/deals' },
      { label: 'New arrivals', to: '/shop?sort=new' },
      { label: 'Brands we stock', to: '/shop' },
    ],
  },
  {
    title: 'Your account',
    links: [
      { label: 'Sign in', to: '/login' },
      { label: 'Orders', to: '/orders' },
      { label: 'Wishlist', to: '/wishlist' },
      { label: 'Support tickets', to: '/support' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About Nivorva', to: '/about' },
      { label: 'Sell on Nivorva', to: '/sell' },
      { label: 'Trade enquiries', to: '/enquiry' },
      { label: 'Returns policy', to: '/returns' },
    ],
  },
];

export const socials = [
  { label: 'Facebook', href: 'https://facebook.com' },
  { label: 'Instagram', href: 'https://instagram.com' },
  { label: 'LinkedIn', href: 'https://linkedin.com' },
  { label: 'YouTube', href: 'https://youtube.com' },
];

export const paymentMethods = ['UPI', 'Cards', 'Net banking', 'Cash on delivery', 'GST invoice'];

/* wa.me deep link with an optional prefilled message */
/* `to`: another number (91XXXXXXXXXX), e.g. the team writing to a shopper; default the store's own */
export const whatsappLink = (text = 'Hi Nivorva, I have a question about an order.', to = brand.whatsapp) =>
  `https://wa.me/${to}?text=${encodeURIComponent(text)}`;
