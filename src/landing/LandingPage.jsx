import NasouHiveLanding from './App';
import './landing.css';

/* The NasouHive landing page at "/". Everything else in this folder is the
   nasouhive repo's landing, copied unchanged — update it by copying the
   newer files over and re-running `npm run build:landing-css`. Its styles
   only apply inside this wrapper, so the storefront keeps its own.
   Its "Get Started" buttons link to /app/auth, which App.jsx sends to /join. */
export default function LandingPage() {
  return (
    <div className="nasou-landing">
      <NasouHiveLanding />
    </div>
  );
}
