import { EffectComposer, Bloom, Vignette } from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";

interface GoldBloomProps {
  intensity?: number;
  luminanceThreshold?: number;
  vignette?: boolean;
}

/**
 * Post-processing preset for OIX scenes: emerald/gold bloom + soft vignette.
 */
export function GoldBloom({
  intensity = 0.9,
  luminanceThreshold = 0.35,
  vignette = true,
}: GoldBloomProps) {
  return (
    <EffectComposer>
      <Bloom
        intensity={intensity}
        luminanceThreshold={luminanceThreshold}
        luminanceSmoothing={0.4}
        mipmapBlur
      />
      {vignette ? (
        <Vignette eskil={false} offset={0.2} darkness={0.7} blendFunction={BlendFunction.NORMAL} />
      ) : (
        // EffectComposer children can't be false; render a no-op vignette when disabled
        <Vignette offset={0} darkness={0} />
      )}
    </EffectComposer>
  );
}
