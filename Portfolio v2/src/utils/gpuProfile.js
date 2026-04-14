import * as THREE from 'three';

/**
 * Conservative defaults so the Three.js scene stays smooth on phones, old laptops,
 * and save-data / low-memory environments.
 */
export function getGpuProfile() {
  if (typeof window === 'undefined') {
    return makeProfile('high', 1, 1920, 1080);
  }

  const w = window.innerWidth;
  const h = window.innerHeight;
  const dpr = window.devicePixelRatio || 1;
  const cores = navigator.hardwareConcurrency || 4;
  const mem = navigator.deviceMemory;
  const ua = navigator.userAgent || '';
  const mobile = /Android|iPhone|iPad|iPod|Mobile/i.test(ua);
  const saveData = navigator.connection && navigator.connection.saveData === true;
  const reducedMotion =
    window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let tier = 'medium';
  if (
    mobile ||
    saveData ||
    reducedMotion ||
    w < 480 ||
    (mem != null && mem <= 4 && w < 900) ||
    (cores <= 4 && w < 720)
  ) {
    tier = 'low';
  } else if (w >= 1440 && cores >= 8 && (mem == null || mem >= 8) && !mobile) {
    tier = 'high';
  }

  return makeProfile(tier, dpr, w, h);
}

function makeProfile(tier, dpr = 1, w = 1280, h = 800) {
  const aspect = w / Math.max(1, h);

  const table = {
    low: {
      pixelRatioCap: 1,
      antialias: false,
      shadowMapType: THREE.BasicShadowMap,
      shadowMapSize: 512,
      proceduralTextureSize: 256,
      ceramicTextureSize: 256,
      ballSegments: 8,
      roundedSeg: 2,
      deriveMapSize: 384,
      engravingCanvas: 1024,
    },
    medium: {
      pixelRatioCap: Math.min(dpr, aspect > 2 ? 1.2 : 1.28),
      antialias: true,
      shadowMapType: THREE.PCFSoftShadowMap,
      shadowMapSize: 1024,
      proceduralTextureSize: 384,
      ceramicTextureSize: 320,
      ballSegments: 12,
      roundedSeg: 3,
      deriveMapSize: 512,
      engravingCanvas: 1536,
    },
    high: {
      pixelRatioCap: Math.min(dpr, 1.45),
      antialias: true,
      shadowMapType: THREE.PCFSoftShadowMap,
      shadowMapSize: 2048,
      proceduralTextureSize: 512,
      ceramicTextureSize: 384,
      ballSegments: 12,
      roundedSeg: 4,
      deriveMapSize: 768,
      engravingCanvas: 2048,
    },
  };

  const t = table[tier] || table.medium;
  return {
    tier,
    ...t,
  };
}
