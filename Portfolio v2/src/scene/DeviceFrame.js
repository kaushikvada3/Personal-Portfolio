import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

/**
 * iPhone-style device frame with Apple M1-style diffused chip glow.
 * 3-phase animation: x-ray → chip snap + glow → solidify
 */
export class DeviceFrame {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.group.visible = false;

    // Abstract GSAP matrices
    this.materials = [];
    this.solidState = [];

    // Global wireframe shader to hook into every child node natively!
    this.edgesMat = new THREE.LineBasicMaterial({
      color: 0x8a8d91,
      transparent: true,
      opacity: 0,
    });

    // ── Apple M1-style diffused glow behind chip ──
    this._createAppleGlow();

    this.group.position.y = 0;
    scene.add(this.group);
  }

  async load() {
    return new Promise((resolve, reject) => {
      const loader = new GLTFLoader();
      loader.load(
        '/iPhone Air Simple.glb',
        (gltf) => {
          const model = gltf.scene;

          // 1) First, capture the pure naked metric limits of the raw model geometry dynamically
          const rawBbox = new THREE.Box3().setFromObject(model);
          const rawSize = new THREE.Vector3();
          rawBbox.getSize(rawSize);

          // Find the absolute largest structural dimension natively exported from Blender (usually height or length)
          const targetDepth = 5.36; // Strict bounding depth of an iPhone
          const maxDim = Math.max(rawSize.x, rawSize.y, rawSize.z);
          // Natively scale it so its largest axis precisely constraints to exactly 5.36, ensuring stability natively
          const scaleFactor = maxDim > 0 ? (targetDepth / maxDim) : 1;
          model.scale.set(scaleFactor, scaleFactor, scaleFactor);
          model.updateMatrixWorld(true);

          // 2) Autonomously deduce spatial logic off post-scaled vectors!
          const sBbox = new THREE.Box3().setFromObject(model);
          const sSize = new THREE.Vector3();
          sBbox.getSize(sSize);

          // Mechanically autorotate the phone flat to match the GSAP timeline strictly
          if (sSize.y > sSize.z && sSize.y > sSize.x) {
            // It's standing up vertically (Y), pitch it down on its metallic spine natively onto Z!
            model.rotation.x = -Math.PI / 2;
          } else if (sSize.x > sSize.z && sSize.x > sSize.y) {
            // It's lying horizontally on its structural X side, yaw it 90 degrees back into the Z track natively!
            model.rotation.y = -Math.PI / 2;
          }
          model.updateMatrixWorld(true);

          // 3) Final bounding pass to definitively lock its absolute structural offset statically to universal origin
          const finalBbox = new THREE.Box3().setFromObject(model);
          const center = new THREE.Vector3();
          finalBbox.getCenter(center);

          // Neutralize all bizarre custom Blender spatial coordinates securely mapping the body back dynamically
          model.position.sub(center);
          model.updateMatrixWorld(true);

          // Re-measure absolute limits mapping into final state mathematically
          const restingBbox = new THREE.Box3().setFromObject(model);
          
          model.traverse((child) => {
            if (child.isMesh) {
              child.castShadow = true;
              child.receiveShadow = true;

              const origMat = child.material;
              this.solidState.push({
                opacity: 1.0,
                metalness: origMat.metalness !== undefined ? origMat.metalness : 0.8,
                roughness: origMat.roughness !== undefined ? origMat.roughness : 0.2,
              });

              child.material = origMat.clone();
              child.material.transparent = true;
              child.material.opacity = 0; 
              
              this.materials.push(child.material);

              if (child.geometry) {
                const edgesGeo = new THREE.EdgesGeometry(child.geometry);
                const wireframe = new THREE.LineSegments(edgesGeo, this.edgesMat);
                child.add(wireframe);
              }
            }
          });

          this.group.add(model);
          
          // Natively glue the M1 SDF glow identically floating over the absolute highest vertex (Y-max)
          this.glowMesh.position.y = restingBbox.max.y + 0.05;

          resolve(model);
        },
        undefined,
        (error) => {
          console.error("GSAP DeviceFrame -> GLTF Payload failed:", error);
          reject(error);
        }
      );
    });
  }

  _createAppleGlow() {
    // Large soft glow plane behind the chip — Apple M1 aesthetic
    // Soft color zones: blue (top-right), purple (bottom-right),
    // pink/magenta (bottom-left), orange/warm (top-left)
    const glowMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      uniforms: {
        uIntensity: { value: 0 },
        uTime: { value: 0 },
      },
      vertexShader: /* glsl */`
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */`
        uniform float uIntensity;
        uniform float uTime;
        varying vec2 vUv;

        void main() {
          // Apple M1 color palette — corners match the reference marketing material
          vec3 bottomLeft  = vec3(1.0, 0.1, 0.4);   // Bright Pink/Red
          vec3 topLeft     = vec3(1.0, 0.6, 0.1);   // Vibrant Orange
          vec3 topRight    = vec3(0.1, 0.6, 1.0);   // Cyan/Light Blue
          vec3 bottomRight = vec3(0.4, 0.1, 1.0);   // Deep Purple / Violet

          // Bilinear blend across UV corners
          vec3 bottom = mix(bottomLeft, bottomRight, vUv.x);
          vec3 top    = mix(topLeft, topRight, vUv.x);
          vec3 col    = mix(bottom, top, vUv.y);

          // Gentle living waves for organic movement
          float vWave = sin(vUv.y * 8.0 - uTime * 1.5) * 0.08;
          float hWave = cos(vUv.x * 8.0 + uTime * 1.2) * 0.08;
          col += vec3(vWave, hWave, vWave * hWave) * 0.3;
          
          // Slow cyclic palette breathing
          col = mix(col, col.gbr, sin(uTime * 0.4) * 0.15);

          // Soft radial fade from center outward — NO cutout hole!
          // The chip mesh sitting on top naturally occludes the center,
          // creating the authentic "glow peeking from behind" effect
          vec2 centered = vUv - 0.5;
          float dist = length(centered) * 2.0; // 0 at center, 1 at edges
          
          // Smooth fade: full brightness at center, zero at edges
          float glow = 1.0 - smoothstep(0.0, 1.0, dist);
          // Boost the inner region slightly for a hot core
          glow = pow(glow, 0.8);

          // Subtle micro-flicker for electrical feel
          float flicker = 1.0 + sin(uTime * 12.0) * 0.02 + cos(uTime * 7.0) * 0.02;
          
          float alpha = glow * uIntensity * flicker;
          vec3 bloom = col * 1.8 * flicker;

          gl_FragColor = vec4(bloom, alpha);
        }
      `,
    });

    // Glow plane sized to halo around the chip, not flood the whole phone
    const glowGeo = new THREE.PlaneGeometry(1.8, 1.8);
    this.glowMesh = new THREE.Mesh(glowGeo, glowMat);
    
    // Render the glow BEHIND everything else — negative renderOrder draws first,
    // then the phone and chip render on top via normal depth testing
    glowMat.depthTest = false;
    glowMat.depthWrite = false;
    this.glowMesh.renderOrder = -1;
    
    // Add to the SCENE root (not deviceFrame.group) so rotation stays in world space
    // This prevents the phone's Z-rotation from tilting the glow plane sideways
    this.glowMesh.position.set(0, 0, 0); 
    this.glowMesh.rotation.x = -Math.PI / 2; 
    this.glowMesh.visible = false;

    this.scene.add(this.glowMesh);

    this.glowMat = glowMat;
  }

  setXrayState() {
    this.materials.forEach(mat => { 
      mat.transparent = true;
      mat.opacity = 0.06; 
      mat.metalness = 0.9;
      mat.roughness = 0.5;
    });
    this.edgesMat.opacity = 0.7;
  }

  show() { this.group.visible = true; }

  hide() {
    this.group.visible = false;
    this.glowMat.uniforms.uIntensity.value = 0;
    this.glowMesh.visible = false;
    this.materials.forEach(mat => {
      mat.transparent = true;
      mat.opacity = 0;
    });
    
    if (this.edgesMat) {
      this.edgesMat.opacity = 0;
    }
  }

  // Globally synchronized heartbeat mapped to main.js clock!
  update(time) {
    if (this.glowMat) {
      this.glowMat.uniforms.uTime.value = time;
    }
  }
}
