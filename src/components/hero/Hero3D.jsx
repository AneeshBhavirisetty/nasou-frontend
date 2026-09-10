/* Lazy-loaded 3D hero centrepiece. Never import this directly — go through
   <HeroStage>, which code-splits it and falls back to a static SVG when
   WebGL is missing or the viewer prefers reduced motion. */

import { Suspense, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { ContactShadows, Float } from '@react-three/drei';
import * as THREE from 'three';

/* A stylised PVC elbow: torus bend + two socketed cylinders. */
function Elbow() {
  const group = useRef(null);
  const { pointer } = useThree();

  useFrame((_, dt) => {
    if (!group.current) return;
    group.current.rotation.y += dt * 0.3;
    // gentle pointer parallax on top of the spin
    group.current.rotation.x = THREE.MathUtils.lerp(group.current.rotation.x, -pointer.y * 0.25, 0.05);
    group.current.position.x = THREE.MathUtils.lerp(group.current.position.x, pointer.x * 0.15, 0.05);
  });

  const body = useMemo(
    () => new THREE.MeshPhysicalMaterial({ color: '#f7f1e3', roughness: 0.35, clearcoat: 0.6, clearcoatRoughness: 0.25, metalness: 0 }),
    []
  );
  const rim = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#dccfb4', roughness: 0.5 }),
    []
  );

  return (
    <group ref={group} scale={1.15}>
      {/* bend */}
      <mesh material={body} rotation={[0, 0, 0]}>
        <torusGeometry args={[1, 0.42, 40, 64, Math.PI / 2]} />
      </mesh>
      {/* leg 1 (down) */}
      <group position={[1, 0, 0]}>
        <mesh material={body} position={[0, -0.75, 0]} rotation={[0, 0, 0]}>
          <cylinderGeometry args={[0.42, 0.42, 1.5, 40]} />
        </mesh>
        <mesh material={rim} position={[0, -1.5, 0]}>
          <cylinderGeometry args={[0.5, 0.5, 0.3, 40]} />
        </mesh>
      </group>
      {/* leg 2 (right) */}
      <group position={[0, 1, 0]}>
        <mesh material={body} position={[0.75, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.42, 0.42, 1.5, 40]} />
        </mesh>
        <mesh material={rim} position={[1.5, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.5, 0.5, 0.3, 40]} />
        </mesh>
      </group>
      {/* accent collar */}
      <mesh material={new THREE.MeshStandardMaterial({ color: '#287052', roughness: 0.4 })} position={[1, -0.2, 0]}>
        <torusGeometry args={[0.46, 0.06, 16, 48]} />
      </mesh>
    </group>
  );
}

export default function Hero3D() {
  return (
    <Canvas
      camera={{ position: [3.2, 1.6, 4.2], fov: 42 }}
      dpr={[1, 1.8]}
      gl={{ antialias: true, alpha: true }}
      style={{ width: '100%', height: '100%' }}
    >
      <ambientLight intensity={0.65} />
      <hemisphereLight args={['#ffffff', '#e0d5bd', 0.7]} />
      <directionalLight position={[5, 6, 4]} intensity={1.25} castShadow />
      <directionalLight position={[-5, 2, -3]} intensity={0.5} color="#e6ecea" />
      <pointLight position={[0, -3, 3]} intensity={0.35} color="#287052" />
      <Suspense fallback={null}>
        <Float speed={1.4} rotationIntensity={0.25} floatIntensity={0.6}>
          <Elbow />
        </Float>
      </Suspense>
      <ContactShadows position={[0, -1.9, 0]} opacity={0.35} scale={9} blur={2.6} far={4} />
    </Canvas>
  );
}
