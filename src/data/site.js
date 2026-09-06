export const brand = {
  name: 'Nasou Hive',
  short: 'Nasou',
  tagline: 'The plumbing counter that fits your job',
  promise:
    'Every PVC, uPVC and cPVC fitting, searchable by size, material, supplier and SKU — with a price you can trust and stock you can see.',
  email: 'hello@nasouhive.com',
  phone: '+91 97058 07551',
  toll: '1800 120 000 066',
  address: 'Plot 14, Industrial Estate, Sanathnagar, Hyderabad 500018',
  gst: '36ABCDE1234F1Z5',
  since: 2016,
};

export const currency = { symbol: '₹', code: 'INR', locale: 'en-IN' };

export const announcements = [
  'Free delivery on orders above ₹999 · GST invoice on every order',
  'Search by product code, size or supplier — 1,400+ SKUs live',
  'Ships pan-India · dispatch same day on in-stock items before 2pm',
];

export const primaryNav = [
  { label: 'Shop all', to: '/shop' },
  { label: 'PVC fittings', to: '/shop?category=pvc-fittings' },
  { label: 'cPVC fittings', to: '/shop?category=cpvc-fittings' },
  { label: 'uPVC fittings', to: '/shop?category=upvc-fittings' },
  { label: 'Pipes', to: '/shop?category=pvc-pipes' },
  { label: 'Valves & accessories', to: '/shop?category=plumbing-accessories' },
];

export const valueProps = [
  { icon: 'tag', title: 'Verified pricing', body: 'Every price is set in the catalogue, never guessed at the counter. What you see is what you pay.' },
  { icon: 'layers', title: 'Real supplier records', body: 'Astral, Ashirvad, Finolex, Supreme and 20 more — each SKU carries its manufacturer of record.' },
  { icon: 'truck', title: 'Same-day dispatch', body: 'In-stock items ordered before 2pm leave the Hyderabad warehouse the same working day.' },
  { icon: 'shieldCheck', title: 'GST invoice, always', body: 'Input-credit-ready tax invoice on 100% of orders, downloadable the moment you check out.' },
];

export const testimonials = [
  { quote: 'I stopped calling three shops for one elbow. The size and supplier filters find the exact fitting in seconds.', name: 'Ravi Kumar', role: 'Plumbing contractor, Kukatpally' },
  { quote: 'Prices match the invoice every time. For a site running 40 flats that predictability is worth more than a discount.', name: 'S. Anjaneyulu', role: 'Site supervisor, My Home Group' },
  { quote: 'Ordered cPVC fittings at 11am, they were on site by the evening. First time an online supplier actually did that.', name: 'Farhan Sheikh', role: 'MEP subcontractor, Gachibowli' },
];

export const faqs = [
  { q: 'Are the prices inclusive of GST?', a: 'Prices shown are exclusive of GST; 18% GST is added at checkout and itemised on your invoice.' },
  { q: 'How fast is delivery?', a: 'In-stock items ordered before 2pm are dispatched the same working day. Hyderabad deliveries arrive next day; rest of India in 2–5 days by surface courier.' },
  { q: 'Can I order a fitting that shows "out of stock"?', a: 'You can add it to your wishlist and we will email you when it is back. Most fast-moving SKUs restock within a week.' },
  { q: 'Do you supply to trade / bulk buyers?', a: 'Yes. Create an account and contact us for slab pricing on orders above ₹25,000.' },
  { q: 'What is your returns policy?', a: 'Unused fittings in original packaging can be returned within 7 days of delivery for a full refund of the item value.' },
];

export const footerColumns = [
  {
    title: 'Shop',
    links: [
      { label: 'All products', to: '/shop' },
      { label: 'PVC fittings', to: '/shop?category=pvc-fittings' },
      { label: 'cPVC fittings', to: '/shop?category=cpvc-fittings' },
      { label: 'uPVC fittings', to: '/shop?category=upvc-fittings' },
      { label: 'Pipes', to: '/shop?category=pvc-pipes' },
    ],
  },
  {
    title: 'Catalogue',
    links: [
      { label: 'Search by SKU', to: '/shop' },
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
      { label: 'Track an order', to: '/orders' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About Nasou', to: '/about' },
      { label: 'Contact', to: '/contact' },
      { label: 'Trade enquiries', to: '/contact' },
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

export const paymentMethods = ['UPI', 'Cards', 'Net banking', 'GST invoice'];
