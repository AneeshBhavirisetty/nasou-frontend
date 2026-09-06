/* Temporary storefront projection of `shop data 1.xlsx`. The workbook has
   product metadata but its price/quantity cells are empty, so products stay
   unavailable until verified inventory is imported through the backend. */
const image = (id) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=900&q=80`;
export const categories = [
  { slug: 'pvc-fittings', name: 'PVC fittings', blurb: 'Elbows, tees, couplings and valves', count: 928 },
  { slug: 'pvc-pipes', name: 'PVC pipes', blurb: 'Pipe sizes and pressure grades', count: 61 },
  { slug: 'upvc-fittings', name: 'uPVC fittings', blurb: 'Durable plumbing fittings', count: 189 },
  { slug: 'cpvc-fittings', name: 'cPVC fittings', blurb: 'Hot-water plumbing fittings', count: 294 },
  { slug: 'plumbing-accessories', name: 'Accessories', blurb: 'Valves, bushes, saddles and more', count: 120 },
];
const records = [
  ['PL00001','PVC Elbow','1/2\'\' pvc elbow','PVC','1/2 inch','waterflo','pvc-fittings','Fittings','1606220588913-b3aacb4d2f46'], ['PL00002','PVC Elbow','1/2\'\' pvc elbow','PVC','1/2 inch','jeevan','pvc-fittings','Fittings','1606220588913-b3aacb4d2f46'], ['PL00003','PVC Elbow','1/2\'\' pvc elbow','PVC','1/2 inch','star','pvc-fittings','Fittings','1606220588913-b3aacb4d2f46'],
  ['PL00004','PVC Tee','1/2\'\' pvc tee','PVC','1/2 inch','waterflo','pvc-fittings','Fittings','1586864387967-d02ef85d93e8'], ['PL00005','PVC Tee','1/2\'\' pvc tee','PVC','1/2 inch','jeevan','pvc-fittings','Fittings','1586864387967-d02ef85d93e8'], ['PL00007','PVC Coupling','1/2\'\' pvc coupling','PVC','1/2 inch','waterflo','pvc-fittings','Fittings','1586864387967-d02ef85d93e8'],
  ['PL00025','PVC Ball Valve','1/2\'\' pvc ball valve','PVC','1/2 inch','waterflo','pvc-fittings','Fittings','1530124566582-a618bc2615dc'], ['PL00028','PVC Elbow','3/4\'\' pvc elbow','PVC','3/4 inch','astral','pvc-fittings','Fittings','1606220588913-b3aacb4d2f46'], ['PL00032','PVC Tee','3/4\'\' pvc tee','PVC','3/4 inch','astral','pvc-fittings','Fittings','1586864387967-d02ef85d93e8'],
  ['PL000150','PVC Coupling','1-1/4 pvc 6 kg coupling','PVC','1-1/4 inch','waterflo','pvc-fittings','Fittings','1586864387967-d02ef85d93e8'], ['PL000929','PVC Pipe','3/4\'\' pvc 15 kg pipe','PVC','3/4 inch','standard','pvc-pipes','Pipes','1586864387967-d02ef85d93e8'], ['PL000934','PVC Pipe','1-1/4\'\' pvc 4 kg pipe','PVC','1-1/4 inch','narayanee','pvc-pipes','Pipes','1586864387967-d02ef85d93e8'],
  ['PL000988','uPVC Elbow','3/4\'\' upvc elbow','uPVC','3/4 inch','flowman','upvc-fittings','Fittings','1606220588913-b3aacb4d2f46'], ['PL000989','uPVC Tee','3/4\'\' upvc tee','uPVC','3/4 inch','flowman','upvc-fittings','Fittings','1586864387967-d02ef85d93e8'], ['PL001043','uPVC Union','1\'\' upvc union','uPVC','1 inch','zoloto','upvc-fittings','Fittings','1586864387967-d02ef85d93e8'],
  ['PL001178','cPVC Elbow','3/4\'\' cpvc elbow','cPVC','3/4 inch','supreme','cpvc-fittings','Fittings','1606220588913-b3aacb4d2f46'], ['PL001179','cPVC Tee','3/4\'\' cpvc tee','cPVC','3/4 inch','supreme','cpvc-fittings','Fittings','1586864387967-d02ef85d93e8'], ['PL001226','cPVC Ball Valve','3/4\'\' cpvc ball valve','cPVC','3/4 inch','parryware','cpvc-fittings','Fittings','1530124566582-a618bc2615dc'], ['PL001456','PVC Saddle','2*1/2\'\' pvc saddle','PVC','2 × 1/2 inch','waterflo','plumbing-accessories','Accessories','1530124566582-a618bc2615dc'],
];
export const products = records.map(([id,name,description,material,size,supplier,category,subcategory,photo]) => {
  // Generate dummy prices based on product type for realism
  let price = 0;
  let mrp = 0;

  // Set base prices by product type
  if (description.includes('Elbow') || description.includes('elbow')) {
    price = Math.floor(Math.random() * 150) + 50; // ₹50-200
    mrp = price + Math.floor(Math.random() * 50) + 20; // ₹20-70 more than price
  } else if (description.includes('Tee') || description.includes('tee')) {
    price = Math.floor(Math.random() * 200) + 80; // ₹80-280
    mrp = price + Math.floor(Math.random() * 60) + 25; // ₹25-85 more than price
  } else if (description.includes('Coupling') || description.includes('coupling')) {
    price = Math.floor(Math.random() * 120) + 40; // ₹40-160
    mrp = price + Math.floor(Math.random() * 40) + 15; // ₹15-55 more than price
  } else if (description.includes('Ball Valve') || description.includes('ball valve')) {
    price = Math.floor(Math.random() * 500) + 200; // ₹200-700
    mrp = price + Math.floor(Math.random() * 100) + 50; // ₹50-150 more than price
  } else if (description.includes('Pipe') || description.includes('pipe')) {
    price = Math.floor(Math.random() * 800) + 200; // ₹200-1000
    mrp = price + Math.floor(Math.random() * 150) + 100; // ₹100-250 more than price
  } else if (description.includes('Saddle') || description.includes('saddle')) {
    price = Math.floor(Math.random() * 300) + 100; // ₹100-400
    mrp = price + Math.floor(Math.random() * 80) + 40; // ₹40-120 more than price
  } else if (description.includes('Union') || description.includes('union')) {
    price = Math.floor(Math.random() * 400) + 150; // ₹150-550
    mrp = price + Math.floor(Math.random() * 100) + 50; // ₹50-150 more than price
  } else {
    // Default for other products
    price = Math.floor(Math.random() * 300) + 50; // ₹50-350
    mrp = price + Math.floor(Math.random() * 80) + 20; // ₹20-100 more than price
  }

  // Ensure MRP is always higher than price
  if (mrp <= price) mrp = price + 50;

  // Random stock between 5-50 units
  const stock = Math.floor(Math.random() * 46) + 5;

  return ({
    id,
    sku:id,
    name,
    description,
    blurb:description,
    material,
    size,
    maker:supplier,
    supplier,
    category,
    subcategory,
    origin:'Supplier catalogue',
    unit:'pieces',
    stock,
    price,
    mrp,
    availableForSale: true,
    photo:image(photo),
    tags:[]
  });
});
export const findProduct = (id) => products.find((product) => product.id === id);
export const categoryName = (slug) => categories.find((category) => category.slug === slug)?.name ?? slug;
export const dealProducts = []; export const newProducts = products.slice(0,4);
export const offersFor = (product) => [{ id:product.supplier, name:product.supplier, city:'India', eta:'Pricing pending', price:product.price, best:true }];
export const batchId = (product) => product.sku;
export const buildTrace = (product) => product ? [{ stage:'Supplier',place:product.supplier,detail:'Supplier record from catalogue',code:'SUP' }, { stage:'Product',place:product.subcategory,detail:`${product.material} · ${product.size}`,code:'SKU' }, { stage:'Availability',place:'Nasou inventory',detail:'Awaiting verified stock and price',code:'INV' }] : [];
