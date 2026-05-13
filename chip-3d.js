// ─────────────────────────────────────────────────────────────
// Three.js procedural chip package for the About section.
// Renders an IC sitting on a pedestal: dark plastic body, silicon
// die on top with standard-cell rows etched in, gold bond pads
// and gull-wing leads, slow rotation, mouse parallax, gold rim
// light. Hover spins faster; click toggles the die "lid" between
// closed (package) and open (exposed die).
// ─────────────────────────────────────────────────────────────
import * as THREE from 'three';

const host = document.getElementById('chip-3d');
if (!host) {
  // not on this page — bail silently
} else {
  init(host);
}

function init(host) {
  const W0 = host.clientWidth;
  const H0 = host.clientHeight || 460;

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.setSize(W0, H0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  host.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, W0 / H0, 0.1, 100);
  camera.position.set(0, 4.2, 6.4);
  camera.lookAt(0, 0, 0);

  // ─── Lighting ────────────────────────────────────────────────
  scene.add(new THREE.AmbientLight(0xffffff, 0.18));

  const key = new THREE.DirectionalLight(0xfff2d8, 1.4);
  key.position.set(4, 6, 4);
  scene.add(key);

  const fill = new THREE.PointLight(0x9B7BFF, 1.8, 12, 2);
  fill.position.set(-3, 2, 2);
  scene.add(fill);

  const rim = new THREE.PointLight(0xFFC75A, 2.4, 14, 2);
  rim.position.set(2, -1.5, -3);
  scene.add(rim);

  // ─── Chip group ──────────────────────────────────────────────
  const chip = new THREE.Group();
  scene.add(chip);

  // Package body (rounded square plate)
  const pkgGeom = new THREE.BoxGeometry(3.2, 0.34, 3.2, 1, 1, 1);
  const pkgMat = new THREE.MeshStandardMaterial({
    color: 0x121218, metalness: 0.55, roughness: 0.38,
  });
  const pkg = new THREE.Mesh(pkgGeom, pkgMat);
  pkg.position.y = 0;
  chip.add(pkg);

  // Subtle bevel — second slightly smaller plate stacked under
  const bevel = new THREE.Mesh(
    new THREE.BoxGeometry(3.30, 0.10, 3.30),
    new THREE.MeshStandardMaterial({ color: 0x0a0a0e, metalness: 0.4, roughness: 0.6 }),
  );
  bevel.position.y = -0.21;
  chip.add(bevel);

  // ─── Die (silicon rectangle on top of package) ──────────────
  const dieGeom = new THREE.BoxGeometry(2.05, 0.06, 2.05);
  const dieMat = new THREE.MeshStandardMaterial({
    color: 0x1a1a2a, metalness: 0.85, roughness: 0.25,
    emissive: 0x0a0a14, emissiveIntensity: 0.25,
  });
  const die = new THREE.Mesh(dieGeom, dieMat);
  die.position.y = 0.20;
  chip.add(die);

  // Procedural texture for the die: standard cell rows etched in
  const dieTex = makeDieTexture(512);
  die.material.map = dieTex;
  die.material.metalnessMap = dieTex;
  die.material.needsUpdate = true;

  // ─── Gold bond pads + leads around package edge ─────────────
  const goldMat = new THREE.MeshStandardMaterial({
    color: 0xFFC75A, metalness: 0.95, roughness: 0.22,
    emissive: 0xFFA82A, emissiveIntensity: 0.08,
  });

  const PIN_COUNT = 14; // per side
  const sides = [
    { axis: 'x', sign:  1 }, // right side: pins extend in +x
    { axis: 'x', sign: -1 },
    { axis: 'z', sign:  1 },
    { axis: 'z', sign: -1 },
  ];
  const PKG_HALF = 1.6;
  const PIN_LEN = 0.28;
  const PIN_W = 0.10;
  const PIN_H = 0.045;

  for (const side of sides) {
    for (let i = 0; i < PIN_COUNT; i++) {
      const t = (i + 0.5) / PIN_COUNT;       // 0..1 across side
      const along = (t - 0.5) * (PKG_HALF * 1.85);
      const pin = new THREE.Mesh(new THREE.BoxGeometry(
        side.axis === 'x' ? PIN_LEN : PIN_W,
        PIN_H,
        side.axis === 'x' ? PIN_W : PIN_LEN,
      ), goldMat);
      if (side.axis === 'x') {
        pin.position.set(side.sign * (PKG_HALF + PIN_LEN / 2 - 0.04), -0.03, along);
      } else {
        pin.position.set(along, -0.03, side.sign * (PKG_HALF + PIN_LEN / 2 - 0.04));
      }
      chip.add(pin);
    }
  }

  // Bond pads (small gold dots on the die border)
  const padGeom = new THREE.BoxGeometry(0.06, 0.02, 0.06);
  const DIE_HALF = 0.95;
  const padsPerSide = 12;
  for (const side of sides) {
    for (let i = 0; i < padsPerSide; i++) {
      const t = (i + 0.5) / padsPerSide;
      const along = (t - 0.5) * (DIE_HALF * 1.8);
      const pad = new THREE.Mesh(padGeom, goldMat);
      if (side.axis === 'x') {
        pad.position.set(side.sign * DIE_HALF, 0.234, along);
      } else {
        pad.position.set(along, 0.234, side.sign * DIE_HALF);
      }
      chip.add(pad);
    }
  }

  // ─── Subtle reflective "pedestal" plate so the chip sits in space ──
  const stage = new THREE.Mesh(
    new THREE.CircleGeometry(3.6, 64),
    new THREE.MeshStandardMaterial({
      color: 0x05050a, metalness: 0.8, roughness: 0.4,
      transparent: true, opacity: 0.55,
    }),
  );
  stage.rotation.x = -Math.PI / 2;
  stage.position.y = -0.30;
  scene.add(stage);

  // Subtle gold ring around the stage
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(3.10, 3.22, 80),
    new THREE.MeshBasicMaterial({ color: 0xFFC75A, transparent: true, opacity: 0.35, side: THREE.DoubleSide }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = -0.29;
  scene.add(ring);

  // Floating annotation dots (used to point at parts of the chip)
  // We just emit DOM labels separately by reading the chip's screen-space coords.
  const labels = host.parentElement.querySelectorAll('.chip-label');
  const labelTargets = [
    new THREE.Vector3( 0.0,  0.30,  0.0),   // die surface
    new THREE.Vector3( 1.45,  0.0,   0.0),  // pins
    new THREE.Vector3(-1.20,  0.0,  -0.8),  // package
  ];

  // ─── Interaction state ───────────────────────────────────────
  let hovered = false;
  let lidOpen = true;  // start open so users see the die first
  let targetTiltX = 0.5, targetTiltY = 0;
  host.addEventListener('mouseenter', () => { hovered = true; });
  host.addEventListener('mouseleave', () => { hovered = false; });
  host.addEventListener('mousemove', (e) => {
    const r = host.getBoundingClientRect();
    const nx = (e.clientX - r.left) / r.width  - 0.5;
    const ny = (e.clientY - r.top)  / r.height - 0.5;
    targetTiltX = 0.45 - ny * 0.6;
    targetTiltY = nx * 0.7;
  });
  host.addEventListener('click', () => {
    lidOpen = !lidOpen;
    host.dataset.lid = lidOpen ? 'open' : 'closed';
  });
  host.dataset.lid = 'open';

  // ─── Resize ─────────────────────────────────────────────────
  const ro = new ResizeObserver(() => {
    const W = host.clientWidth, H = host.clientHeight;
    if (W && H) {
      renderer.setSize(W, H);
      camera.aspect = W / H;
      camera.updateProjectionMatrix();
    }
  });
  ro.observe(host);

  // ─── Loop ───────────────────────────────────────────────────
  let visible = true;
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((es) => {
      for (const e of es) visible = e.isIntersecting;
    }, { threshold: 0.05 });
    io.observe(host);
  }

  let rotY = 0;
  let lidY = 0.20;        // closed die position
  const LID_OPEN_Y = 0.20;
  const LID_CLOSED_Y = 0.06;
  const clock = new THREE.Clock();
  function tick() {
    requestAnimationFrame(tick);
    if (!visible) return;
    const dt = clock.getDelta();
    const speed = hovered ? 0.55 : 0.22;
    rotY += dt * speed;
    chip.rotation.y = rotY + targetTiltY * 0.3;
    chip.rotation.x = THREE.MathUtils.lerp(chip.rotation.x, targetTiltX - 0.4, 0.08);

    // Lid open/close
    const targetLid = lidOpen ? LID_OPEN_Y : LID_CLOSED_Y;
    lidY = THREE.MathUtils.lerp(lidY, targetLid, 0.06);
    die.position.y = lidY;
    die.material.emissiveIntensity = 0.10 + (lidY - LID_CLOSED_Y) * 1.4;

    // Live rim light pulse
    const t = clock.elapsedTime;
    rim.intensity = 2.0 + Math.sin(t * 1.6) * 0.5;
    fill.intensity = 1.6 + Math.cos(t * 1.1) * 0.4;

    renderer.render(scene, camera);

    // Position floating labels
    if (labels.length) {
      const v = new THREE.Vector3();
      const W = host.clientWidth, H = host.clientHeight;
      labels.forEach((el, i) => {
        const target = labelTargets[i] || labelTargets[0];
        v.copy(target).applyMatrix4(chip.matrixWorld);
        v.project(camera);
        const sx = (v.x * 0.5 + 0.5) * W;
        const sy = (-v.y * 0.5 + 0.5) * H;
        el.style.transform = `translate(${sx}px, ${sy}px)`;
        el.style.opacity = (v.z < 1) ? '1' : '0';
      });
    }
  }
  tick();
}

// Procedural die texture — standard cell rows with random metal patches
function makeDieTexture(size) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  // base
  g.fillStyle = '#0e0e18';
  g.fillRect(0, 0, size, size);

  // standard-cell rows
  const rows = 18;
  const rowH = size / rows;
  for (let r = 0; r < rows; r++) {
    const y = r * rowH;
    const tone = r % 2 === 0 ? '#1a1828' : '#161526';
    g.fillStyle = tone;
    g.fillRect(8, y + 2, size - 16, rowH - 4);
    // cells within row
    let x = 10;
    while (x < size - 20) {
      const w = 6 + Math.random() * 16;
      const v = Math.random();
      g.fillStyle = v < 0.18 ? '#FFC75A22'
                  : v < 0.36 ? '#9B7BFF33'
                  : '#0a0a14';
      g.fillRect(x, y + 4, w, rowH - 8);
      x += w + 1.5;
    }
  }
  // Metal layer routing — orthogonal traces
  g.strokeStyle = '#FFC75A33';
  g.lineWidth = 1;
  for (let i = 0; i < 18; i++) {
    const x = 20 + Math.random() * (size - 40);
    g.beginPath(); g.moveTo(x, 6); g.lineTo(x, size - 6); g.stroke();
  }
  g.strokeStyle = '#7AB8FF22';
  for (let i = 0; i < 14; i++) {
    const y = 8 + Math.random() * (size - 16);
    g.beginPath(); g.moveTo(6, y); g.lineTo(size - 6, y); g.stroke();
  }
  // KV stamp in lower right
  g.fillStyle = '#FFC75A77';
  g.font = `500 ${Math.round(size * 0.045)}px JetBrains Mono, monospace`;
  g.textAlign = 'right';
  g.fillText('KV-01 · 7nm', size - 14, size - 14);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}
