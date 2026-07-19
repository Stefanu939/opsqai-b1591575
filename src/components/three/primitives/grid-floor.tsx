import { useMemo } from "react";
import * as THREE from "three";

interface GridFloorProps {
  size?: number;
  divisions?: number;
  y?: number;
  color?: string;
  opacity?: number;
}

/**
 * Emerald grid floor. Fades to transparent at the edges via shader.
 */
export function GridFloor({
  size = 60,
  divisions = 60,
  y = -2.5,
  color = "#0d7a5f",
  opacity = 0.4,
}: GridFloorProps) {
  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: {
        uColor: { value: new THREE.Color(color) },
        uOpacity: { value: opacity },
      },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        varying vec2 vUv;
        uniform vec3 uColor;
        uniform float uOpacity;
        void main() {
          float d = distance(vUv, vec2(0.5));
          float fade = smoothstep(0.55, 0.15, d);
          gl_FragColor = vec4(uColor, fade * uOpacity);
        }
      `,
    });
  }, [color, opacity]);

  return (
    <group position={[0, y, 0]}>
      <primitive object={new THREE.GridHelper(size, divisions, color, color)} />
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[size, size]} />
        <primitive object={material} attach="material" />
      </mesh>
    </group>
  );
}
