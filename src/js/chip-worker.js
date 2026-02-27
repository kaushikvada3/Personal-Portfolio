/**
 * chip-worker.js — runs entirely in a Web Worker.
 *
 * The main thread is NEVER blocked. The 104 MB FBX is fetched and parsed
 * here, off-thread. Geometry buffers are sent back as transferables (zero-copy).
 */

// Import Three.js directly from CDN — import maps don't apply to workers.
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { FBXLoader } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/loaders/FBXLoader.js';

self.onmessage = async ({ data }) => {
  if (data.type !== 'parse') return;

  try {
    // ── Streaming fetch with download progress ────────────────────────────
    const res = await fetch(data.url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const contentLength = parseInt(res.headers.get('Content-Length') || '0');
    const reader = res.body.getReader();
    const chunks = [];
    let received = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      received += value.byteLength;
      if (contentLength > 0) {
        self.postMessage({
          type: 'progress',
          pct: Math.round(received / contentLength * 100),
        });
      }
    }

    // Assemble chunks into a single ArrayBuffer
    const raw = new Uint8Array(received);
    let offset = 0;
    for (const chunk of chunks) { raw.set(chunk, offset); offset += chunk.byteLength; }

    // ── Parse FBX (synchronous — but we're on a worker, main stays free) ──
    const root = new FBXLoader().parse(raw.buffer, '');

    // ── Normalize: scale & center the whole hierarchy ─────────────────────
    const box    = new THREE.Box3().setFromObject(root);
    const center = box.getCenter(new THREE.Vector3());
    const size   = box.getSize(new THREE.Vector3());
    const s      = 3 / Math.max(size.x, size.y, size.z);
    root.scale.setScalar(s);
    root.position.set(-center.x * s, -center.y * s, -center.z * s);
    root.updateMatrixWorld(true);

    // ── Extract geometry as transferable buffers (zero-copy to main) ──────
    const meshes    = [];
    const transfers = [];

    root.traverse((child) => {
      if (!child.isMesh || !child.geometry) return;
      const geo = child.geometry;

      const pa  = geo.attributes.position;
      const na  = geo.attributes.normal;
      const ia  = geo.index;
      if (!pa) return;

      const pos   = new Float32Array(pa.array);
      const nor   = na ? new Float32Array(na.array) : null;
      const isU32 = ia ? ia.array instanceof Uint32Array : false;
      const idx   = ia ? (isU32 ? new Uint32Array(ia.array) : new Uint16Array(ia.array)) : null;

      meshes.push({
        name:   child.name || '',
        matrix: Array.from(child.matrixWorld.elements),
        pos:    pos.buffer,
        nor:    nor?.buffer ?? null,
        idx:    idx?.buffer ?? null,
        idxU32: isU32,
      });

      transfers.push(pos.buffer);
      if (nor) transfers.push(nor.buffer);
      if (idx) transfers.push(idx.buffer);
    });

    self.postMessage({ type: 'done', meshes }, transfers);

  } catch (err) {
    self.postMessage({ type: 'error', message: String(err) });
  }
};
