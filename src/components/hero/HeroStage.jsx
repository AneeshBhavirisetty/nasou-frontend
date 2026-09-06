import { Suspense, lazy, useEffect, useState } from 'react';
import HeroFallbackArt from './HeroFallbackArt';
import { usePrefersReducedMotion } from '../../lib/motion';

const Hero3D = lazy(() => import('./Hero3D'));

function webglAvailable() {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (c.getContext('webgl') || c.getContext('experimental-webgl')));
  } catch {
    return false;
  }
}

/* Decides between the real 3D scene and the static SVG, and only mounts the
   heavy chunk once it's actually needed. */
export default function HeroStage({ className = '' }) {
  const reduced = usePrefersReducedMotion();
  const [can3d, setCan3d] = useState(false);

  useEffect(() => {
    // defer so it never competes with first paint
    const id = requestAnimationFrame(() => setCan3d(webglAvailable()));
    return () => cancelAnimationFrame(id);
  }, []);

  const use3d = can3d && !reduced;

  return (
    <div className={className}>
      {use3d ? (
        <Suspense fallback={<HeroFallbackArt className="h-full w-full animate-float" />}>
          <Hero3D />
        </Suspense>
      ) : (
        <HeroFallbackArt className="h-full w-full animate-float" />
      )}
    </div>
  );
}
