import { Link } from 'react-router-dom';
import { Button, Container } from '../components/ui';
import Icon from '../components/Icon';

export default function Unauthorized() {
  return (
    <Container className="flex min-h-[60vh] items-center justify-center py-16">
      <div className="w-full max-w-[440px] rounded-xl border border-line bg-white p-8 text-center shadow-card">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-amber-50 text-amber">
          <Icon name="lock" size={26} />
        </span>
        <h1 className="mt-5 display-serif text-[24px]">Not your door</h1>
        <p className="mt-2 text-[13.5px] leading-relaxed text-ink-50">
          This area needs an administrator account. If you think that&rsquo;s wrong, sign in with the right account or head back to the shop.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button to="/shop" iconRight="arrowRight">Back to shop</Button>
          <Button to="/login" variant="outline">Switch account</Button>
        </div>
      </div>
    </Container>
  );
}
