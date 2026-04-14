import * as THREE from 'three';

/**
 * PerspectiveCamera vertical FOV is fixed while aspect changes — on narrower
 * laptop viewports (e.g. 16:10 vs 16:9) the scene can feel too "zoomed".
 * Boost FOV and dolly the contact camera slightly when aspect < 16:9 reference.
 */
export function getViewportFraming() {
  const w = Math.max(200, window.innerWidth);
  const h = Math.max(200, window.innerHeight);
  const aspect = w / h;
  const refAspect = 16 / 9;
  const narrow = Math.max(0, refAspect - aspect);
  const fovBoost = THREE.MathUtils.clamp(narrow * 18, 0, 14);
  const zBack = 1 + 0.1 * THREE.MathUtils.clamp(narrow * 2.2, 0, 1);

  return {
    /** Contact / iPhone stage */
    contactFov: THREE.MathUtils.clamp(27 + fovBoost, 27, 42),
    contactCam: {
      x: -0.5,
      y: 12.5,
      z: 6.6 * zBack,
    },
    contactTarget: { x: 0.5, y: 0.3, z: 0 },
    /** Projects die-zoom stage */
    projFov: THREE.MathUtils.clamp(15 + fovBoost * 0.55, 15, 24),
    /** End of hero → experience sweep */
    heroEndFov: THREE.MathUtils.clamp(42 + fovBoost * 0.35, 42, 48),
  };
}
