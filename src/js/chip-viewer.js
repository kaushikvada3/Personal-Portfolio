import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';

const LAYER_COLORS = [
  0x4fc3f7, // M1  — sky blue
  0xba68c8, // M2  — purple
  0x4db6ac, // M3  — teal
  0xff8a65, // M4  — coral
  0x7986cb, // M5  — indigo
  0xaed581, // M6  — lime
  0xf06292, // Via — pink
  0xffd54f, // Pad — gold
  0x90a4ae, // Sub — steel
  0xe0e0e0, // Bnd — silver
];

// ── Module-level model cache ─────────────────────────────────────────────────
// The model is processed exactly once and kept alive so re-opening the modal
// costs zero download time and zero parse time.
let _model    = null;  // THREE.Group — ready to add to any scene
let _loading  = true;
let _progress = 0;     // 0–100, tracked even before the modal exists
let _waiters  = [];    // { attach, loadingEl } queued while model is in flight

function applyLayerColors(object) {
  let idx = 0;
  object.traverse((child) => {
    if (!child.isMesh) return;
    const name = (child.name || '').toLowerCase();
    const base = new THREE.Color(LAYER_COLORS[idx % LAYER_COLORS.length]);

    if      (name.includes('via')  || name.includes('contact'))                    base.set(0xf06292);
    else if (name.includes('pad')  || name.includes('bond'))                       base.set(0xffd54f);
    else if (name.includes('sub')  || name.includes('bulk') || name.includes('die')) base.set(0x546e7a);
    else if (name.includes('m1')   || name.includes('metal1')  || name.includes('metal_1')) base.set(0x4fc3f7);
    else if (name.includes('m2')   || name.includes('metal2')  || name.includes('metal_2')) base.set(0xba68c8);
    else if (name.includes('m3')   || name.includes('metal3')  || name.includes('metal_3')) base.set(0x4db6ac);
    else if (name.includes('m4')   || name.includes('metal4')  || name.includes('metal_4')) base.set(0xff8a65);

    const mat = new THREE.MeshPhongMaterial({
      color:     base,
      shininess: 80,
      specular:  new THREE.Color(0x444444),
      side:      THREE.DoubleSide,
      flatShading: false,
    });
    child.material = Array.isArray(child.material) ? child.material.map(() => mat) : mat;
    idx++;
  });
}

// ── Kick off the FBX download the instant this module is evaluated ───────────
// This runs as soon as the browser parses the <script type="module"> tag,
// long before the user can scroll down and click the project card.
(function preload() {
  new FBXLoader().load(
    'Final Chip.fbx',

    // onLoad — process once, cache forever
    (raw) => {
      const box    = new THREE.Box3().setFromObject(raw);
      const center = box.getCenter(new THREE.Vector3());
      const size   = box.getSize(new THREE.Vector3());
      const s      = 3 / Math.max(size.x, size.y, size.z);
      raw.scale.setScalar(s);
      raw.position.set(-center.x * s, -center.y * s, -center.z * s);
      applyLayerColors(raw);

      _model   = raw;
      _loading = false;
      _progress = 100;

      // Resolve any modals that opened while we were loading
      _waiters.forEach(({ attach }) => attach(_model));
      _waiters = [];
    },

    // onProgress — update loading text even before the modal exists
    (prog) => {
      if (prog.total > 0) {
        _progress = Math.round((prog.loaded / prog.total) * 100);
        // If the modal is open and still showing the loading indicator, update it
        document.querySelectorAll('.chip-loading').forEach((el) => {
          if (el.style.display !== 'none') el.textContent = `Loading… ${_progress}%`;
        });
      }
    },

    // onError
    (err) => {
      console.error('[ChipViewer] preload failed:', err);
      _loading = false;
      _waiters.forEach(({ attach, loadingEl }) => {
        if (loadingEl) { loadingEl.textContent = 'Could not load 3D model'; loadingEl.style.color = '#f87171'; }
      });
      _waiters = [];
    }
  );
})();
// ────────────────────────────────────────────────────────────────────────────

class ChipViewer {
  constructor() { this._clear(); }

  _clear() {
    this.scene = this.camera = this.renderer =
    this.controls = this.animationId = this._onResize = null;
  }

  init(container) {
    if (!container) return;

    // ── Scene ────────────────────────────────────────────────────────────
    this.scene = new THREE.Scene();

    // ── Camera — matches the screenshot: elevated 40° 3/4 top-right view ─
    const w = container.clientWidth, h = container.clientHeight;
    this.camera = new THREE.PerspectiveCamera(38, w / h, 0.01, 500);
    this.camera.position.set(2.0, 3.0, 2.8);   // ~41° elevation, ~35° azimuth

    // ── Renderer ─────────────────────────────────────────────────────────
    this.renderer = new THREE.WebGLRenderer({
      // On high-DPI screens the native resolution already does implicit MSAA,
      // so antialias is only worth enabling on lo-DPI (1× pixel ratio) devices.
      antialias:       window.devicePixelRatio < 2,
      alpha:           true,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(w, h);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    this.renderer.toneMapping      = THREE.NoToneMapping;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(this.renderer.domElement);

    // ── Controls ─────────────────────────────────────────────────────────
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping   = true;
    this.controls.dampingFactor   = 0.07;
    this.controls.autoRotate      = true;
    this.controls.autoRotateSpeed = 0.8;   // slow, cinematic
    this.controls.enablePan       = true;
    this.controls.minDistance     = 0.5;
    this.controls.maxDistance     = 15;
    this.controls.target.set(0, 0, 0);
    this.controls.update();

    // Pause rotation on grab, resume after 2.5 s of inactivity
    this.renderer.domElement.addEventListener('pointerdown', () => {
      if (this.controls) this.controls.autoRotate = false;
    });
    this.renderer.domElement.addEventListener('pointerup', () => {
      setTimeout(() => { if (this.controls) this.controls.autoRotate = true; }, 2500);
    });

    // ── Lighting ─────────────────────────────────────────────────────────
    const key  = new THREE.DirectionalLight(0xffffff, 3.0); key.position.set(4, 8, 5);
    const fill = new THREE.DirectionalLight(0x88aaff, 1.5); fill.position.set(-5, 5, -3);
    const back = new THREE.DirectionalLight(0xffffff, 1.0); back.position.set(0, 3, -6);
    const bot  = new THREE.DirectionalLight(0x6688cc, 0.6); bot.position.set(0, -5, 0);
    this.scene.add(new THREE.AmbientLight(0xffffff, 1.8), key, fill, back, bot);

    // ── Attach model ─────────────────────────────────────────────────────
    const loadingEl = container.querySelector('.chip-loading');

    const attach = (model) => {
      // Guard: if the viewer was disposed before the model arrived, bail out
      if (!this.scene) return;
      this.scene.add(model);
      this.controls?.update();
      if (loadingEl) loadingEl.style.display = 'none';
    };

    if (!_loading && _model) {
      // Model already in memory — instant
      attach(_model);
    } else {
      // Still downloading — show live progress and queue the attach
      if (loadingEl && _progress > 0) loadingEl.textContent = `Loading… ${_progress}%`;
      _waiters.push({ attach, loadingEl });
    }

    // ── Resize handler ───────────────────────────────────────────────────
    this._onResize = () => {
      if (!this.camera || !this.renderer) return;
      const cw = container.clientWidth, ch = container.clientHeight;
      this.camera.aspect = cw / ch;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(cw, ch);
    };
    window.addEventListener('resize', this._onResize);

    this.animate();
  }

  animate() {
    this.animationId = requestAnimationFrame(() => this.animate());
    this.controls?.update();
    if (this.renderer && this.scene && this.camera)
      this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    if (this.animationId) cancelAnimationFrame(this.animationId);
    if (this._onResize)   window.removeEventListener('resize', this._onResize);
    if (this.controls)    this.controls.dispose();

    // Detach the cached model from our scene without destroying it —
    // geometry and materials stay alive for the next open.
    if (this.scene && _model) this.scene.remove(_model);

    // Release GPU resources for this renderer instance
    if (this.renderer) {
      this.renderer.dispose();
      this.renderer.domElement?.remove();
    }

    // Remove any pending waiters that belong to this (closing) instance
    _waiters = _waiters.filter(({ attach }) => {
      // The closure captures `this.scene`; after _clear() it'll be null,
      // but clean removal is safer.
      return false; // flush all — there's only ever one viewer at a time
    });

    this._clear();
  }
}

window.ChipViewer = new ChipViewer();
