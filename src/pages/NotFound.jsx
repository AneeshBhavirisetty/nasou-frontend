import { Button, Container } from '../components/ui';
import ProductArt from '../components/ProductArt';

export default function NotFound() {
  return (
    <Container className="flex min-h-[60dvh] flex-col items-center justify-center py-16 text-center">
      <div className="photo-bed grid h-32 w-32 place-items-center rounded-[28px] shadow-card">
        <ProductArt kind="cap" material="PVC" className="h-full w-full p-5" />
      </div>
      <p className="eyebrow mt-6">Error 404</p>
      <h1 className="mt-2 text-[clamp(1.8rem,5vw,2.4rem)] font-semibold text-ink">This pipe leads nowhere</h1>
      <p className="mt-2 max-w-sm text-[13.5px] text-ink-50">
        The page you asked for isn&rsquo;t here. The catalogue, however, very much is.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Button to="/shop" iconRight="arrowRight">Browse products</Button>
        <Button to="/" variant="outline">Home</Button>
      </div>
    </Container>
  );
}
