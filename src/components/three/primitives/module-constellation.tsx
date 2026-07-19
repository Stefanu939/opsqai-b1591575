import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

/**
 * ModuleConstellation — a rotating network of nodes orbiting a central core.
 * The core represents the Basic Platform; the outer nodes represent premium
 * modules that light up as they connect. Gold links pulse between them.
 */
export function ModuleConstellation({ nodeCount = 14 }: { nodeCount?: number }) {
  const groupRef = useRef<THREE.Group | null>(null);
  const coreRef = useRef<THREE.Mesh | null>(null);
  const linesRef = useRef<THREE.LineSegments | null>(null);

  const nodes = useMemo(() => {
    const arr: { pos: THREE.Vector3; speed: number; phase: number }[] = [];
    for (let i = 0; i < nodeCount; i++) {
      const t = i / nodeCount;
      const theta = t * Math.PI * 2 + (i % 3) * 0.4;
      const phi = Math.acos(1 - 2 * ((i + 0.5) / nodeCount));
      const r = 2.6 + ((i * 37) % 5) * 0.08;
      arr.push({
        pos: new THREE.Vector3(
          r * Math.sin(phi) * Math.cos(theta),
          r * Math.cos(phi) * 0.75,
          r * Math.sin(phi) * Math.sin(theta),
        ),
        speed: 0.15 + ((i * 13) % 10) * 0.015,
        phase: t * Math.PI * 2,
      });
    }
    return arr;
  }, [nodeCount]);

  const lineGeometry = useMemo(() => {
    const positions: number[] = [];
    for (const n of nodes) {
      positions.push(0, 0, 0, n.pos.x, n.pos.y, n.pos.z);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    return g;
  }, [nodes]);

  useFrame((state, delta) => {
    if (groupRef.current) groupRef.current.rotation.y += delta * 0.08;
    if (coreRef.current) {
      const s = 1 + Math.sin(state.clock.elapsedTime * 1.4) * 0.04;
      coreRef.current.scale.setScalar(s);
    }
    if (linesRef.current) {
      const mat = linesRef.current.material as THREE.LineBasicMaterial;
      mat.opacity = 0.22 + (Math.sin(state.clock.elapsedTime * 0.8) + 1) * 0.08;
    }
  });

  return (
    <group ref={groupRef}>
      {/* Central core — Basic Platform */}
      <mesh ref={coreRef}>
        <icosahedronGeometry args={[0.7, 1]} />
        <meshStandardMaterial
          color="#0d7a5f"
          emissive="#C9A24C"
          emissiveIntensity={0.35}
          metalness={0.9}
          roughness={0.25}
        />
      </mesh>
      <pointLight position={[0, 0, 0]} intensity={1.8} color="#C9A24C" distance={8} />

      {/* Module nodes */}
      {nodes.map((n, i) => (
        <ModuleNode key={i} basePos={n.pos} speed={n.speed} phase={n.phase} index={i} />
      ))}

      {/* Gold links */}
      <lineSegments ref={linesRef} geometry={lineGeometry}>
        <lineBasicMaterial color="#C9A24C" transparent opacity={0.25} />
      </lineSegments>
    </group>
  );
}

function ModuleNode({
  basePos,
  speed,
  phase,
  index,
}: {
  basePos: THREE.Vector3;
  speed: number;
  phase: number;
  index: number;
}) {
  const ref = useRef<THREE.Mesh | null>(null);
  const isGold = index % 3 === 0;

  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime;
    const wobble = Math.sin(t * speed + phase) * 0.12;
    ref.current.position.set(basePos.x, basePos.y + wobble, basePos.z);
    const pulse = 1 + Math.sin(t * 2 + phase) * 0.12;
    ref.current.scale.setScalar(pulse);
  });

  return (
    <mesh ref={ref}>
      <octahedronGeometry args={[0.14, 0]} />
      <meshStandardMaterial
        color={isGold ? "#C9A24C" : "#e8ecef"}
        emissive={isGold ? "#C9A24C" : "#0d7a5f"}
        emissiveIntensity={isGold ? 0.9 : 0.35}
        metalness={0.85}
        roughness={0.2}
      />
    </mesh>
  );
}
