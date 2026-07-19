import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

/**
 * ServerMonolith — a slow-rotating obsidian slab with gold edge lighting.
 * Signature 3D anchor for the Self-Hosted page: the "product on the customer's
 * server", not a hosted service. Deliberately still and heavy.
 */
export function ServerMonolith() {
  const groupRef = useRef<THREE.Group | null>(null);
  const glowRef = useRef<THREE.PointLight | null>(null);

  useFrame((state, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.12;
      groupRef.current.position.y = Math.sin(state.clock.elapsedTime * 0.4) * 0.05;
    }
    if (glowRef.current) {
      glowRef.current.intensity = 1.6 + Math.sin(state.clock.elapsedTime * 1.2) * 0.25;
    }
  });

  return (
    <group ref={groupRef}>
      {/* Core monolith */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[1.6, 3.8, 1.6]} />
        <meshStandardMaterial
          color="#0a1512"
          metalness={0.85}
          roughness={0.28}
          emissive="#0d7a5f"
          emissiveIntensity={0.06}
        />
      </mesh>

      {/* Gold rim */}
      <mesh>
        <boxGeometry args={[1.62, 0.02, 1.62]} />
        <meshStandardMaterial
          color="#c9a84c"
          emissive="#c9a84c"
          emissiveIntensity={0.9}
          metalness={1}
          roughness={0.15}
        />
      </mesh>
      <mesh position={[0, -1.9, 0]}>
        <boxGeometry args={[1.62, 0.02, 1.62]} />
        <meshStandardMaterial
          color="#c9a84c"
          emissive="#c9a84c"
          emissiveIntensity={0.9}
          metalness={1}
          roughness={0.15}
        />
      </mesh>
      <mesh position={[0, 1.9, 0]}>
        <boxGeometry args={[1.62, 0.02, 1.62]} />
        <meshStandardMaterial
          color="#c9a84c"
          emissive="#c9a84c"
          emissiveIntensity={0.9}
          metalness={1}
          roughness={0.15}
        />
      </mesh>

      {/* Status LED array */}
      {Array.from({ length: 8 }).map((_, i) => (
        <mesh key={i} position={[0.82, 1.4 - i * 0.28, 0.5]}>
          <sphereGeometry args={[0.03, 12, 12]} />
          <meshBasicMaterial color={i % 3 === 0 ? "#2dd4a8" : "#c9a84c"} />
        </mesh>
      ))}

      {/* Interior emerald glow */}
      <pointLight ref={glowRef} position={[0, 0, 0]} color="#0d7a5f" intensity={1.6} distance={4} />
    </group>
  );
}
