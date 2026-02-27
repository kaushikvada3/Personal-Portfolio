import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';

const LAYER_COLORS = [
  0x4fc3f7, 0xba68c8, 0x4db6ac, 0xff8a65,
  0x7986cb, 0xaed581, 0xf06292, 0xffd54f,
  0x90a4ae, 0xe0e0e0,
];

function applyLayerColors(object) {
  let idx = 0;
  object.traverse((child) => {
    if (!child.isMesh) return;
    const name = (child.name || '').toLowerCase();
    const c = new THREE.Color(LAYER_COLORS[idx % LAYER_COLORS.length]);
    if      (name.includes('via')  || name.includes('contact'))                              c.set(0xf06292);
    else if (name.includes('pad')  || name.includes('bond'))                                 c.set(0xffd54f);
    else if (name.includes('sub')  || name.includes('bulk')  || name.includes('die'))        c.set(0x546e7a);
    else if (name.includes('m1')   || name.includes('metal1')  || name.includes('metal_1')) c.set(0x4fc3f7);
    else if (name.includes('m2')   || name.includes('metal2')  || name.includes('metal_2')) c.set(0xba68c8);
    else if (name.includes('m3')   || name.includes('metal3')  || name.includes('metal_3')) c.set(0x4db6ac);
    else if (name.includes('m4')   || name.includes('metal4')  || name.includes('metal_4')) c.set(0xff8a65);
    child.material = new THREE.MeshPhongMaterial({
      color: c, shininess: 60, specular: new THREE.Color(0x333333),
      side: THREE.DoubleSide, flatShading: false,
    });
    idx++;
  });
}

// ── Background preload ────────────────────────────────────────────────────────
// Phase 1 (non-blocking):  fetch() downloads the file in the network stack.
//                          The main thread is 100% free — scroll, animate, etc.
// Phase 2 (idle-deferred): FBXLoader.parse() is CPU-heavy and synchronous.
//                          We schedule it via requestIdleCallback so it only
//                          runs when the browser has nothing else to do.
// Result: by the time the user scrolls down and clicks the card, the model is
//         already parsed and cached — modal open is instant.

let _model   = null;   // ready Three.js Group
let _loading = true;
let _waiters = [];     // callbacks queued while model is in-flight

function _parseBuffer(buffer) {
  try {
    const raw = new FBXLoader().parse(buffer, '');

    const box    = new THREE.Box3().setFromObject(raw);
    const center = box.getCenter(new THREE.Vector3());
    const size   = box.getSize(new THREE.Vector3());
    const s      = 3 / Math.max(size.x, size.y, size.z);
    raw.scale.setScalar(s);
    raw.position.set(-center.x * s, -center.y * s, -center.z * s);
    applyLayerColors(raw);

    _model   = raw;
    _loading = false;
    _waiters.forEach(fn => fn(_model, null));
    _waiters = [];
  } catch (err) {
    console.error('[ChipViewer] parse error:', err);
    _loading = false;
    _waiters.forEach(fn => fn(null, err));
    _waiters = [];
  }
}

// Start the moment this module is evaluated — but the network fetch
// never blocks the main thread (it's a background job in the browser).
(function startPreload() {
  fetch('Final Chip.fbx')
    .then(r => r.arrayBuffer())
    .then(buffer => {
      // Defer the synchronous CPU parse to a browser-idle slot.
      // timeout:8000 means "run it by 8s even if the browser is never idle"
      // so it's always ready before a typical user reaches the projects section.
      if ('requestIdleCallback' in window) {
        requestIdleCallback(() => _parseBuffer(buffer), { timeout: 8000 });
      } else {
        // Safari fallback: yield one tick so the page paints, then parse
        setTimeout(() => _parseBuffer(buffer), 100);
      }
    })
    .catch(err => {
      console.error('[ChipViewer] fetch error:', err);
      _loading = false;
      _waiters.forEach(fn => fn(null, err));
      _waiters = [];
    });
})();

// ── ChipViewer class ─────────────────────────────────────────────────────────

class ChipViewer {
  constructor() { this._clear(); }

  _clear() {
    this.scene = this.camera = this.renderer =
    this.controls = this._rafId = this._onResize = this._onVis = null;
  }

  init(container) {
    if (!container) return;

    const mobile = window.matchMedia('(max-width: 768px)').matches ||
                   ('ontouchstart' in window && window.innerWidth < 1024);
    const dpr = mobile ? 1 : Math.min(window.devicePixelRatio, 1.5);

    // Scene
    this.scene = new THREE.Scene();

    // Camera — elevated 3/4 top-right view matching target screenshot
    const w = container.clientWidth, h = container.clientHeight;
    this.camera = new THREE.PerspectiveCamera(38, w / h, 0.01, 500);
    this.camera.position.set(2.0, 3.0, 2.8);

    // Renderer — mobile gets lighter settings
    this.renderer = new THREE.WebGLRenderer({
      antialias: !mobile,
      alpha: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(w, h);
    this.renderer.setPixelRatio(dpr);
    this.renderer.toneMapping      = THREE.NoToneMapping;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(this.renderer.domElement);

    // Controls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping   = true;
    this.controls.dampingFactor   = 0.08;
    this.controls.autoRotate      = true;
    this.controls.autoRotateSpeed = 0.6;
    this.controls.enablePan       = !mobile;
    this.controls.minDistance     = 0.5;
    this.controls.maxDistance     = 15;
    this.controls.target.set(0, 0, 0);
    this.controls.update();

    this.renderer.domElement.addEventListener('pointerdown', () => {
      if (this.controls) this.controls.autoRotate = false;
    });
    this.renderer.domElement.addEventListener('pointerup', () => {
      setTimeout(() => { if (this.controls) this.controls.autoRotate = true; }, 2500);
    });

    // Lighting
    const key  = new THREE.DirectionalLight(0xffffff, 3.0); key.position.set(4, 8, 5);
    const fill = new THREE.DirectionalLight(0x88aaff, 1.5); fill.position.set(-5, 5, -3);
    const back = new THREE.DirectionalLight(0xffffff, 1.0); back.position.set(0, 3, -6);
    const bot  = new THREE.DirectionalLight(0x6688cc, 0.6); bot.position.set(0, -5, 0);
    this.scene.add(new THREE.AmbientLight(0xffffff, 1.8), key, fill, back, bot);

    // Attach model
    const loadingEl = container.querySelector('.chip-loading');

    const attach = (model, err) => {
      if (!this.scene) return; // viewer disposed before model arrived
      if (err || !model) {
        if (loadingEl) { loadingEl.textContent = 'Could not load model'; loadingEl.style.color = '#f87171'; }
        return;
      }
      this.scene.add(model);
      this.controls?.update();
      if (loadingEl) loadingEl.style.display = 'none';
    };

    if (!_loading && _model) {
      attach(_model, null); // already cached — instant
    } else {
      _waiters.push(attach); // queue until parse finishes
    }

    // Pause rendering when browser tab is hidden
    this._onVis = () => {
      if (document.hidden) this._stopRender();
      else                 this._startRender();
    };
    document.addEventListener('visibilitychange', this._onVis);

    this._onResize = () => {
      if (!this.camera || !this.renderer) return;
      const cw = container.clientWidth, ch = container.clientHeight;
      this.camera.aspect = cw / ch;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(cw, ch);
    };
    window.addEventListener('resize', this._onResize);

    this._startRender();
  }

  _startRender() {
    if (this._rafId || !this.renderer) return;
    const tick = () => {
      if (!this.renderer) return;
      this.controls?.update();
      this.renderer.render(this.scene, this.camera);
      this._rafId = requestAnimationFrame(tick);
    };
    this._rafId = requestAnimationFrame(tick);
  }

  _stopRender() {
    if (this._rafId) { cancelAnimationFrame(this._rafId); this._rafId = null; }
  }

  dispose() {
    this._stopRender();
    if (this._onVis)    document.removeEventListener('visibilitychange', this._onVis);
    if (this._onResize) window.removeEventListener('resize', this._onResize);
    if (this.controls)  this.controls.dispose();

    // Detach cached model from scene without destroying it
    // (it stays in _model for the next open)
    if (this.scene && _model) this.scene.remove(_model);

    if (this.renderer) {
      this.renderer.dispose();
      this.renderer.domElement?.remove();
    }

    // Flush any pending waiters (safe — attach checks this.scene)
    _waiters = [];
    this._clear();
  }
}

window.ChipViewer = new ChipViewer();
