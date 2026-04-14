import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

export class SceneManager {
  constructor(canvas, gpuProfile) {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x121920);

    this.camera = new THREE.PerspectiveCamera(
      45, window.innerWidth / window.innerHeight, 0.01, 200
    );
    this.camera.position.set(10.2, 3.6, -0.9);

    this._gpu = gpuProfile || null;
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: gpuProfile ? gpuProfile.antialias : true,
      powerPreference: 'high-performance',
      stencil: false,
      depth: true,
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this._applyPixelRatio();
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.34;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type =
      gpuProfile && gpuProfile.shadowMapType ? gpuProfile.shadowMapType : THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    const environmentScene = new RoomEnvironment(this.renderer);
    this.environmentTarget = pmremGenerator.fromScene(environmentScene, 0.06);
    this.scene.environment = this.environmentTarget.texture;
    environmentScene.dispose();
    pmremGenerator.dispose();

    this.cameraTarget = new THREE.Vector3(2.6, 0.02, 0);

    window.addEventListener('resize', () => this._onResize());
  }

  _applyPixelRatio() {
    const dpr = window.devicePixelRatio || 1;
    const cap = this._gpu?.pixelRatioCap ?? 1.35;
    this.renderer.setPixelRatio(Math.min(dpr, cap));
  }

  _onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this._applyPixelRatio();
  }

  warmup() {
    this._lookAt = this._lookAt || new THREE.Vector3();
    this._lookAt.copy(this.cameraTarget);
    this.camera.lookAt(this._lookAt);
    // Compile current materials/programs while loading UI is still on-screen.
    this.renderer.compile(this.scene, this.camera);
    this.renderer.render(this.scene, this.camera);
  }

  render(px = 0, py = 0) {
    // Create temp target with parallax offset — never mutate cameraTarget
    this._lookAt = this._lookAt || new THREE.Vector3();
    this._lookAt.copy(this.cameraTarget);
    this._lookAt.x += px;
    this._lookAt.y += py;
    this.camera.lookAt(this._lookAt);
    this.renderer.render(this.scene, this.camera);
  }
}
