/**
 * chip-bg.js — Authentic IC routing visualization
 *
 * Dense Manhattan routing modelled on real EDA tool output (Cadence/Synopsys).
 * Layers: M1 (H-blue), M2 (V-fuchsia), M3 (H-cyan buses), PWR (H-orange rails).
 * Extras: via squares, standard-cell outlines, VLSI cell-name labels, net labels,
 *         mouse-reactive signal particles that ripple along grid lines from cursor.
 */
(function () {
  'use strict';

  const canvas = document.getElementById('chip-canvas');
  if (!canvas) return;

  function detectPerfMode() {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const lowMemory = typeof navigator.deviceMemory === 'number' && navigator.deviceMemory <= 4;
    const lowCpu = typeof navigator.hardwareConcurrency === 'number' && navigator.hardwareConcurrency <= 4;
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    const saveData = !!(connection && connection.saveData);
    const slowNetwork = !!(connection && typeof connection.effectiveType === 'string' &&
      /(^2g$|^slow-2g$|^3g$)/i.test(connection.effectiveType));
    return (reducedMotion || lowMemory || lowCpu || saveData || slowNetwork) ? 'lite' : 'full';
  }

  const perfMode = document.body.dataset.perfMode || detectPerfMode();
  if (!document.body.dataset.perfMode) document.body.dataset.perfMode = perfMode;
  const isLiteMode = perfMode === 'lite';
  const isMobileViewport = window.matchMedia('(max-width: 900px)').matches;

  const ctx = canvas.getContext('2d');
  let W, H;

  const PITCH = isLiteMode ? 30 : (isMobileViewport ? 26 : 22);
  const TARGET_FPS = isLiteMode ? 18 : (isMobileViewport ? 24 : 30);
  const FRAME_MS = 1000 / TARGET_FPS;

  // EDA-style layer config
  const LAYER = [
    { hex: '#3b82f6', sig: '#93c5fd', lw: 1 }, // M1  – blue,    horizontal
    { hex: '#d946ef', sig: '#f0abfc', lw: 1 }, // M2  – fuchsia, vertical
    { hex: '#22d3ee', sig: '#67e8f9', lw: 1.5 }, // M3  – cyan,    horizontal bus
    { hex: '#f97316', sig: '#fdba74', lw: 1.5 }, // PWR – orange,  power rail
  ];

  const CELL_NAMES = [
    'SDFFASK1_RVT', 'AND2X1_RVT', 'INVX2_RVT', 'NAND2X1_RVT', 'OAI21X1_RVT',
    'DFFHQX1_RVT', 'BUFX4_RVT', 'NOR2X1_RVT', 'CLKBUF1_RVT', 'MX2X1_RVT',
    'SDFF1X1_RVT', 'AO22X1_RVT', 'AOI22X1_RVT', 'NBUFFX2_RVT', 'XOR2X1_RVT',
    'HDFFIX2_RVT', 'EDFFX1_RVT', 'TNBUF1_RVT', 'AOI21X1_RVT', 'DELAY1_RVT',
  ];

  let routes = [];
  let vias = [];
  let cellRects = [];
  let signals = [];
  let mouse = { x: -1, y: -1 };
  let gridSnap = { x: -1, y: -1 };  // nearest grid intersection to cursor
  let scanY = -1, scanElapsed = 0, scanInterval = 11;
  let rafId = 0;
  let isRendering = false;
  let isHeroVisible = true;
  let lastFrameTime = 0;

  // ── Resize ─────────────────────────────────────────────────────────────────
  function resize() {
    W = canvas.parentElement.offsetWidth;
    H = canvas.parentElement.offsetHeight;
    const dpr = Math.min(devicePixelRatio, isLiteMode ? 1.2 : 1.5);
    if (ctx.resetTransform) ctx.resetTransform();
    else ctx.setTransform(1, 0, 0, 1, 0, 0);
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.scale(dpr, dpr);
    buildLayout();
  }

  // ── Build IC routing layout ─────────────────────────────────────────────────
  function buildLayout() {
    routes = [];
    vias = [];
    cellRects = [];
    signals = [];

    const R = n => Math.floor(Math.random() * n);
    const cols = Math.floor(W / PITCH);
    const rows = Math.floor(H / PITCH);

    const hasH = new Uint8Array(rows * cols);
    const hasV = new Uint8Array(rows * cols);

    // M1 – dense horizontal
    for (let r = 1; r < rows; r++) {
      const y = r * PITCH;
      let c = R(2);
      while (c < cols - 1) {
        c += 1 + R(2);
        const c2 = Math.min(c + 3 + R(8), cols - 1);
        if (c2 > c) {
          const label = Math.random() < 0.05
            ? CELL_NAMES[R(CELL_NAMES.length)] : null;
          routes.push({ li: 0, y, x1: c * PITCH, x2: c2 * PITCH, label });
          for (let cc = c; cc < c2 && cc < cols; cc++) hasH[r * cols + cc] = 1;
        }
        c = c2;
      }
    }

    // M2 – dense vertical
    for (let c = 1; c < cols; c++) {
      const x = c * PITCH;
      let r = R(2);
      while (r < rows - 1) {
        r += 1 + R(2);
        const r2 = Math.min(r + 3 + R(7), rows - 1);
        if (r2 > r) {
          routes.push({ li: 1, x, y1: r * PITCH, y2: r2 * PITCH });
          for (let rr = r; rr < r2 && rr < rows; rr++) hasV[rr * cols + c] = 1;
        }
        r = r2;
      }
    }

    // M3 – horizontal buses (every ~4 rows)
    for (let r = 4; r < rows; r += 4) {
      const y = r * PITCH;
      const c1 = R(4), c2 = cols - 1 - R(4);
      if (c2 - c1 > 6) {
        routes.push({ li: 2, y, x1: c1 * PITCH, x2: c2 * PITCH });
        for (let cc = c1; cc < c2 && cc < cols; cc++) hasH[r * cols + cc] = 1;
      }
    }

    // Power rails (full width, every 10 rows)
    for (let r = 10; r < rows; r += 10) {
      routes.push({ li: 3, y: r * PITCH, x1: 0, x2: W });
    }

    // Vias at H ∩ V intersections
    for (let r = 1; r < rows - 1; r++) {
      for (let c = 1; c < cols - 1; c++) {
        if (hasH[r * cols + c] && hasV[r * cols + c]) {
          vias.push({ x: c * PITCH, y: r * PITCH });
        }
      }
    }

    // Standard-cell outlines
    for (let r = 1; r * PITCH < H; r++) {
      const y = r * PITCH;
      let x = 0;
      while (x < W) {
        const w = PITCH * (1 + R(3) + (Math.random() > 0.5 ? 1 : 0));
        cellRects.push({ x, y: y - PITCH, w, h: PITCH, name: CELL_NAMES[R(CELL_NAMES.length)] });
        x += w;
      }
    }
  }

  // ── Mouse tracking for sophisticated Parallax Pan ────────────────────────
  let targetPanX = 0;
  let targetPanY = 0;
  let currentPanX = 0;
  let currentPanY = 0;

  // ── Fade: dims the left portion (behind hero text) ─────────────────────────
  function fade(x) {
    const lo = W * 0.12, hi = W * 0.40;
    if (x <= lo) return 0.07;
    if (x >= hi) return 1.00;
    return 0.07 + 0.93 * ((x - lo) / (hi - lo));
  }

  function rgba(hex, a) {
    return `rgba(${parseInt(hex.slice(1, 3), 16)},` +
      `${parseInt(hex.slice(3, 5), 16)},` +
      `${parseInt(hex.slice(5, 7), 16)},` +
      `${Math.max(0, Math.min(1, a))})`;
  }

  function setRenderActive(shouldRender) {
    if (shouldRender) {
      if (isRendering) return;
      isRendering = true;
      lastFrameTime = 0;
      rafId = requestAnimationFrame(render);
      return;
    }
    if (!isRendering) return;
    isRendering = false;
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = 0;
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  function render(now) {
    if (!isRendering) return;
    if (!lastFrameTime) lastFrameTime = now;
    const deltaMs = now - lastFrameTime;
    if (deltaMs < FRAME_MS) {
      rafId = requestAnimationFrame(render);
      return;
    }
    lastFrameTime = now - (deltaMs % FRAME_MS);
    const deltaSeconds = deltaMs / 1000;

    ctx.clearRect(0, 0, W, H);

    // Apply ultra-smooth lerp for Apple-style parallax float
    currentPanX += (targetPanX - currentPanX) * 0.04;
    currentPanY += (targetPanY - currentPanY) * 0.04;

    ctx.save();
    ctx.translate(currentPanX, currentPanY);

    // Background grid
    ctx.lineWidth = 0.4;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
    for (let x = -W; x <= W * 2; x += PITCH) {
      ctx.beginPath(); ctx.moveTo(x, -H); ctx.lineTo(x, H * 2); ctx.stroke();
    }
    for (let y = -H; y <= H * 2; y += PITCH) {
      ctx.beginPath(); ctx.moveTo(-W, y); ctx.lineTo(W * 2, y); ctx.stroke();
    }

    // Standard-cell outlines + labels
    ctx.lineWidth = 0.5;
    cellRects.forEach(cr => {
      const fa = fade(cr.x + cr.w * 0.5);
      const ao = fa * 0.12;
      if (ao < 0.003) return;
      ctx.strokeStyle = rgba('#ffffff', ao);
      ctx.strokeRect(cr.x + 0.5, cr.y + 0.5, cr.w - 1, cr.h - 1);
      if (!isLiteMode && !isMobileViewport && fa > 0.45 && cr.w > PITCH * 2.5) {
        ctx.font = '5.5px "SF Mono", "Courier New", monospace';
        ctx.fillStyle = rgba('#ffffff', fa * 0.25);
        ctx.fillText(`(${cr.name})`, cr.x + 3, cr.y + cr.h - 3);
      }
    });

    // Routing traces
    routes.forEach(rt => {
      const isH = rt.li !== 1;
      const cx = isH ? (rt.x1 + rt.x2) * 0.5 : rt.x;
      const fa = fade(cx);
      const a = fa * (rt.li === 3 ? 0.18 : 0.24);
      if (a < 0.004) return;

      // Make all traces look like subtle metallic highlights
      ctx.strokeStyle = rgba('#ffffff', a);
      ctx.lineWidth = LAYER[rt.li].lw;
      ctx.beginPath();
      if (isH) { ctx.moveTo(rt.x1, rt.y); ctx.lineTo(rt.x2, rt.y); }
      else { ctx.moveTo(rt.x, rt.y1); ctx.lineTo(rt.x, rt.y2); }
      ctx.stroke();

      if (!isLiteMode && !isMobileViewport && rt.label && rt.li === 0 && fa > 0.55 && (rt.x2 - rt.x1) > PITCH * 5) {
        ctx.font = '6px "SF Mono", "Courier New", monospace';
        ctx.fillStyle = rgba('#ffffff', fa * 0.5);
        ctx.fillText(`(${rt.label})`, rt.x1 + 4, rt.y - 2);
      }
    });

    // Via squares
    vias.forEach((v, index) => {
      if (isMobileViewport && (index % 2 !== 0)) return;
      const fa = fade(v.x);
      if (fa < 0.08) return;
      ctx.fillStyle = rgba('#ffffff', fa * 0.55);
      ctx.fillRect(v.x - 1.5, v.y - 1.5, 3, 3);
    });

    ctx.restore();

    // Occasional subtle glowing sweep line representing data processing
    scanElapsed += deltaSeconds;
    if (scanY < 0 && scanElapsed >= scanInterval) {
      scanY = 0; scanElapsed = 0; scanInterval = 9 + Math.random() * 6;
    }
    if (scanY >= 0) {
      scanY += 3.5;
      if (scanY > H) {
        scanY = -1;
      } else {
        const sg = ctx.createLinearGradient(0, scanY - 30, 0, scanY + 30);
        sg.addColorStop(0, 'rgba(255,255,255,0)');
        sg.addColorStop(0.5, 'rgba(255,255,255,0.08)');
        sg.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = sg;
        ctx.fillRect(0, scanY - 30, W, 60);
      }
    }

    rafId = requestAnimationFrame(render);
  }

  // ── Parallax Mouse Hooks ───────────────────────────────────────────────────
  const parent = canvas.parentElement;
  parent.addEventListener('mousemove', e => {
    // Parallax moves slightly INVERSE to cursor for depth
    const r = canvas.getBoundingClientRect();
    const mx = e.clientX - r.left;
    const my = e.clientY - r.top;

    // Max offset of 30px
    targetPanX = ((W / 2) - mx) * 0.05;
    targetPanY = ((H / 2) - my) * 0.05;
  });
  parent.addEventListener('mouseleave', () => {
    targetPanX = 0;
    targetPanY = 0;
  });

  // ── Init ────────────────────────────────────────────────────────────────────
  window.addEventListener('resize', resize);
  resize();

  const heroSection = canvas.closest('.hero') || canvas.parentElement;
  if ('IntersectionObserver' in window && heroSection) {
    const heroObserver = new IntersectionObserver((entries) => {
      isHeroVisible = entries.some(entry => entry.isIntersecting);
      setRenderActive(isHeroVisible && !document.hidden);
    }, { threshold: 0 });
    heroObserver.observe(heroSection);
  }

  document.addEventListener('visibilitychange', () => {
    setRenderActive(isHeroVisible && !document.hidden);
  });

  setRenderActive(!document.hidden);
})();
