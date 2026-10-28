import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
  AdaptiveDpr,
  AdaptiveEvents,
  Float,
  PerspectiveCamera,
  Preload,
  Text,
} from "@react-three/drei";
import { motion } from "framer-motion";
import { gsap } from "gsap";
import { CatmullRomCurve3, Color, MathUtils, TubeGeometry, Vector3 } from "three";
import { Link } from "react-router-dom";
import SceneCanvas from "./SceneCanvas";
import DeliveryBus from "./DeliveryBus";

const stageStops = [0.09, 0.5, 0.9];
const nodeColor = ["#E6ECEA", "#E6ECEA", "#E5D8C7"];
const packageOffsets = [0, 0.23, 0.47, 0.73];
const returnPackageOffsets = [0.08, 0.39, 0.72];
const dataPacketConfig = [
  { curveIndex: 0, offset: 0.06, speed: 0.16, color: "#E6ECEA" },
  { curveIndex: 0, offset: 0.38, speed: 0.18, color: "#E6ECEA" },
  { curveIndex: 0, offset: 0.7, speed: 0.15, color: "#E5D8C7" },
  { curveIndex: 1, offset: 0.14, speed: 0.2, color: "#E6ECEA" },
  { curveIndex: 1, offset: 0.52, speed: 0.17, color: "#E6ECEA" },
];
const stageBurstAngles = [0, Math.PI / 3, (2 * Math.PI) / 3, Math.PI, (4 * Math.PI) / 3, (5 * Math.PI) / 3];
const packageStateStops = [0.04, 0.24, 0.62, 0.92];

function FactoryModel(props) {
  return (
    <group {...props}>
      <mesh position={[0, 0.45, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.25, 0.8, 1.2]} />
        <meshStandardMaterial color="#E6ECEA" metalness={0.42} roughness={0.25} />
      </mesh>
      <mesh position={[0, 1.08, 0]} castShadow>
        <boxGeometry args={[0.9, 0.55, 0.92]} />
        <meshStandardMaterial color="#255849" metalness={0.65} roughness={0.2} />
      </mesh>
      {[-0.34, 0, 0.34].map((x) => (
        <mesh key={x} position={[x, 0.48, 0.62]}>
          <boxGeometry args={[0.18, 0.18, 0.02]} />
          <meshBasicMaterial color="#255849" />
        </mesh>
      ))}
      {[-0.35, 0.35].map((x) => (
        <mesh key={x} position={[x, 1.75, -0.2]} castShadow>
          <cylinderGeometry args={[0.13, 0.18, 1.2, 18]} />
          <meshStandardMaterial color="#E6ECEA" metalness={0.5} roughness={0.2} />
        </mesh>
      ))}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0]}>
        <cylinderGeometry args={[1.15, 1.15, 0.08, 48]} />
        <meshStandardMaterial color="#1F5C4A" roughness={0.7} metalness={0.25} />
      </mesh>
    </group>
  );
}

function StoreModel(props) {
  return (
    <group {...props}>
      <mesh position={[0, 0.55, 0]} castShadow>
        <boxGeometry args={[1.2, 0.85, 1.05]} />
        <meshStandardMaterial color="#E5D8C7" metalness={0.18} roughness={0.34} />
      </mesh>
      <mesh position={[0, 1.15, 0]} castShadow>
        <boxGeometry args={[1.35, 0.25, 1.15]} />
        <meshStandardMaterial color="#255849" metalness={0.58} roughness={0.18} />
      </mesh>
      <mesh position={[0, 0.62, 0.56]}>
        <boxGeometry args={[0.4, 0.48, 0.05]} />
        <meshBasicMaterial color="#255849" />
      </mesh>
      {[-0.38, 0, 0.38].map((x) => (
        <mesh key={x} position={[x, 1.1, 0.6]}>
          <boxGeometry args={[0.18, 0.1, 0.03]} />
          <meshBasicMaterial color="#E6ECEA" />
        </mesh>
      ))}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0]}>
        <cylinderGeometry args={[1.08, 1.08, 0.08, 48]} />
        <meshStandardMaterial color="#1F5C4A" roughness={0.7} metalness={0.25} />
      </mesh>
    </group>
  );
}

function CustomerModel(props) {
  return (
    <group {...props}>
      <mesh position={[0, 0.6, 0]} castShadow>
        <boxGeometry args={[1, 0.8, 1]} />
        <meshStandardMaterial color="#E6ECEA" metalness={0.25} roughness={0.3} />
      </mesh>
      <mesh position={[0, 1.14, 0]} rotation={[0, 0, Math.PI / 4]} castShadow>
        <boxGeometry args={[0.95, 0.95, 0.95]} />
        <meshStandardMaterial color="#255849" metalness={0.6} roughness={0.16} />
      </mesh>
      <mesh position={[0, 0.6, 0.52]}>
        <boxGeometry args={[0.28, 0.42, 0.06]} />
        <meshBasicMaterial color="#E6ECEA" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0]}>
        <cylinderGeometry args={[0.98, 0.98, 0.08, 48]} />
        <meshStandardMaterial color="#1F5C4A" roughness={0.7} metalness={0.25} />
      </mesh>
    </group>
  );
}

function IndustryMachinery({ baseRef, elbowRef, bayRef, clawLeftRef, clawRightRef }) {
  return (
    <group position={[1.18, 0.06, 0.34]}>
      <mesh position={[-0.04, 0.08, 0]} receiveShadow castShadow>
        <boxGeometry args={[0.94, 0.14, 0.72]} />
        <meshStandardMaterial color="#E6ECEA" metalness={0.28} roughness={0.28} />
      </mesh>
      <mesh ref={bayRef} position={[-0.12, 0.18, 0.02]}>
        <boxGeometry args={[0.72, 0.08, 0.5]} />
        <meshStandardMaterial
          color="#1F5C4A"
          metalness={0.48}
          roughness={0.18}
          emissive="#255849"
          emissiveIntensity={0.22}
        />
      </mesh>
      <mesh position={[0.28, 0.17, 0.22]} castShadow>
        <boxGeometry args={[0.16, 0.12, 0.18]} />
        <meshStandardMaterial color="#EFE7DA" metalness={0.64} roughness={0.14} />
      </mesh>

      <group position={[0.3, 0.14, -0.18]}>
        <mesh position={[0, 0.12, 0]} castShadow>
          <cylinderGeometry args={[0.18, 0.22, 0.24, 18]} />
          <meshStandardMaterial color="#E6ECEA" metalness={0.55} roughness={0.18} />
        </mesh>

        <group ref={baseRef} position={[0, 0.2, 0]} rotation={[0, 0, -0.42]}>
          <mesh position={[0, 0.32, 0]} castShadow>
            <boxGeometry args={[0.18, 0.72, 0.18]} />
            <meshStandardMaterial color="#255849" metalness={0.68} roughness={0.16} />
          </mesh>

          <group ref={elbowRef} position={[0, 0.62, 0]} rotation={[0, 0, 0.92]}>
            <mesh position={[0, 0.24, 0]} castShadow>
              <boxGeometry args={[0.14, 0.56, 0.14]} />
              <meshStandardMaterial color="#E6ECEA" metalness={0.62} roughness={0.16} />
            </mesh>

            <group position={[0, 0.5, 0]}>
              <mesh ref={clawLeftRef} position={[-0.09, 0.02, 0]} castShadow>
                <boxGeometry args={[0.05, 0.2, 0.08]} />
                <meshStandardMaterial color="#255849" metalness={0.52} roughness={0.2} />
              </mesh>
              <mesh ref={clawRightRef} position={[0.09, 0.02, 0]} castShadow>
                <boxGeometry args={[0.05, 0.2, 0.08]} />
                <meshStandardMaterial color="#255849" metalness={0.52} roughness={0.2} />
              </mesh>
            </group>
          </group>
        </group>
      </group>
    </group>
  );
}

function RetailMachinery({ beamRef, scannerRingRef, flapRef }) {
  return (
    <group position={[1.04, 0.08, 0.58]}>
      <mesh position={[0, 0.08, 0]} receiveShadow castShadow>
        <boxGeometry args={[1, 0.12, 0.82]} />
        <meshStandardMaterial color="#E5D8C7" metalness={0.18} roughness={0.32} />
      </mesh>
      {[-0.32, 0.32].map((x) => (
        <mesh key={x} position={[x, 0.58, 0]} castShadow>
          <boxGeometry args={[0.12, 0.92, 0.12]} />
          <meshStandardMaterial color="#E6ECEA" metalness={0.48} roughness={0.18} />
        </mesh>
      ))}
      <mesh position={[0, 1.02, 0]} castShadow>
        <boxGeometry args={[0.9, 0.12, 0.12]} />
        <meshStandardMaterial color="#255849" metalness={0.68} roughness={0.16} />
      </mesh>
      <mesh ref={beamRef} position={[0, 0.56, 0]}>
        <boxGeometry args={[0.82, 0.78, 0.03]} />
        <meshBasicMaterial color="#E6ECEA" transparent opacity={0.16} />
      </mesh>
      <mesh ref={scannerRingRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.16, 0]}>
        <ringGeometry args={[0.42, 0.56, 40]} />
        <meshStandardMaterial
          color="#E5D8C7"
          emissive="#E5D8C7"
          emissiveIntensity={0.3}
          transparent
          opacity={0.78}
        />
      </mesh>

      <group ref={flapRef} position={[0.54, 0.22, 0.02]} rotation={[0, 0, -0.12]}>
        <mesh position={[0.2, 0, 0]} castShadow>
          <boxGeometry args={[0.56, 0.06, 0.42]} />
          <meshStandardMaterial
            color="#255849"
            metalness={0.62}
            roughness={0.16}
            emissive="#255849"
            emissiveIntensity={0.22}
          />
        </mesh>
      </group>
    </group>
  );
}

function CustomerMachinery({ ringRef, haloRef, padRef, beaconRef }) {
  return (
    <group position={[1.02, 0.04, 0.36]}>
      <mesh ref={padRef} position={[0, 0.08, 0]} receiveShadow castShadow>
        <boxGeometry args={[1.04, 0.14, 0.76]} />
        <meshStandardMaterial
          color="#E6ECEA"
          metalness={0.28}
          roughness={0.28}
          emissive="#255849"
          emissiveIntensity={0.12}
        />
      </mesh>
      <mesh position={[0, 0.16, 0.31]} castShadow>
        <boxGeometry args={[0.34, 0.04, 0.08]} />
        <meshStandardMaterial color="#255849" metalness={0.6} roughness={0.16} />
      </mesh>
      <mesh ref={haloRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.12, 0]}>
        <ringGeometry args={[0.48, 0.8, 48]} />
        <meshBasicMaterial color="#E6ECEA" transparent opacity={0.22} />
      </mesh>
      <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.34, 0]}>
        <torusGeometry args={[0.5, 0.045, 16, 80]} />
        <meshStandardMaterial
          color="#E5D8C7"
          emissive="#E5D8C7"
          emissiveIntensity={0.45}
          transparent
          opacity={0.9}
        />
      </mesh>
      <mesh ref={beaconRef} position={[0, 0.72, 0]}>
        <sphereGeometry args={[0.08, 18, 18]} />
        <meshBasicMaterial color="#E6ECEA" transparent opacity={0.8} />
      </mesh>
    </group>
  );
}

function StageNode({ index, position, label, children, ringRef, pulseRef, lightRef, setBurstRef }) {
  return (
    <Float speed={1.25} rotationIntensity={0.08} floatIntensity={0.2}>
      <group position={position}>
        <pointLight
          ref={lightRef}
          position={[0, 0.9, 0]}
          intensity={0.55}
          distance={4}
          color={nodeColor[index]}
        />
        <mesh
          ref={pulseRef}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, 0.12, 0]}
        >
          <ringGeometry args={[1.14, 1.36, 44]} />
          <meshBasicMaterial color={nodeColor[index]} transparent opacity={0.08} />
        </mesh>
        <mesh
          ref={ringRef}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, 0.14, 0]}
        >
          <torusGeometry args={[1.58, 0.09, 22, 84]} />
          <meshStandardMaterial
            color={nodeColor[index]}
            emissive={nodeColor[index]}
            emissiveIntensity={0.55}
            transparent
            opacity={0.78}
          />
        </mesh>
        {stageBurstAngles.map((angle, particleIndex) => (
          <mesh
            key={`${label}-burst-${angle}`}
            ref={(element) => {
              setBurstRef?.(particleIndex, element);
            }}
            position={[0, 0.55, 0]}
            scale={0.001}
          >
            <sphereGeometry args={[0.06, 14, 14]} />
            <meshBasicMaterial color={nodeColor[index]} transparent opacity={0} />
          </mesh>
        ))}
        {children}
        <Text
          position={[0, 1.95, 0]}
          fontSize={0.38}
          letterSpacing={0.04}
          color="#E6ECEA"
          anchorX="center"
          anchorY="middle"
        >
          {label}
        </Text>
      </group>
    </Float>
  );
}

function HeroScene() {
  const rig = useRef({ sweep: 0, altitude: 0, glow: 0.45, focus: 0 });
  const mouse = useRef({ x: 0, y: 0 });
  const laneDirectionRef = useRef(new Vector3());
  const stageRings = useRef([]);
  const stagePulseRefs = useRef([]);
  const stageLightRefs = useRef([]);
  const stageBurstRefs = useRef([[], [], []]);
  const packageRefs = useRef([]);
  const packageBodyRefs = useRef([]);
  const returnPackageRefs = useRef([]);
  const pulseRefs = useRef([]);
  const tubeRef = useRef(null);
  const returnTubeRef = useRef(null);
  const dataLineRefs = useRef([]);
  const dataPacketRefs = useRef([]);
  const junctionRefs = useRef([]);
  const groupRef = useRef(null);
  const industryArmBaseRef = useRef(null);
  const industryArmElbowRef = useRef(null);
  const industryClawRefs = useRef([]);
  const industryBayRef = useRef(null);
  const retailScannerBeamRef = useRef(null);
  const retailScannerRingRef = useRef(null);
  const retailFlapRef = useRef(null);
  const customerDeliveryRingRef = useRef(null);
  const customerDeliveryHaloRef = useRef(null);
  const customerDropPadRef = useRef(null);
  const customerBeaconRef = useRef(null);

  const mainPoints = useMemo(
    () => [
      new Vector3(-8.4, 0.25, 2.4),
      new Vector3(-5.5, 0.7, 1.2),
      new Vector3(-2.4, 0.35, -1.45),
      new Vector3(0, 0.55, -0.4),
      new Vector3(3.15, 0.45, 1.55),
      new Vector3(6.8, 0.28, -0.2),
      new Vector3(8.3, 0.36, -1.85),
    ],
    [],
  );

  const returnPoints = useMemo(
    () => [
      new Vector3(8.65, 0.18, -2.45),
      new Vector3(6.2, 0.1, 1.25),
      new Vector3(2.35, 0.04, 2.75),
      new Vector3(-1.3, -0.05, 2.25),
      new Vector3(-5.55, 0.02, 1.35),
      new Vector3(-8.78, 0.12, 2.88),
    ],
    [],
  );

  const curve = useMemo(() => new CatmullRomCurve3(mainPoints), [mainPoints]);
  const returnCurve = useMemo(() => new CatmullRomCurve3(returnPoints), [returnPoints]);

  const dataCurves = useMemo(
    () => [
      new CatmullRomCurve3(
        mainPoints.map((point, index) =>
          point.clone().add(new Vector3(0, 1.08 + Math.sin(index * 0.55) * 0.08, 0.3)),
        ),
      ),
      new CatmullRomCurve3(
        mainPoints.map((point, index) =>
          point.clone().add(new Vector3(0, 1.42 + Math.cos(index * 0.45) * 0.06, -0.18)),
        ),
      ),
    ],
    [mainPoints],
  );

  const junctionCurves = useMemo(() => {
    const splitStart = curve.getPointAt(0.66);
    const splitEnd = returnCurve.getPointAt(0.14);
    const splitMid = splitStart.clone().lerp(splitEnd, 0.5).add(new Vector3(-0.15, 0.16, 0.78));

    const mergeStart = returnCurve.getPointAt(0.86);
    const mergeEnd = curve.getPointAt(0.15);
    const mergeMid = mergeStart.clone().lerp(mergeEnd, 0.5).add(new Vector3(0.24, 0.14, -0.42));

    return [
      new CatmullRomCurve3([splitStart, splitMid, splitEnd]),
      new CatmullRomCurve3([mergeStart, mergeMid, mergeEnd]),
    ];
  }, [curve, returnCurve]);

  const tubeGeometry = useMemo(() => new TubeGeometry(curve, 220, 0.11, 18, false), [curve]);
  const glowGeometry = useMemo(() => new TubeGeometry(curve, 220, 0.2, 18, false), [curve]);
  const returnTubeGeometry = useMemo(
    () => new TubeGeometry(returnCurve, 200, 0.075, 14, false),
    [returnCurve],
  );
  const returnGlowGeometry = useMemo(
    () => new TubeGeometry(returnCurve, 200, 0.14, 14, false),
    [returnCurve],
  );
  const packagePalette = useMemo(
    () => [
      { base: new Color("#EFE7DA"), emissive: new Color("#255849") },
      { base: new Color("#E6ECEA"), emissive: new Color("#255849") },
      { base: new Color("#E6ECEA"), emissive: new Color("#255849") },
      { base: new Color("#EFEAE1"), emissive: new Color("#E5D8C7") },
    ],
    [],
  );
  const dataLineGeometries = useMemo(
    () => dataCurves.map((dataCurve) => new TubeGeometry(dataCurve, 180, 0.017, 10, false)),
    [dataCurves],
  );
  const junctionGeometries = useMemo(
    () => junctionCurves.map((junctionCurve) => new TubeGeometry(junctionCurve, 100, 0.05, 12, false)),
    [junctionCurves],
  );

  useEffect(() => {
    const onMove = (event) => {
      mouse.current.x = (event.clientX / window.innerWidth - 0.5) * 2;
      mouse.current.y = (event.clientY / window.innerHeight - 0.5) * 2;
    };

    window.addEventListener("pointermove", onMove);
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  useLayoutEffect(() => {
    const timeline = gsap.timeline({ repeat: -1, yoyo: true, defaults: { ease: "sine.inOut" } });

    timeline
      .to(rig.current, { sweep: 0.34, altitude: 0.28, glow: 0.9, focus: 0.32, duration: 4.5 })
      .to(rig.current, { sweep: 0.76, altitude: 0.62, glow: 1.25, focus: 0.82, duration: 4.8 })
      .to(rig.current, { sweep: 1, altitude: 0.12, glow: 0.65, focus: 1, duration: 3.8 });

    return () => timeline.kill();
  }, []);

  useFrame(({ camera, clock }, delta) => {
    const elapsed = clock.elapsedTime;
    const mouseX = mouse.current.x;
    const mouseY = mouse.current.y;
    const drift = Math.sin(elapsed * 0.62) * 0.18;

    if (groupRef.current) {
      groupRef.current.rotation.y = MathUtils.damp(groupRef.current.rotation.y, mouseX * 0.16, 4.2, delta);
      groupRef.current.rotation.x = MathUtils.damp(groupRef.current.rotation.x, -mouseY * 0.06, 4.2, delta);
      groupRef.current.position.y = MathUtils.damp(groupRef.current.position.y, -1 + drift, 3.2, delta);
    }

    const baseX = -6.65 + rig.current.sweep * 8.95;
    const baseY = 3.15 + rig.current.altitude * 1.35 + mouseY * 0.28;
    const baseZ = 13.8 - rig.current.sweep * 3 + Math.abs(mouseX) * 0.3;
    camera.position.x = MathUtils.damp(camera.position.x, baseX + mouseX * 1.1, 3.2, delta);
    camera.position.y = MathUtils.damp(camera.position.y, baseY, 3.2, delta);
    camera.position.z = MathUtils.damp(camera.position.z, baseZ, 3.2, delta);

    const focusPoint = curve.getPointAt((rig.current.focus * 0.84 + 0.08) % 1);
    camera.lookAt(focusPoint.x + mouseX * 0.4, focusPoint.y + 1.2 + mouseY * 0.2, focusPoint.z);

    if (tubeRef.current) {
      tubeRef.current.material.emissiveIntensity = MathUtils.damp(
        tubeRef.current.material.emissiveIntensity,
        0.5 + Math.sin(elapsed * 2.6) * 0.1 + rig.current.glow * 0.55,
        3.8,
        delta,
      );
    }

    if (returnTubeRef.current) {
      returnTubeRef.current.material.emissiveIntensity = MathUtils.damp(
        returnTubeRef.current.material.emissiveIntensity,
        0.28 + Math.sin(elapsed * 2.1 + 0.8) * 0.08 + rig.current.glow * 0.22,
        3.8,
        delta,
      );
    }

    const packageProgress = packageOffsets.map(
      (offset) => (elapsed * 0.08 + rig.current.sweep * 0.18 + offset) % 1,
    );
    const returnProgress = returnPackageOffsets.map((offset) => (elapsed * 0.055 + offset) % 1);

    packageRefs.current.forEach((mesh, index) => {
      if (!mesh) {
        return;
      }

      const t = packageProgress[index];
      const point = curve.getPointAt(t);
      const tangent = curve.getTangentAt(t);
      mesh.position.copy(point);
      mesh.position.y += 0.15 + Math.sin(elapsed * 2 + index) * 0.06;
      laneDirectionRef.current.copy(tangent);
      laneDirectionRef.current.y = 0;
      if (laneDirectionRef.current.lengthSq() > 0.0001) {
        laneDirectionRef.current.normalize();
        mesh.rotation.set(0, -Math.atan2(laneDirectionRef.current.z, laneDirectionRef.current.x), 0);
      }

      let segment = 2;
      let blend = 1;
      if (t < packageStateStops[1]) {
        segment = 0;
        blend = MathUtils.smoothstep(t, packageStateStops[0], packageStateStops[1]);
      } else if (t < packageStateStops[2]) {
        segment = 1;
        blend = MathUtils.smoothstep(t, packageStateStops[1], packageStateStops[2]);
      } else {
        segment = 2;
        blend = MathUtils.smoothstep(t, packageStateStops[2], packageStateStops[3]);
      }

      const busBody = packageBodyRefs.current[index];
      if (!busBody) {
        return;
      }

      busBody.material.color.lerpColors(
        packagePalette[segment].base,
        packagePalette[segment + 1].base,
        blend,
      );
      busBody.material.emissive.lerpColors(
        packagePalette[segment].emissive,
        packagePalette[segment + 1].emissive,
        blend,
      );

      const nearestStageDistance = stageStops.reduce(
        (closest, stop) => Math.min(closest, Math.min(Math.abs(t - stop), 1 - Math.abs(t - stop))),
        1,
      );
      const localStageFlash = Math.max(0, 1 - nearestStageDistance / 0.07);
      busBody.material.emissiveIntensity = MathUtils.damp(
        busBody.material.emissiveIntensity,
        0.34 + blend * 0.22 + localStageFlash * 0.68,
        5,
        delta,
      );
    });

    returnPackageRefs.current.forEach((mesh, index) => {
      if (!mesh) {
        return;
      }

      const t = returnProgress[index];
      const point = returnCurve.getPointAt(t);
      const tangent = returnCurve.getTangentAt(t);
      mesh.position.copy(point);
      mesh.position.y += 0.08 + Math.sin(elapsed * 2.6 + index) * 0.04;
      laneDirectionRef.current.copy(tangent);
      laneDirectionRef.current.y = 0;
      if (laneDirectionRef.current.lengthSq() > 0.0001) {
        laneDirectionRef.current.normalize();
        mesh.rotation.set(0, -Math.atan2(laneDirectionRef.current.z, laneDirectionRef.current.x), 0);
      }
    });

    const stageIntensity = stageStops.map((stageStop) => {
      const closestArrival = packageProgress.reduce((closest, packageT) => {
        const distance = Math.min(Math.abs(packageT - stageStop), 1 - Math.abs(packageT - stageStop));
        return Math.min(closest, distance);
      }, 1);

      return Math.max(0, 1 - closestArrival / 0.12);
    });

    stageRings.current.forEach((ring, index) => {
      if (!ring) {
        return;
      }

      const intensity = stageIntensity[index];
      ring.material.emissiveIntensity = MathUtils.damp(
        ring.material.emissiveIntensity,
        0.45 + intensity * 2.7,
        4.4,
        delta,
      );
      const scale = 1 + intensity * 0.18;
      ring.scale.setScalar(MathUtils.damp(ring.scale.x, scale, 4.2, delta));
    });

    stagePulseRefs.current.forEach((pulse, index) => {
      if (!pulse) {
        return;
      }

      const intensity = stageIntensity[index];
      const pulseScale = 1 + intensity * 0.42;
      pulse.scale.setScalar(MathUtils.damp(pulse.scale.x, pulseScale, 4.8, delta));
      pulse.material.opacity = MathUtils.damp(
        pulse.material.opacity,
        0.06 + intensity * 0.46,
        5,
        delta,
      );
    });

    stageLightRefs.current.forEach((light, index) => {
      if (!light) {
        return;
      }

      const intensity = stageIntensity[index];
      light.intensity = MathUtils.damp(light.intensity, 0.55 + intensity * 3.6, 5.2, delta);
      light.distance = MathUtils.damp(light.distance, 4 + intensity * 1.6, 4.8, delta);
    });

    pulseRefs.current.forEach((pulse, index) => {
      if (!pulse) {
        return;
      }

      const t = (elapsed * 0.12 + index * 0.31) % 1;
      const point = curve.getPointAt(t);
      pulse.position.copy(point);
      pulse.position.y += 0.08;
      pulse.scale.setScalar(0.3 + (Math.sin(elapsed * 2.4 + index) + 1) * 0.16);
      pulse.material.opacity = 0.28 + (Math.sin(elapsed * 3.1 + index) + 1) * 0.16;
    });

    stageBurstRefs.current.forEach((particles, stageIndex) => {
      const intensity = stageIntensity[stageIndex];

      particles.forEach((particle, particleIndex) => {
        if (!particle) {
          return;
        }

        const angle = stageBurstAngles[particleIndex] + elapsed * 0.55 + stageIndex * 0.3;
        const radius = intensity * (0.18 + (particleIndex % 3) * 0.08);
        const targetX = Math.cos(angle) * radius;
        const targetZ = Math.sin(angle) * radius;
        const targetY = 0.56 + intensity * 0.34 + Math.sin(elapsed * 4 + particleIndex) * 0.03 * intensity;
        const targetScale = 0.001 + intensity * (0.34 + (particleIndex % 2) * 0.08);

        particle.position.x = MathUtils.damp(particle.position.x, targetX, 6, delta);
        particle.position.y = MathUtils.damp(particle.position.y, targetY, 6, delta);
        particle.position.z = MathUtils.damp(particle.position.z, targetZ, 6, delta);
        particle.scale.setScalar(MathUtils.damp(particle.scale.x, targetScale, 6.2, delta));
        particle.material.opacity = MathUtils.damp(
          particle.material.opacity,
          intensity * (0.55 - particleIndex * 0.05),
          6,
          delta,
        );
      });
    });

    dataLineRefs.current.forEach((line, index) => {
      if (!line) {
        return;
      }
      line.material.opacity = MathUtils.damp(
        line.material.opacity,
        0.24 + (Math.sin(elapsed * 2.2 + index * 0.9) + 1) * 0.08,
        4.6,
        delta,
      );
    });

    dataPacketRefs.current.forEach((packet, index) => {
      if (!packet) {
        return;
      }

      const config = dataPacketConfig[index];
      const dataCurve = dataCurves[config.curveIndex];
      const t = (elapsed * config.speed + config.offset) % 1;
      const point = dataCurve.getPointAt(t);
      packet.position.copy(point);
      packet.scale.setScalar(0.86 + (Math.sin(elapsed * 4.2 + index) + 1) * 0.08);
    });

    const [industryIntensity, retailIntensity, customerIntensity] = stageIntensity;

    junctionRefs.current.forEach((junction, index) => {
      if (!junction) {
        return;
      }

      const activity = index === 0 ? Math.max(retailIntensity, customerIntensity * 0.75) : Math.max(industryIntensity, retailIntensity * 0.7);
      junction.material.emissiveIntensity = MathUtils.damp(
        junction.material.emissiveIntensity,
        0.22 + activity * 1.4,
        4.8,
        delta,
      );
    });

    if (industryArmBaseRef.current) {
      industryArmBaseRef.current.rotation.z = MathUtils.damp(
        industryArmBaseRef.current.rotation.z,
        -0.42 + industryIntensity * 0.54 + Math.sin(elapsed * 1.15) * 0.04,
        4.8,
        delta,
      );
    }

    if (industryArmElbowRef.current) {
      industryArmElbowRef.current.rotation.z = MathUtils.damp(
        industryArmElbowRef.current.rotation.z,
        0.92 - industryIntensity * 0.7 + Math.sin(elapsed * 1.45 + 0.8) * 0.04,
        5,
        delta,
      );
    }

    industryClawRefs.current.forEach((claw, index) => {
      if (!claw) {
        return;
      }
      const direction = index === 0 ? -1 : 1;
      claw.position.x = MathUtils.damp(
        claw.position.x,
        direction * (0.09 + industryIntensity * 0.045),
        6,
        delta,
      );
    });

    if (industryBayRef.current) {
      industryBayRef.current.material.emissiveIntensity = MathUtils.damp(
        industryBayRef.current.material.emissiveIntensity,
        0.22 + industryIntensity * 1.4,
        5,
        delta,
      );
    }

    if (retailScannerBeamRef.current) {
      retailScannerBeamRef.current.material.opacity = MathUtils.damp(
        retailScannerBeamRef.current.material.opacity,
        0.16 + retailIntensity * 0.48 + (Math.sin(elapsed * 7.4) + 1) * 0.06,
        6,
        delta,
      );
      const beamScale = 1 + retailIntensity * 0.1;
      retailScannerBeamRef.current.scale.y = MathUtils.damp(
        retailScannerBeamRef.current.scale.y,
        beamScale,
        4.8,
        delta,
      );
    }

    if (retailScannerRingRef.current) {
      retailScannerRingRef.current.material.emissiveIntensity = MathUtils.damp(
        retailScannerRingRef.current.material.emissiveIntensity,
        0.3 + retailIntensity * 1.9,
        5,
        delta,
      );
      const ringScale = 1 + retailIntensity * 0.14;
      retailScannerRingRef.current.scale.setScalar(
        MathUtils.damp(retailScannerRingRef.current.scale.x, ringScale, 4.8, delta),
      );
    }

    if (retailFlapRef.current) {
      retailFlapRef.current.rotation.z = MathUtils.damp(
        retailFlapRef.current.rotation.z,
        -0.12 - retailIntensity * 0.65 + Math.sin(elapsed * 2.2) * 0.03,
        5.5,
        delta,
      );
    }

    if (customerDeliveryRingRef.current) {
      customerDeliveryRingRef.current.rotation.z += delta * (0.4 + customerIntensity * 0.95);
      customerDeliveryRingRef.current.material.emissiveIntensity = MathUtils.damp(
        customerDeliveryRingRef.current.material.emissiveIntensity,
        0.45 + customerIntensity * 2.1,
        5,
        delta,
      );
    }

    if (customerDeliveryHaloRef.current) {
      const haloScale = 1 + customerIntensity * 0.24;
      customerDeliveryHaloRef.current.scale.setScalar(
        MathUtils.damp(customerDeliveryHaloRef.current.scale.x, haloScale, 4.8, delta),
      );
      customerDeliveryHaloRef.current.material.opacity = MathUtils.damp(
        customerDeliveryHaloRef.current.material.opacity,
        0.18 + customerIntensity * 0.36,
        5,
        delta,
      );
    }

    if (customerDropPadRef.current) {
      customerDropPadRef.current.material.emissiveIntensity = MathUtils.damp(
        customerDropPadRef.current.material.emissiveIntensity,
        0.12 + customerIntensity * 1.15,
        5,
        delta,
      );
    }

    if (customerBeaconRef.current) {
      customerBeaconRef.current.position.y = MathUtils.damp(
        customerBeaconRef.current.position.y,
        0.72 + customerIntensity * 0.12 + Math.sin(elapsed * 3.6) * 0.03,
        5.2,
        delta,
      );
      customerBeaconRef.current.material.opacity = MathUtils.damp(
        customerBeaconRef.current.material.opacity,
        0.48 + customerIntensity * 0.42,
        5,
        delta,
      );
    }
  });

  return (
    <>
      <PerspectiveCamera makeDefault fov={38} position={[-6.65, 3.15, 13.8]} />
      <ambientLight intensity={0.42} />
      <hemisphereLight args={["#E6ECEA", "#1F5C4A", 0.72]} />
      <directionalLight
        castShadow
        intensity={1.65}
        position={[4.5, 8, 5]}
        color="#FFFFFF"
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />
      <spotLight position={[-7, 8, 4]} intensity={2.4} angle={0.35} penumbra={0.8} color="#255849" />
      <pointLight position={[0, 2.2, 0]} intensity={1.8} color="#255849" />
      <group ref={groupRef} position={[0, -1, 0]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]} receiveShadow>
          <circleGeometry args={[13, 80]} />
          <meshStandardMaterial color="#1F5C4A" roughness={0.86} metalness={0.08} />
        </mesh>

        <mesh geometry={glowGeometry}>
          <meshBasicMaterial color="#255849" transparent opacity={0.16} />
        </mesh>
        <mesh geometry={returnGlowGeometry}>
          <meshBasicMaterial color="#E5D8C7" transparent opacity={0.12} />
        </mesh>
        <mesh geometry={tubeGeometry} ref={tubeRef}>
          <meshStandardMaterial
            color="#1F5C4A"
            metalness={0.5}
            roughness={0.18}
            emissive="#255849"
            emissiveIntensity={0.7}
          />
        </mesh>
        <mesh geometry={returnTubeGeometry} ref={returnTubeRef}>
          <meshStandardMaterial
            color="#1F5C4A"
            metalness={0.42}
            roughness={0.22}
            emissive="#E6ECEA"
            emissiveIntensity={0.3}
          />
        </mesh>

        {junctionGeometries.map((geometry, index) => (
          <mesh
            key={`junction-${index}`}
            geometry={geometry}
            ref={(element) => {
              junctionRefs.current[index] = element;
            }}
          >
            <meshStandardMaterial
              color={index === 0 ? "#E5D8C7" : "#E6ECEA"}
              metalness={0.38}
              roughness={0.18}
              emissive={index === 0 ? "#E5D8C7" : "#E6ECEA"}
              emissiveIntensity={0.3}
              transparent
              opacity={0.92}
            />
          </mesh>
        ))}

        {dataLineGeometries.map((geometry, index) => (
          <mesh
            key={`data-line-${index}`}
            geometry={geometry}
            ref={(element) => {
              dataLineRefs.current[index] = element;
            }}
          >
            <meshBasicMaterial
              color={index === 0 ? "#E6ECEA" : "#E6ECEA"}
              transparent
              opacity={0.28}
            />
          </mesh>
        ))}

        {[0.12, 0.42, 0.68, 0.88].map((t, index) => {
          const point = curve.getPointAt(t);
          return (
            <mesh key={t} position={[point.x, point.y + 0.02, point.z]} rotation={[-Math.PI / 2, 0, 0]}>
              <torusGeometry args={[0.38, 0.025, 12, 60]} />
              <meshBasicMaterial
                color={index % 2 === 0 ? "#255849" : "#E5D8C7"}
                transparent
                opacity={0.48}
              />
            </mesh>
          );
        })}

        <StageNode
          index={0}
          label="Industry"
          position={[-8.6, 0, 2.55]}
          ringRef={(element) => {
            stageRings.current[0] = element;
          }}
          pulseRef={(element) => {
            stagePulseRefs.current[0] = element;
          }}
          lightRef={(element) => {
            stageLightRefs.current[0] = element;
          }}
          setBurstRef={(particleIndex, element) => {
            stageBurstRefs.current[0][particleIndex] = element;
          }}
        >
          <FactoryModel />
          <IndustryMachinery
            baseRef={industryArmBaseRef}
            elbowRef={industryArmElbowRef}
            bayRef={industryBayRef}
            clawLeftRef={(element) => {
              industryClawRefs.current[0] = element;
            }}
            clawRightRef={(element) => {
              industryClawRefs.current[1] = element;
            }}
          />
        </StageNode>

        <StageNode
          index={1}
          label="Retailer"
          position={[0, 0, -0.2]}
          ringRef={(element) => {
            stageRings.current[1] = element;
          }}
          pulseRef={(element) => {
            stagePulseRefs.current[1] = element;
          }}
          lightRef={(element) => {
            stageLightRefs.current[1] = element;
          }}
          setBurstRef={(particleIndex, element) => {
            stageBurstRefs.current[1][particleIndex] = element;
          }}
        >
          <StoreModel />
          <RetailMachinery
            beamRef={retailScannerBeamRef}
            scannerRingRef={retailScannerRingRef}
            flapRef={retailFlapRef}
          />
        </StageNode>

        <StageNode
          index={2}
          label="Customer"
          position={[8.2, 0, -1.95]}
          ringRef={(element) => {
            stageRings.current[2] = element;
          }}
          pulseRef={(element) => {
            stagePulseRefs.current[2] = element;
          }}
          lightRef={(element) => {
            stageLightRefs.current[2] = element;
          }}
          setBurstRef={(particleIndex, element) => {
            stageBurstRefs.current[2][particleIndex] = element;
          }}
        >
          <CustomerModel />
          <CustomerMachinery
            ringRef={customerDeliveryRingRef}
            haloRef={customerDeliveryHaloRef}
            padRef={customerDropPadRef}
            beaconRef={customerBeaconRef}
          />
        </StageNode>

        {packageOffsets.map((offset, index) => (
          <group
            key={offset}
            ref={(element) => {
              packageRefs.current[index] = element;
            }}
          >
            <DeliveryBus
              bodyRef={(element) => {
                packageBodyRefs.current[index] = element;
              }}
              bodyColor={index % 2 === 0 ? "#EFE7DA" : "#E6ECEA"}
              emissiveColor="#255849"
              emissiveIntensity={0.42}
            />
          </group>
        ))}

        {returnPackageOffsets.map((offset, index) => (
          <group
            key={`return-${offset}`}
            ref={(element) => {
              returnPackageRefs.current[index] = element;
            }}
          >
            <DeliveryBus
              scale={0.84}
              bodyColor="#E6ECEA"
              emissiveColor="#EFE7DA"
              emissiveIntensity={0.24}
              windowColor="#FFFFFF"
            />
          </group>
        ))}

        {dataPacketConfig.map((config, index) => (
          <mesh
            key={`data-packet-${config.curveIndex}-${config.offset}`}
            ref={(element) => {
              dataPacketRefs.current[index] = element;
            }}
          >
            <sphereGeometry args={[0.065, 16, 16]} />
            <meshBasicMaterial color={config.color} transparent opacity={0.95} />
          </mesh>
        ))}

        {[0, 1, 2].map((index) => (
          <mesh
            key={index}
            ref={(element) => {
              pulseRefs.current[index] = element;
            }}
          >
            <sphereGeometry args={[0.2, 24, 24]} />
            <meshBasicMaterial color="#E6ECEA" transparent opacity={0.4} />
          </mesh>
        ))}
      </group>

      <AdaptiveDpr pixelated />
      <AdaptiveEvents />
      <Preload all />
    </>
  );
}

function HeroSceneFallback() {
  const packages = [0, 1, 2];
  const nodes = [
    { label: "Industry", left: "12%" },
    { label: "Retailer", left: "49%" },
    { label: "Customer", left: "84%" },
  ];

  return (
    <div className="relative h-full w-full overflow-hidden rounded-[28px] bg-[#1F5C4A]">
      <div className="absolute left-[12%] right-[10%] top-1/2 h-px -translate-y-1/2 bg-gradient-to-r from-[#255849]/20 via-[#E5D8C7] to-[#255849]/20" />
      <div className="absolute left-[12%] right-[10%] top-1/2 h-3 -translate-y-1/2 rounded-full bg-[linear-gradient(90deg,rgba(31,92,74,0.18),rgba(229,216,199,0.38),rgba(31,92,74,0.18))] blur-md" />

      {nodes.map((node, index) => (
        <motion.div
          key={node.label}
          animate={{ y: [0, -10, 0], scale: [1, 1.05, 1] }}
          transition={{ duration: 4.2 + index * 0.6, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-1/2 z-10 -translate-x-1/2 -translate-y-1/2"
          style={{ left: node.left }}
        >
          <div className="absolute inset-0 rounded-full bg-[#255849]/20 blur-2xl" />
          <div className="relative flex h-22 w-22 items-center justify-center rounded-full border border-white/12 bg-white/[0.06] backdrop-blur-xl">
            <div className="h-11 w-11 rounded-[18px] bg-[linear-gradient(180deg,#E6ECEA_0%,#255849_100%)] shadow-[0_0_30px_rgba(229,216,199,0.25)]" />
          </div>
          <div className="mt-4 text-center text-xs font-semibold uppercase tracking-[0.24em] text-white/72">
            {node.label}
          </div>
        </motion.div>
      ))}

      {packages.map((item) => (
        <motion.div
          key={item}
          className="absolute top-1/2 z-20 h-4 w-6 -translate-y-1/2 rounded-[6px] border border-white/10 bg-[#EFE7DA] shadow-[0_0_24px_rgba(229,216,199,0.4)]"
          style={{ left: "14%" }}
          animate={{ left: ["14%", "80%"], y: [0, -8, 0] }}
          transition={{
            duration: 6.8,
            delay: item * 1.1,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}

      <div className="absolute inset-x-6 bottom-6 rounded-[22px] border border-[#E5D8C7]/30 bg-[#255849]/35 px-4 py-3 text-sm text-white/80 backdrop-blur-xl">
        WebGL is unavailable, showing the fallback motion preview.
      </div>
    </div>
  );
}

export default function Hero3DScene() {
  return (
    <section id="top" className="relative pt-0">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="section-shell min-h-[calc(100vh+56px)] rounded-[34px] border border-[#E5D8C7]/80 bg-[#EFEAE1] shadow-[0_30px_100px_rgba(37,88,73,0.14)] lg:h-[calc(100vh+56px)]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_28%_18%,rgba(255,255,255,0.74),transparent_28%),radial-gradient(circle_at_86%_12%,rgba(230,236,234,0.82),transparent_24%),linear-gradient(180deg,#EFEAE1_0%,#EFE7DA_100%)]" />

          <div className="relative z-10 grid min-h-[calc(100vh+56px)] grid-cols-1 gap-6 px-6 py-7 sm:px-8 lg:h-full lg:grid-cols-[1.04fr_0.96fr] lg:px-10 lg:py-8">
            <div className="flex flex-col justify-between">
              <div className="max-w-2xl pt-2 lg:pt-4">
                <p className="section-label mb-4">
                  Cinematic Supply Intelligence
                </p>

                <h1 className="font-display text-[2.55rem] leading-[0.95] tracking-[-0.04em] text-[#1F5C4A] sm:text-[3.6rem] lg:text-[4.65rem]">
                  Move every shipment through a{" "}
                  <span className="text-[#255849]">living supply chain</span>.
                </h1>

                <p className="mt-5 max-w-xl text-base leading-7 text-[#255849] lg:text-[1.02rem]">
                  Nasou Hive connects industry, retailers, and customers inside one luminous
                  operating layer so inventory, route health, and order promise stay visible in
                  motion.
                </p>

                <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                  <motion.div
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    className="inline-flex"
                  >
                    <Link
                      to="/app/auth"
                      className="inline-flex items-center justify-center rounded-full border border-[#FFFFFF] bg-[#E5D8C7] px-6 py-3.5 text-sm font-semibold text-[#1F5C4A] shadow-[0_16px_36px_rgba(229,216,199,0.22)] transition hover:bg-[#FFFFFF]"
                    >
                      Get Started
                    </Link>
                  </motion.div>
                  <motion.a
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    href="#story"
                    className="inline-flex items-center justify-center rounded-full border border-[#E5D8C7] bg-[#FFFFFF]/80 px-6 py-3.5 text-sm font-semibold text-[#1F5C4A] shadow-[0_16px_36px_rgba(37,88,73,0.12)] transition hover:bg-[#E6ECEA]"
                  >
                    Explore the motion system
                  </motion.a>
                </div>
              </div>

              <div className="grid max-w-2xl grid-cols-1 gap-3 pt-5 sm:grid-cols-3">
                {[
                  ["98.2%", "Forecast-to-fill accuracy"],
                  ["27%", "Fewer reactive escalations"],
                  ["3x", "Faster retailer replenishment"],
                ].map(([value, label]) => (
                  <div
                    key={label}
                    className="rounded-[24px] border border-[#E5D8C7] bg-[#FFFFFF]/80 px-4 py-4 text-left shadow-[0_18px_40px_rgba(37,88,73,0.1)] backdrop-blur-2xl"
                  >
                    <div className="font-display text-xl text-[#1F5C4A] lg:text-2xl">{value}</div>
                    <div className="mt-2 text-sm leading-6 text-[#255849]">{label}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative h-[520px] sm:h-[680px] lg:h-full">
              <div className="absolute inset-0 sm:bottom-[72px] lg:bottom-[84px]">
                <div className="absolute inset-0 rounded-[28px] border border-[#1F5C4A]/20 bg-[#1F5C4A] shadow-[0_30px_80px_rgba(31,92,74,0.22)]" />
                <SceneCanvas
                  fallback={<HeroSceneFallback />}
                  className="!h-full !w-full"
                  style={{ width: "100%", height: "100%" }}
                  shadows="percentage"
                  dpr={[1, 1.25]}
                  gl={{ antialias: false, alpha: true }}
                  camera={{ position: [-6.65, 3.15, 13.8], fov: 38 }}
                >
                  <HeroScene />
                </SceneCanvas>
              </div>

              <div className="pointer-events-none absolute inset-x-4 bottom-3 z-20 grid gap-3 sm:inset-x-5 sm:bottom-4 sm:grid-cols-3">
                {[
                  ["Industry", "Supplier pulse, manufacturing readiness"],
                  ["Retailer", "Shelf velocity, replenishment timing"],
                  ["Customer", "Order promise, delivery confidence"],
                ].map(([label, copy], index) => (
                  <motion.div
                    key={label}
                    initial={{ opacity: 0, y: 18 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.65 + index * 0.08, duration: 0.7 }}
                    className="rounded-[22px] border border-[#E5D8C7] bg-[#FFFFFF]/86 px-4 py-3 text-left shadow-[0_16px_36px_rgba(37,88,73,0.12)] backdrop-blur-xl"
                  >
                    <div className="mb-1.5 flex items-center gap-2">
                      <span className="inline-flex h-2.5 w-2.5 rounded-full bg-[#255849]" />
                      <span className="text-sm font-semibold text-[#1F5C4A]">{label}</span>
                    </div>
                    <p className="text-xs leading-5 text-[#255849]">{copy}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

