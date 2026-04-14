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
const { scene, camera, cameraTarget } = sceneManager;

/* ── Lighting ──────────────────────────────────── */
setupLighting(scene);

/* ── SoC Assembly ──────────────────────────────── */
const assembly = new SoCAssembly(scene);

/* ── Data Traces (signals along model traces) ──── */
const dataTraces = new DataTraces(scene, assembly);

/* ── Guided Chip Tour ──────────────────────────── */
const chipTour = new ChipTour(assembly);

/* ── Device frame (assigned after construction; render loop starts first) ── */
let deviceFrame = null;

const mouseTarget = { x: 0, y: 0 };
const parallax = { x: 0, y: 0 };
let clock = 0;

window.addEventListener('mousemove', (e) => {
  mouseTarget.x = (e.clientX / window.innerWidth  - 0.5) * 0.12;
  mouseTarget.y = (e.clientY / window.innerHeight - 0.5) * 0.12;
});

function animate() {
  requestAnimationFrame(animate);
  clock += 0.016;

  dataTraces.update(clock);
  if (deviceFrame) deviceFrame.update(clock);

  parallax.x += (mouseTarget.x - parallax.x) * 0.03;
  parallax.y += (-mouseTarget.y - parallax.y) * 0.03;

  sceneManager.render(parallax.x, parallax.y);
  chipTour.update(camera);
}

animate();

/* ── Asynchronous Initialization Bootloader ──────── */
async function init() {
  const loadingScreen = document.getElementById('loading-screen');
  const loadingBar = document.getElementById('loading-bar');
  const loadingProgress = document.getElementById('loading-progress');

  deviceFrame = new DeviceFrame(scene);

  await deviceFrame.load((progress) => {
    const percent = Math.round(progress * 100);
    if (loadingBar) loadingBar.style.width = `${percent}%`;
    if (loadingProgress) loadingProgress.textContent = `${percent}%`;
  });

  createScrollTimeline({ camera, cameraTarget, assembly, dataTraces, chipTour, deviceFrame });
  setupPortfolioMotion();

  if (loadingScreen) {
    loadingScreen.style.opacity = '0';
    loadingScreen.style.visibility = 'hidden';
    setTimeout(() => {
      loadingScreen.remove();
      document.body.classList.remove('loading');
    }, 800);
  }

  // createDebugGUI({ camera, cameraTarget, assembly, deviceFrame });
}

init();
