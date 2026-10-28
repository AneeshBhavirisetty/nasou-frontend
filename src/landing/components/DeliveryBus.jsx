export default function DeliveryBus({
  bodyRef,
  scale = 1,
  bodyColor = "#EFE7DA",
  emissiveColor = "#255849",
  emissiveIntensity = 0.42,
  windowColor = "#E6ECEA",
}) {
  return (
    <group scale={scale}>
      <mesh ref={bodyRef} castShadow position={[0, 0.03, 0]}>
        <boxGeometry args={[0.8, 0.24, 0.3]} />
        <meshStandardMaterial
          color={bodyColor}
          metalness={0.68}
          roughness={0.15}
          emissive={emissiveColor}
          emissiveIntensity={emissiveIntensity}
        />
      </mesh>

      <mesh position={[0.1, 0.17, 0]} castShadow>
        <boxGeometry args={[0.34, 0.14, 0.28]} />
        <meshStandardMaterial
          color="#FFFFFF"
          metalness={0.38}
          roughness={0.22}
          emissive="#E6ECEA"
          emissiveIntensity={0.1}
        />
      </mesh>

      <mesh position={[0.23, 0.18, 0.151]}>
        <boxGeometry args={[0.16, 0.08, 0.02]} />
        <meshBasicMaterial color={windowColor} />
      </mesh>
      <mesh position={[0.23, 0.18, -0.151]}>
        <boxGeometry args={[0.16, 0.08, 0.02]} />
        <meshBasicMaterial color={windowColor} />
      </mesh>

      {[-0.12, 0.04, 0.2].map((x) => (
        <mesh key={`window-left-${x}`} position={[x, 0.08, 0.151]}>
          <boxGeometry args={[0.11, 0.07, 0.02]} />
          <meshBasicMaterial color={windowColor} />
        </mesh>
      ))}
      {[-0.12, 0.04, 0.2].map((x) => (
        <mesh key={`window-right-${x}`} position={[x, 0.08, -0.151]}>
          <boxGeometry args={[0.11, 0.07, 0.02]} />
          <meshBasicMaterial color={windowColor} />
        </mesh>
      ))}

      {[-0.22, 0.22].map((x) => (
        <mesh key={`wheel-left-${x}`} rotation={[Math.PI / 2, 0, 0]} position={[x, -0.11, 0.12]} castShadow>
          <cylinderGeometry args={[0.06, 0.06, 0.05, 18]} />
          <meshStandardMaterial color="#1F5C4A" metalness={0.35} roughness={0.72} />
        </mesh>
      ))}
      {[-0.22, 0.22].map((x) => (
        <mesh key={`wheel-right-${x}`} rotation={[Math.PI / 2, 0, 0]} position={[x, -0.11, -0.12]} castShadow>
          <cylinderGeometry args={[0.06, 0.06, 0.05, 18]} />
          <meshStandardMaterial color="#1F5C4A" metalness={0.35} roughness={0.72} />
        </mesh>
      ))}

      <mesh position={[-0.24, 0.04, 0]}>
        <boxGeometry args={[0.06, 0.07, 0.32]} />
        <meshBasicMaterial color="#255849" />
      </mesh>
    </group>
  );
}

