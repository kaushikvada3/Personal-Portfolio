import './style.css';
import { SceneManager }        from './scene/SceneManager';
import { SoCAssembly }         from './scene/SoCAssembly';
import { DataTraces }          from './scene/DataTraces';
import { ChipTour }            from './scene/ChipTour';
import { DeviceFrame }         from './scene/DeviceFrame';
import { setupLighting }       from './scene/Lighting';
import { setupPortfolioMotion } from './portfolioMotion';
import { createScrollTimeline } from './scroll/ScrollTimeline';
import { createDebugGUI }       from './debugGUI';

/* ── Initialise Three.js ───────────────────────── */
const canvas       = document.getElementById('webgl-canvas');
const sceneManager = new SceneManager(canvas);
const { scene, camera, cameraTarget, renderer } = sceneManager;

/* ── Lighting ──────────────────────────────────── */
setupLighting(scene);

/* ── SoC Assembly ──────────────────────────────── */
const assembly = new SoCAssembly(scene);

/* ── Data Traces (signals along model traces) ──── */
const dataTraces = new DataTraces(scene, assembly);

/* ── Guided Chip Tour ──────────────────────────── */
const chipTour = new ChipTour(assembly);

/* ── Asynchronous Initialization Bootloader ──────── */
async function init() {
  /* ── Device Frame (shown in Contact section) ───── */
  const deviceFrame = new DeviceFrame(scene);
  
  // Explicitly freeze the matrix thread until the massive 3D .glb package safely loads 
  // into the user's browser payload pipeline natively across standard HTTP limits!
  await deviceFrame.load();

  /* ── Scroll-driven 4-stage timeline ────────────── */
  createScrollTimeline({ camera, cameraTarget, assembly, dataTraces, chipTour, deviceFrame });
  setupPortfolioMotion();

  /* ── Debug GUI (press H to toggle) ─────────────── */
  // createDebugGUI({ camera, cameraTarget, assembly, deviceFrame });

  /* ── Mouse parallax (subtle, non-destructive) ──── */
  const mouseTarget = { x: 0, y: 0 };
  window.addEventListener('mousemove', (e) => {
    mouseTarget.x = (e.clientX / window.innerWidth  - 0.5) * 0.12;
    mouseTarget.y = (e.clientY / window.innerHeight - 0.5) * 0.12;
  });

  /* ── Render loop ───────────────────────────────── */
  let clock = 0;
  const parallax = { x: 0, y: 0 };
  
  function animate() {
    requestAnimationFrame(animate);
    clock += 0.016;

    // Stream universal timestamps to custom shaders
    dataTraces.update(clock);
    deviceFrame.update(clock);

    // Smooth-lerp a separate parallax offset (never mutate cameraTarget)
    parallax.x += (mouseTarget.x - parallax.x) * 0.03;
    parallax.y += (-mouseTarget.y - parallax.y) * 0.03;

    // Pass the offset to the renderer which adds it at lookAt time
    sceneManager.render(parallax.x, parallax.y);
    chipTour.update(camera);
  }
  
  animate();
}

// Fire the deployment
init();
