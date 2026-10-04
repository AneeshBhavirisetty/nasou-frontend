import { ProductsManager } from '../admin/Products';

/* The retailer's own catalogue: same screen as the Super Admin's, scoped to
   their retailerId, with sub-categories limited to the master catalog. */
export default function SellerProducts() {
  return <ProductsManager seller />;
}
