import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

/**
 * ParticleGenesis — the OPSQAI signature system.
 *
 * A single BufferGeometry of ~N particles that lerps between 5 pre-computed
 * keyframe layouts, telling the story:
 *
 *   Chaos → Documents → SOPs → Network → Logo
 *
 * The keyframe is driven by `progress` in [0..4]. A whole-number progress
 * lands exactly on a keyframe; fractional values morph between them.
 *
 * Positions live in shader attributes; only a single `uProgress` uniform is
 * updated per frame, so 60k+ particles animate cheaply on the GPU.
 */

const COUNT = 24_000; // 24k particles: strong visual, mobile-safe
const KEYFRAMES = 5;

function makeKeyframes(count: number): Float32Array[] {
  const rand = (seed: number) => {
    let s = seed;
    return () => {
      s = (s * 9301 + 49297) % 233280;
      return s / 233280;
    };
  };
  const r = rand(1337);

  const kfs: Float32Array[] = [];

  // 0 — Chaos: uniform cloud, wide, unstructured
  const chaos = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    chaos[i * 3] = (r() - 0.5) * 12;
    chaos[i * 3 + 1] = (r() - 0.5) * 7;
    chaos[i * 3 + 2] = (r() - 0.5) * 8;
  }
  kfs.push(chaos);

  // 1 — Documents: 6 floating rectangles (paper sheets)
  const docs = new Float32Array(count * 3);
  const sheets = 6;
  for (let i = 0; i < count; i++) {
    const s = i % sheets;
    const col = s % 3;
    const row = Math.floor(s / 3);
    const cx = (col - 1) * 3.4;
    const cy = (row - 0.5) * -3;
    docs[i * 3] = cx + (r() - 0.5) * 2.2;
    docs[i * 3 + 1] = cy + (r() - 0.5) * 3;
    docs[i * 3 + 2] = (r() - 0.5) * 0.6;
  }
  kfs.push(docs);

  // 2 — SOPs: 3 dense structured blocks, tighter alignment
  const sops = new Float32Array(count * 3);
  const blocks = 3;
  for (let i = 0; i < count; i++) {
    const b = i % blocks;
    const cx = (b - 1) * 4;
    const cy = ((i / blocks) % 40) / 40 - 0.5;
    const rowY = Math.floor((i / blocks) / 40) % 10;
    sops[i * 3] = cx + (r() - 0.5) * 1.6;
    sops[i * 3 + 1] = cy * 5 - rowY * 0.05 + (r() - 0.5) * 0.15;
    sops[i * 3 + 2] = (r() - 0.5) * 0.3;
  }
  kfs.push(sops);

  // 3 — Network: nodes on a sphere connected in a constellation
  const net = new Float32Array(count * 3);
  const nodeCount = 40;
  const nodes: [number, number, number][] = [];
  for (let n = 0; n < nodeCount; n++) {
    const theta = r() * Math.PI * 2;
    const phi = Math.acos(2 * r() - 1);
    const R = 3.2 + (r() - 0.5) * 0.3;
    nodes.push([
      R * Math.sin(phi) * Math.cos(theta),
      R * Math.sin(phi) * Math.sin(theta),
      R * Math.cos(phi),
    ]);
  }
  for (let i = 0; i < count; i++) {
    // Half on nodes, half on edges between random node pairs
    if (i % 2 === 0) {
      const [x, y, z] = nodes[i % nodeCount];
      net[i * 3] = x + (r() - 0.5) * 0.2;
      net[i * 3 + 1] = y + (r() - 0.5) * 0.2;
      net[i * 3 + 2] = z + (r() - 0.5) * 0.2;
    } else {
      const a = nodes[i % nodeCount];
      const b = nodes[(i + 7) % nodeCount];
      const t = r();
      net[i * 3] = a[0] + (b[0] - a[0]) * t;
      net[i * 3 + 1] = a[1] + (b[1] - a[1]) * t;
      net[i * 3 + 2] = a[2] + (b[2] - a[2]) * t;
    }
  }
  kfs.push(net);

  // 4 — Logo: particles form a filled "O" ring — the OPSQAI mark
  const logo = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const angle = r() * Math.PI * 2;
    const ringR = 2.4 + (r() - 0.5) * 0.55;
    logo[i * 3] = Math.cos(angle) * ringR;
    logo[i * 3 + 1] = Math.sin(angle) * ringR;
    logo[i * 3 + 2] = (r() - 0.5) * 0.15;
  }
  kfs.push(logo);

  return kfs;
}

interface ParticleGenesisProps {
  /** 0 = chaos, 1 = documents, 2 = sops, 3 = network, 4 = logo (accepts fractions). */
  progress?: number;
  /** Auto-advance when no external progress is driving. */
  autoPlay?: boolean;
  /** Seconds per full cycle when autoPlay. */
  cycleDuration?: number;
  color?: string;
  goldTint?: string;
  size?: number;
}

export function ParticleGenesis({
  progress,
  autoPlay = true,
  cycleDuration = 22,
  color = "#2dd4a8",
  goldTint = "#c9a84c",
  size = 0.03,
}: ParticleGenesisProps) {
  const geomRef = useRef<THREE.BufferGeometry | null>(null);
  const matRef = useRef<THREE.ShaderMaterial | null>(null);
  const timeRef = useRef(0);

  const { attributes, uniforms, vertex, fragment } = useMemo(() => {
    const kfs = makeKeyframes(COUNT);
    const attrs = kfs.map((k) => new THREE.BufferAttribute(k, 3));

    // per-particle random 0..1 for jitter, so morphs aren't perfectly synchronous
    const jitter = new Float32Array(COUNT);
    for (let i = 0; i < COUNT; i++) jitter[i] = Math.random();

    return {
      attributes: { kfs: attrs, jitter: new THREE.BufferAttribute(jitter, 1) },
      uniforms: {
        uProgress: { value: 0 },
        uTime: { value: 0 },
        uColor: { value: new THREE.Color(color) },
        uGold: { value: new THREE.Color(goldTint) },
        uSize: { value: size },
      },
      vertex: /* glsl */ `
        attribute vec3 kf0;
        attribute vec3 kf1;
        attribute vec3 kf2;
        attribute vec3 kf3;
        attribute vec3 kf4;
        attribute float jitter;

        uniform float uProgress;
        uniform float uTime;
        uniform float uSize;

        varying float vMix;

        vec3 sampleKF(float p) {
          float idx = floor(p);
          float f = fract(p);
          // Ease with staggered jitter so morph feels organic
          f = smoothstep(0.0, 1.0, clamp(f + (jitter - 0.5) * 0.15, 0.0, 1.0));
          vec3 a, b;
          if (idx < 0.5) { a = kf0; b = kf1; }
          else if (idx < 1.5) { a = kf1; b = kf2; }
          else if (idx < 2.5) { a = kf2; b = kf3; }
          else { a = kf3; b = kf4; }
          return mix(a, b, f);
        }

        void main() {
          vec3 pos = sampleKF(clamp(uProgress, 0.0, 4.0));
          // Gentle idle motion
          pos += 0.03 * vec3(
            sin(uTime * 0.3 + jitter * 6.28),
            cos(uTime * 0.25 + jitter * 12.56),
            sin(uTime * 0.2 + jitter * 3.14)
          );
          vec4 mv = modelViewMatrix * vec4(pos, 1.0);
          gl_Position = projectionMatrix * mv;
          gl_PointSize = uSize * (300.0 / -mv.z);
          vMix = jitter;
        }
      `,
      fragment: /* glsl */ `
        uniform vec3 uColor;
        uniform vec3 uGold;
        varying float vMix;
        void main() {
          vec2 c = gl_PointCoord - 0.5;
          float d = length(c);
          if (d > 0.5) discard;
          float a = smoothstep(0.5, 0.0, d);
          vec3 col = mix(uColor, uGold, smoothstep(0.6, 1.0, vMix));
          gl_FragColor = vec4(col, a * 0.9);
        }
      `,
    };
  }, [color, goldTint, size]);

  useFrame((_, delta) => {
    timeRef.current += delta;
    if (matRef.current) {
      matRef.current.uniforms.uTime.value = timeRef.current;
      const target =
        progress !== undefined
          ? progress
          : autoPlay
            ? ((timeRef.current % cycleDuration) / cycleDuration) * 4
            : 0;
      // Smooth follow for external progress
      const cur = matRef.current.uniforms.uProgress.value as number;
      matRef.current.uniforms.uProgress.value =
        progress !== undefined ? cur + (target - cur) * 0.06 : target;
    }
  });

  return (
    <points frustumCulled={false}>
      <bufferGeometry ref={geomRef}>
        <bufferAttribute
          attach="attributes-position"
          args={[attributes.kfs[0].array as Float32Array, 3]}
          count={COUNT}
          array={attributes.kfs[0].array as Float32Array}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-kf0"
          args={[attributes.kfs[0].array as Float32Array, 3]}
          count={COUNT}
          array={attributes.kfs[0].array as Float32Array}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-kf1"
          args={[attributes.kfs[1].array as Float32Array, 3]}
          count={COUNT}
          array={attributes.kfs[1].array as Float32Array}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-kf2"
          args={[attributes.kfs[2].array as Float32Array, 3]}
          count={COUNT}
          array={attributes.kfs[2].array as Float32Array}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-kf3"
          args={[attributes.kfs[3].array as Float32Array, 3]}
          count={COUNT}
          array={attributes.kfs[3].array as Float32Array}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-kf4"
          args={[attributes.kfs[KEYFRAMES - 1].array as Float32Array, 3]}
          count={COUNT}
          array={attributes.kfs[KEYFRAMES - 1].array as Float32Array}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-jitter"
          args={[attributes.jitter.array as Float32Array, 1]}
          count={COUNT}
          array={attributes.jitter.array as Float32Array}
          itemSize={1}
        />
      </bufferGeometry>
      <shaderMaterial
        ref={matRef}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        uniforms={uniforms}
        vertexShader={vertex}
        fragmentShader={fragment}
      />
    </points>
  );
}
