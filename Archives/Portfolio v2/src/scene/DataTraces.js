import * as THREE from 'three';

/**
 * Animated electrical signal pulses that flow along the ACTUAL
 * copper interconnect buses and substrate traces of the SoC model.
 *
 * Signals are added directly to the relevant layer groups so they
 * move correctly during the exploded-view scroll animation.
 */

/* ── Vertex Shader ──────────────────────────────── */
const vertexShader = /* glsl */ `
  attribute float aLineDistance;
  varying float vDist;
  void main() {
    vDist = aLineDistance;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

/* ── Fragment Shader ────────────────────────────── */
const fragmentShader = /* glsl */ `
  uniform float uTime;
  uniform float uOpacity;
  uniform float uIntensity;
  uniform float uActivity;
  uniform float uSpeed;
  uniform float uSpacing;

  varying float vDist;

  // Simple pseudo-random for electrical chatter
  float hash(float n) { return fract(sin(n) * 43758.5453123); }

  void main() {
    // Base trace color — subtle warm gold, visible but not dominant.
    vec3 baseColor  = vec3(0.58, 0.42, 0.10);
    // Pulse color — refined amber.
    vec3 pulseColor = vec3(0.96, 0.76, 0.30);
    // Bright head — clean near-white.
    vec3 headColor  = vec3(1.00, 0.97, 0.90);

    // Activity noise: fluctuates the speed and intensity based on time
    float noise = hash(vDist + floor(uTime * 10.0));
    float activityMod = 1.0 + (noise - 0.5) * 0.25 * uActivity;

    // Traveling pulse along the line
    float d = mod(vDist - uTime * (uSpeed * (1.0 + uActivity * 0.5)), uSpacing);
    float glow   = smoothstep(0.55, 0.0, d);
    float packet = smoothstep(0.22, 0.0, d);
    float head   = smoothstep(0.08, 0.0, d);

    // Add extra "spark" based on activity
    float spark = head * uActivity * noise * 0.3;

    vec3 color = mix(baseColor, pulseColor, packet);
    color += pulseColor * glow * 0.14;
    color = mix(color, headColor, head * 0.88 + spark);
    color *= uIntensity * activityMod;

    float alpha = (0.07 + glow * 0.14 + packet * 0.72 + head * 0.38 + spark) * uOpacity;
    gl_FragColor = vec4(color, alpha);
  }
`;

export class DataTraces {
  constructor(scene, assembly) {
    this.lines = [];
    this.packets = [];
    this.packetTexture = this._createPacketTexture();
    this._packetSample = new THREE.Vector3();

    this.material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uTime:    { value: 0 },
        uOpacity: { value: 0 },     // Revealed via GSAP once the chip opens up
        uIntensity: { value: 0.82 },
        uActivity:  { value: 0 },   // 0 = idle, 1 = high load (used in Projects section)
        uSpeed:   { value: 0.4 },
        uSpacing: { value: 1.2 },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
    });

    if (assembly) {
      this._buildModelSignals(assembly);
    }
  }

  /* ── Public ─────────────────────────────────── */
  update(time) {
    this.material.uniforms.uTime.value = time;
    this._updatePackets(time);
  }

  _createPacketTexture() {
    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;

    const ctx = canvas.getContext('2d');
    const center = size * 0.5;
    const gradient = ctx.createRadialGradient(center, center, 0, center, center, center);

    gradient.addColorStop(0.0, 'rgba(255, 252, 242, 1)');
    gradient.addColorStop(0.16, 'rgba(255, 233, 170, 0.98)');
    gradient.addColorStop(0.42, 'rgba(255, 182, 76, 0.72)');
    gradient.addColorStop(0.72, 'rgba(255, 129, 26, 0.24)');
    gradient.addColorStop(1.0, 'rgba(255, 129, 26, 0)');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.needsUpdate = true;
    return texture;
  }

  _updatePackets(time) {
    const opacity = THREE.MathUtils.clamp(this.material.uniforms.uOpacity.value / 1.35, 0, 1);
    const activity = THREE.MathUtils.clamp(this.material.uniforms.uActivity.value, 0, 2);
    const intensity = THREE.MathUtils.clamp(this.material.uniforms.uIntensity.value, 0.8, 1.9);
    const visibility = THREE.MathUtils.clamp(opacity * (0.35 + activity * 0.42), 0, 1);

    this.packets.forEach((packet, index) => {
      const cycle = packet.signal.totalLength;
      if (cycle <= 0 || visibility < 0.03) {
        packet.sprite.visible = false;
        packet.sprite.material.opacity = 0;
        return;
      }

      const speed = packet.baseSpeed * (0.9 + activity * 0.7);
      const distance = THREE.MathUtils.euclideanModulo(
        time * speed + packet.phase * cycle,
        cycle
      );

      this._sampleSignal(packet.signal, distance, this._packetSample);
      packet.sprite.position.copy(this._packetSample);
      packet.sprite.position.y += packet.lift + Math.sin(time * 7.5 + index * 0.6) * 0.003 * activity;

      const flicker = 0.9
        + Math.sin(time * 13.0 + index * 0.8) * 0.08
        + Math.cos(time * 8.0 + packet.phase * Math.PI * 2.0) * 0.05;
      const pulse = 0.96 + Math.sin(time * 18.0 + index * 0.45) * 0.14;
      const alpha = THREE.MathUtils.clamp(
        packet.baseOpacity * visibility * (0.72 + intensity * 0.22) * flicker,
        0,
        0.96
      );
      const scale = packet.baseScale * (0.95 + intensity * 0.12 + activity * 0.10) * pulse;

      packet.sprite.material.opacity = alpha;
      packet.sprite.scale.setScalar(scale);
      packet.sprite.visible = alpha > 0.02;
    });
  }

  _sampleSignal(signal, distance, target) {
    if (!signal.points.length) {
      return target.set(0, 0, 0);
    }

    if (signal.points.length === 1 || signal.totalLength <= 0) {
      return target.copy(signal.points[0]);
    }

    let remaining = THREE.MathUtils.clamp(distance, 0, signal.totalLength);

    for (let i = 0; i < signal.segmentLengths.length; i++) {
      const segLength = signal.segmentLengths[i];
      if (remaining <= segLength) {
        const start = signal.points[i];
        const end = signal.points[i + 1];
        const t = segLength === 0 ? 0 : remaining / segLength;
        return target.copy(start).lerp(end, t);
      }
      remaining -= segLength;
    }

    return target.copy(signal.points[signal.points.length - 1]);
  }

  /* ── Build signals along actual model geometry ─ */
  _buildModelSignals(assembly) {
    const layers = assembly.getLayers();
    const dieLayer = layers[2];        // Silicon die layer
    const subLayer = layers[1];        // Substrate layer

    // === DIE-LEVEL SIGNALS ===
    // These follow the copper interconnect buses defined in SoCAssembly._buildDie()
    //
    // Die local coordinates:
    //   Copper H buses: x ∈ [-0.65, 0.65], y = 0.035, z = i * 0.025 (i: -3..3)
    //   Copper V buses: z ∈ [-0.65, 0.65], y = 0.036, x = i * 0.16  (i: -2..2)

    const DY = 0.039;  // Lifted slightly for cleaner read over the die texture

    // Horizontal bus signals — core ↔ core data paths
    const hBusZ = [-0.075, -0.025, 0.025, 0.075];
    hBusZ.forEach((z, i) => {
      this._createSignal(dieLayer, [
        [-0.65, DY, z],
        [0.65, DY, z],
      ], 0.3 + i * 0.08, 0.8 + i * 0.2);
    });

    // Vertical bus signals — core ↔ cache paths
    const vBusX = [-0.32, 0, 0.32];
    vBusX.forEach((x, i) => {
      this._createSignal(dieLayer, [
        [x, DY, -0.65],
        [x, DY, 0.65],
      ], 0.25 + i * 0.1, 1.0 + i * 0.15);
    });

    // L-shaped signal: I/O pad → horizontal bus → core (left side)
    this._createSignal(dieLayer, [
      [-0.70, DY, -0.50],   // From left I/O pad
      [-0.65, DY, -0.50],   // Enter die area
      [-0.65, DY, -0.025],  // Travel along edge
      [-0.32, DY, -0.025],  // Turn onto H bus
      [-0.32, DY, -0.30],   // Reach core 0
    ], 0.35, 1.4);

    // L-shaped signal: I/O pad → horizontal bus → core (right side)
    this._createSignal(dieLayer, [
      [0.70, DY, -0.50],    // From right I/O pad
      [0.65, DY, -0.50],    // Enter die area
      [0.65, DY, 0.025],    // Travel along edge
      [0.32, DY, 0.025],    // Turn onto H bus
      [0.32, DY, -0.30],    // Reach core 1
    ], 0.40, 1.2);

    // Core → Cache signal paths
    this._createSignal(dieLayer, [
      [-0.32, DY, 0.10],    // From core 2
      [-0.32, DY, 0.48],    // Down to cache
      [-0.35, DY, 0.48],    // Into cache array
    ], 0.50, 1.0);

    this._createSignal(dieLayer, [
      [0.32, DY, 0.10],     // From core 3
      [0.32, DY, 0.48],     // Down to cache
      [0.35, DY, 0.48],     // Into cache array
    ], 0.45, 1.1);

    // Core ↔ Core cross-connect through center bus
    this._createSignal(dieLayer, [
      [-0.32, DY, -0.30],   // Core 0
      [0, DY, -0.30],       // Center
      [0, DY, 0.10],        // Vertical bus
      [0.32, DY, 0.10],     // Core 3
    ], 0.30, 1.5);

    // Bottom cache to I/O
    this._createSignal(dieLayer, [
      [0, DY, -0.58],       // Bottom cache
      [0, DY, -0.65],       // South edge
      [0, DY, -0.70],       // I/O pad
    ], 0.55, 0.6);

    // === SUBSTRATE-LEVEL SIGNALS ===
    // Follow the gold traces defined in SoCAssembly._buildSubstrate()
    //
    // Substrate local coords:
    //   H traces: x ∈ [-1.9, 1.9], y = 0.094, z = i * 0.22
    //   V traces: z ∈ [-1.9, 1.9], y = 0.094, x = i * 0.22

    const SY = 0.099;  // Lifted slightly so the substrate routes read sooner

    // Major horizontal substrate bus signals
    [-0.44, 0, 0.44].forEach((z, i) => {
      this._createSignal(subLayer, [
        [-1.9, SY, z],
        [1.9, SY, z],
      ], 0.15 + i * 0.05, 2.0 + i * 0.3);
    });

    // Major vertical substrate bus signals
    [-0.44, 0.44].forEach((x, i) => {
      this._createSignal(subLayer, [
        [x, SY, -1.9],
        [x, SY, 1.9],
      ], 0.20 + i * 0.08, 2.2 + i * 0.2);
    });

    // Substrate edge → die area routed signal
    this._createSignal(subLayer, [
      [-1.8, SY, -0.88],    // Near edge capacitor
      [-0.85, SY, -0.88],   // Approach die
      [-0.85, SY, -0.44],   // Turn north
      [0, SY, -0.44],       // Route to center
    ], 0.25, 2.5);

    this._createSignal(subLayer, [
      [1.8, SY, 0.88],      // Near opposite cap
      [0.85, SY, 0.88],     // Approach die
      [0.85, SY, 0.44],     // Turn
      [0, SY, 0.44],        // Route to center
    ], 0.22, 2.3);
  }

  /**
   * Create a single signal line along a defined path.
   * @param {THREE.Group} parentGroup - Layer group to add the line to
   * @param {number[][]} path - Array of [x, y, z] coordinates
   * @param {number} speed - Pulse animation speed
   * @param {number} spacing - Distance between pulses
   */
  _createSignal(parentGroup, path, speed, spacing) {
    const positions = [];
    const distances = [];
    const points = [];
    const segmentLengths = [];
    let cumDist = 0;

    for (let i = 0; i < path.length; i++) {
      const [x, y, z] = path[i];
      points.push(new THREE.Vector3(x, y, z));
      positions.push(x, y, z);

      if (i === 0) {
        distances.push(0);
      } else {
        const [px, py, pz] = path[i - 1];
        const segLength = Math.sqrt((x - px) ** 2 + (y - py) ** 2 + (z - pz) ** 2);
        segmentLengths.push(segLength);
        cumDist += segLength;
        distances.push(cumDist);
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('aLineDistance', new THREE.Float32BufferAttribute(distances, 1));

    // Clone material with unique speed/spacing but shared time/opacity/activity
    const mat = this.material.clone();
    mat.uniforms.uSpeed   = { value: speed };
    mat.uniforms.uSpacing = { value: spacing };
    
    // Link these by reference to the master material's uniform objects
    mat.uniforms.uOpacity  = this.material.uniforms.uOpacity;
    mat.uniforms.uActivity = this.material.uniforms.uActivity;
    mat.uniforms.uIntensity = this.material.uniforms.uIntensity;
    mat.uniforms.uTime     = this.material.uniforms.uTime;

    const line = new THREE.Line(geo, mat);
    line.renderOrder = 8;
    this.lines.push(line);
    parentGroup.add(line);

    const layerName = parentGroup.userData.name || '';
    const signal = {
      points,
      segmentLengths,
      totalLength: cumDist,
    };
    const packetCount = layerName === 'die'
      ? THREE.MathUtils.clamp(Math.round(cumDist / 0.42), 3, 5)
      : THREE.MathUtils.clamp(Math.round(cumDist / 1.15), 2, 4);
    const baseScale = layerName === 'die' ? 0.07 : 0.09;
    const baseOpacity = layerName === 'die' ? 0.58 : 0.42;
    const lift = layerName === 'die' ? 0.018 : 0.024;
    const color = layerName === 'die' ? 0xffd36e : 0xffb95b;

    for (let i = 0; i < packetCount; i++) {
      const packetMaterial = new THREE.SpriteMaterial({
        map: this.packetTexture,
        color,
        transparent: true,
        opacity: 0,
        depthTest: false,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
      });

      const sprite = new THREE.Sprite(packetMaterial);
      sprite.renderOrder = 10;
      sprite.visible = false;
      sprite.scale.setScalar(baseScale);
      parentGroup.add(sprite);

      this.packets.push({
        sprite,
        signal,
        phase: (i / packetCount + speed * 0.17) % 1,
        baseSpeed: speed * 1.9,
        baseScale,
        baseOpacity,
        lift,
      });
    }
  }
}
