import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';

// Layer color palette — distinct colors for chip layers/vias
const LAYER_COLORS = [
  0x4fc3f7, // M1 — sky blue
  0xba68c8, // M2 — purple
  0x4db6ac, // M3 — teal
  0xff8a65, // M4 — coral/orange
  0x7986cb, // M5 — indigo
  0xaed581, // M6 — lime
  0xf06292, // Via — pink
  0xffd54f, // Pad — gold
  0x90a4ae, // Substrate — steel
  0xe0e0e0, // Bond wire — silver
];

class ChipViewer {
  constructor() {
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;
    this.animationId = null;
    this.model = null;
    this._onResize = null;
  }

  init(container) {
    if (!container) return;

    this.scene = new THREE.Scene();

    // Camera — tight FOV, close-up
    const aspect = container.clientWidth / container.clientHeight;
    this.camera = new THREE.PerspectiveCamera(35, aspect, 0.01, 500);
    this.camera.position.set(2.5, 2, 3.5);

    // Renderer — performance first, no shadows
    this.renderer = new THREE.WebGLRenderer({
      antialias: false,
      alpha: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    this.renderer.toneMapping = THREE.NoToneMapping;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(this.renderer.domElement);

    // Controls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.autoRotate = true;
    this.controls.autoRotateSpeed = 1.5;
    this.controls.enablePan = true;
    this.controls.minDistance = 0.5;
    this.controls.maxDistance = 15;
    this.controls.target.set(0, 0, 0);

    // Pause auto-rotate on interaction, resume after 2s
    this.renderer.domElement.addEventListener('pointerdown', () => {
      this.controls.autoRotate = false;
    });
    this.renderer.domElement.addEventListener('pointerup', () => {
      setTimeout(() => { if (this.controls) this.controls.autoRotate = true; }, 2000);
    });

    // Lighting — bright and even, no shadows
    this.scene.add(new THREE.AmbientLight(0xffffff, 1.8));

    const key = new THREE.DirectionalLight(0xffffff, 3.0);
    key.position.set(4, 8, 5);
    this.scene.add(key);

    const fill = new THREE.DirectionalLight(0x88aaff, 1.5);
    fill.position.set(-5, 5, -3);
    this.scene.add(fill);

    const back = new THREE.DirectionalLight(0xffffff, 1.0);
    back.position.set(0, 3, -6);
    this.scene.add(back);

    const bottom = new THREE.DirectionalLight(0x6688cc, 0.6);
    bottom.position.set(0, -5, 0);
    this.scene.add(bottom);

    this.loadModel(container);

    this._onResize = () => this.onResize(container);
    window.addEventListener('resize', this._onResize);

    this.animate();
  }

  loadModel(container) {
    const loader = new FBXLoader();
    const loadingEl = container.querySelector('.chip-loading');

    loader.load(
      'Final Chip.fbx',
      (object) => {
        const box = new THREE.Box3().setFromObject(object);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const scale = 3 / maxDim;

        object.scale.setScalar(scale);
        object.position.set(-center.x * scale, -center.y * scale, -center.z * scale);

        // Assign distinct layer colors to each mesh
        let meshIndex = 0;
        object.traverse((child) => {
          if (child.isMesh) {
            const color = new THREE.Color(LAYER_COLORS[meshIndex % LAYER_COLORS.length]);
            const name = (child.name || '').toLowerCase();

            // Try to match names to sensible colors
            let assignedColor = color;
            if (name.includes('via') || name.includes('contact'))
              assignedColor = new THREE.Color(0xf06292);
            else if (name.includes('pad') || name.includes('bond'))
              assignedColor = new THREE.Color(0xffd54f);
            else if (name.includes('sub') || name.includes('bulk') || name.includes('die'))
              assignedColor = new THREE.Color(0x546e7a);
            else if (name.includes('m1') || name.includes('metal1') || name.includes('metal_1'))
              assignedColor = new THREE.Color(0x4fc3f7);
            else if (name.includes('m2') || name.includes('metal2') || name.includes('metal_2'))
              assignedColor = new THREE.Color(0xba68c8);
            else if (name.includes('m3') || name.includes('metal3') || name.includes('metal_3'))
              assignedColor = new THREE.Color(0x4db6ac);
            else if (name.includes('m4') || name.includes('metal4') || name.includes('metal_4'))
              assignedColor = new THREE.Color(0xff8a65);

            const mat = new THREE.MeshPhongMaterial({
              color: assignedColor,
              shininess: 80,
              specular: new THREE.Color(0x444444),
              side: THREE.DoubleSide,
              flatShading: false,
            });

            if (Array.isArray(child.material)) {
              child.material = child.material.map(() => mat);
            } else {
              child.material = mat;
            }

            meshIndex++;
          }
        });

        this.model = object;
        this.scene.add(object);

        // Camera — zoomed in, slight angle
        this.camera.position.set(2, 1.6, 2.8);
        this.controls.target.set(0, 0, 0);
        this.controls.update();

        if (loadingEl) loadingEl.style.display = 'none';
      },
      (progress) => {
        if (loadingEl && progress.total > 0) {
          const pct = Math.round((progress.loaded / progress.total) * 100);
          loadingEl.textContent = `Loading... ${pct}%`;
        }
      },
      (error) => {
        console.error('FBX load error:', error);
        if (loadingEl) {
          loadingEl.textContent = 'Could not load 3D model';
          loadingEl.style.color = '#f87171';
        }
      }
    );
  }

  animate() {
    this.animationId = requestAnimationFrame(() => this.animate());
    if (this.controls) this.controls.update();
    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
  }

  onResize(container) {
    if (!this.camera || !this.renderer || !container) return;
    const w = container.clientWidth;
    const h = container.clientHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  dispose() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    if (this._onResize) {
      window.removeEventListener('resize', this._onResize);
      this._onResize = null;
    }
    if (this.controls) {
      this.controls.dispose();
      this.controls = null;
    }
    if (this.renderer) {
      this.renderer.dispose();
      if (this.renderer.domElement && this.renderer.domElement.parentNode)
        this.renderer.domElement.remove();
      this.renderer = null;
    }
    if (this.scene) {
      this.scene.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
          mats.forEach(m => m.dispose());
        }
      });
      this.scene = null;
    }
    this.camera = null;
    this.model = null;
  }
}

window.ChipViewer = new ChipViewer();
