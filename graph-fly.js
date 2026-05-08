// ─────────────────────────────────────────────────────────────
// Obsidian-vault graph as IMMERSIVE 3D fly-through.
// Nodes laid out in a long tube spanning the page's scroll
// length. Camera Z is driven by window.scrollY — scrolling
// flies you forward through the network. Perspective projection,
// depth fog, mouse parallax sway.
// ─────────────────────────────────────────────────────────────
(async () => {
  const canvas = document.getElementById('graph-bg');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  const DPR = Math.min(window.devicePixelRatio || 1, 2);
  let W = 0, H = 0;
  function resize() {
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = W * DPR;
    canvas.height = H * DPR;
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }
  resize();
  window.addEventListener('resize', resize);

  const groupColor = {
    0: '#9B7BFF', 1: '#FFC75A', 2: '#7AB8FF',
    3: '#9B7BFF', 4: '#5AD3FF', 5: '#FF6B9D',
    6: '#FF7A7A', 7: '#FFC75A', 8: '#7AFFA8',
  };
  const colorOf = (g) => groupColor[g] || '#FFC75A';

  let raw;
  try { raw = await fetch('graph.json').then(r => r.json()); }
  catch (e) { console.warn('graph.json failed', e); return; }

  const FOCAL = 600;
  const NEAR = 140;
  const FAR = 3600;
  const NODE_COUNT = raw.nodes.length;

  function pageDepth() {
    const docH = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight);
    return Math.max(docH * 1.6, 7000);
  }
  let TUBE_DEPTH = pageDepth();

  // ─── Cluster layout: randomised every page-load so each visit
  //     takes a different path through the graph. ───
  // Evenly-spaced Z fracs, then Fisher-Yates shuffle so depth
  // order changes — different clusters lead each session.
  const zfracs = [0.07, 0.18, 0.28, 0.38, 0.48, 0.58, 0.68, 0.78, 0.88];
  for (let i = zfracs.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [zfracs[i], zfracs[j]] = [zfracs[j], zfracs[i]];
  }

  const rand = (lo, hi) => lo + Math.random() * (hi - lo);
  const GROUP_CENTERS = Array.from({ length: 9 }, (_, i) => ({
    x: rand(-800, 800),
    y: rand(-600, 600),
    zf: zfracs[i],
  }));

  // Camera follows a random arc through each cluster, offset so it
  // looks across the cluster rather than flying straight into it.
  const CAM_PATH = GROUP_CENTERS.map(c => ({
    x: c.x * 0.20 + rand(-120, 120),
    y: c.y * 0.20 + rand(-80, 80),
    zf: c.zf,
  }));
  // Sort both by zf so waypoints progress forward along Z
  const sortByZ = arr => arr.sort((a, b) => a.zf - b.zf);
  sortByZ(GROUP_CENTERS);
  sortByZ(CAM_PATH);

  const sorted = [...raw.nodes].sort((a, b) => b.deg - a.deg);
  const idToIdx = new Map();
  const nodes = sorted.map((n, i) => {
    idToIdx.set(n.id, i);
    const gc = GROUP_CENTERS[Math.min(n.group, GROUP_CENTERS.length - 1)];
    const jitterZ = (Math.random() - 0.5) * 0.10;
    const zf = Math.max(0.01, Math.min(0.97, gc.zf + jitterZ));
    const spread = 300 + Math.random() * 420;
    const ang = Math.random() * Math.PI * 2;
    return {
      id: n.id, label: n.label, group: n.group, deg: n.deg,
      x: gc.x + Math.cos(ang) * spread,
      y: gc.y + Math.sin(ang) * spread,
      z: zf * TUBE_DEPTH,
      zf,
      r3d: 1.5 + Math.sqrt(n.deg / 75) * 11, // 0-to-75 deg → ~3-to-12.5px world radius
      color: colorOf(n.group),
      phase: Math.random() * Math.PI * 2,
    };
  });

  const links = [];
  for (const [s, t] of raw.links) {
    const a = idToIdx.get(s), b = idToIdx.get(t);
    if (a == null || b == null || a === b) continue;
    // Drop links that span huge Z gaps — they'd streak across the whole
    // tube and become spaghetti. Tighter cap with uniform Z.
    if (Math.abs(nodes[a].z - nodes[b].z) > TUBE_DEPTH * 0.08) continue;
    links.push([a, b]);
  }

  // Mouse parallax — gentle camera tilt as the cursor moves
  const mouse = { nx: 0, ny: 0 };
  window.addEventListener('mousemove', (e) => {
    mouse.nx = (e.clientX / W - 0.5) * 2;
    mouse.ny = (e.clientY / H - 0.5) * 2;
  });

  let cameraZ = 0;
  let targetCamX = 0, targetCamY = 0;
  let camX = 0, camY = 0;

  // ── Easter egg state ──────────────────────────────────────────
  let rtlProgress = 0, rtlTarget = 0;
  // tapeout: 0=idle 1=collapsing 2=hold 3=expanding
  let tapeoutPhase = 0, tapeoutCollapse = 0, tapeoutT0 = 0;
  const TAPEOUT_IN = 1400, TAPEOUT_HOLD = 1000, TAPEOUT_OUT = 1400;

  let keyBuf = '';
  window.addEventListener('keydown', e => {
    if (['INPUT','TEXTAREA'].includes(document.activeElement?.tagName)) return;
    keyBuf = (keyBuf + e.key).slice(-8).toLowerCase();
    if (keyBuf.endsWith('rtl')) {
      rtlTarget = 1;
      clearTimeout(window._rtlTimer);
      window._rtlTimer = setTimeout(() => { rtlTarget = 0; }, 2600);
    }
    if (keyBuf.endsWith('tapeout') && tapeoutPhase === 0) {
      tapeoutPhase = 1;
      tapeoutT0 = performance.now();
    }
  });

  function project(x, y, z) {
    const rz = z - cameraZ;
    if (rz <= NEAR) return null;
    const k = FOCAL / rz;
    return {
      sx: W / 2 + (x - camX) * k,
      sy: H / 2 + (y - camY) * k,
      scale: k,
      depth: rz,
    };
  }

  function fogAlpha(rz) {
    // 1 in the mid-range, fade to 0 at near & far. Wider window than before
    // so more of the tube is visible at any moment.
    const nearFade = Math.min(1, (rz - NEAR) / 100);
    const farFade = Math.min(1, Math.max(0, (FAR - rz) / 1100));
    return Math.max(0, Math.min(1, nearFade * farFade));
  }

  function render(t) {
    ctx.clearRect(0, 0, W, H);

    // ── Easter egg tick ───────────────────────────────────────
    rtlProgress += (rtlTarget - rtlProgress) * 0.07;

    if (tapeoutPhase > 0) {
      const elapsed = t - tapeoutT0;
      if (tapeoutPhase === 1) {
        tapeoutCollapse = Math.min(1, elapsed / TAPEOUT_IN);
        if (tapeoutCollapse >= 1) { tapeoutPhase = 2; tapeoutT0 = t; }
      } else if (tapeoutPhase === 2) {
        tapeoutCollapse = 1;
        if (elapsed > TAPEOUT_HOLD) { tapeoutPhase = 3; tapeoutT0 = t; }
      } else if (tapeoutPhase === 3) {
        tapeoutCollapse = 1 - Math.min(1, elapsed / TAPEOUT_OUT);
        if (tapeoutCollapse <= 0) { tapeoutPhase = 0; tapeoutCollapse = 0; }
      }
    }

    // Smooth camera position from scroll & mouse
    const docH = document.documentElement.scrollHeight - window.innerHeight;
    const scrollFrac = docH > 0 ? Math.min(1, Math.max(0, window.scrollY / docH)) : 0;
    const targetZ = scrollFrac * (TUBE_DEPTH - FAR);
    cameraZ += (targetZ - cameraZ) * 0.12;

    // Camera follows waypoints through each cluster region
    const pathT = scrollFrac * (CAM_PATH.length - 1);
    const wi = Math.floor(pathT);
    const wj = Math.min(wi + 1, CAM_PATH.length - 1);
    const wt = pathT - wi;
    const ws = wt * wt * (3 - 2 * wt); // smoothstep
    const railX = CAM_PATH[wi].x + (CAM_PATH[wj].x - CAM_PATH[wi].x) * ws;
    const railY = CAM_PATH[wi].y + (CAM_PATH[wj].y - CAM_PATH[wi].y) * ws;
    targetCamX = railX + mouse.nx * 70;
    targetCamY = railY + mouse.ny * 50;
    camX += (targetCamX - camX) * 0.04;
    camY += (targetCamY - camY) * 0.04;

    // Pre-project all nodes once (tapeout squeezes xy toward 0)
    const squeeze = 1 - tapeoutCollapse;
    const proj = new Array(nodes.length);
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      const wob = 8 * squeeze;
      const xx = (n.x + Math.cos(t * 0.0004 + n.phase) * wob) * squeeze;
      const yy = (n.y + Math.sin(t * 0.0005 + n.phase * 1.3) * wob) * squeeze;
      proj[i] = project(xx, yy, n.z);
    }

    // ── Draw edges (back to front would be ideal; for ambient
    // we just sort by avg depth descending so far-back drawn first) ──
    const drawableLinks = [];
    for (const [i, j] of links) {
      const pa = proj[i], pb = proj[j];
      if (!pa || !pb) continue;
      const d = (pa.depth + pb.depth) * 0.5;
      drawableLinks.push({ i, j, pa, pb, d });
    }
    drawableLinks.sort((a, b) => b.d - a.d);

    for (const e of drawableLinks) {
      const fa = fogAlpha(e.pa.depth);
      const fb = fogAlpha(e.pb.depth);
      const a = Math.min(fa, fb) * 0.35;
      if (a < 0.01) continue;
      // RTL mode: edges snap to copper colour during Manhattan re-route
      const edgeR = Math.round(180 + rtlProgress * 55);
      const edgeG = Math.round(170 - rtlProgress * 100);
      const edgeB = Math.round(230 - rtlProgress * 170);
      ctx.strokeStyle = `rgba(${edgeR},${edgeG},${edgeB},${a})`;
      ctx.lineWidth = Math.max(0.4, 0.9 * Math.min(e.pa.scale, e.pb.scale));
      ctx.beginPath();
      ctx.moveTo(e.pa.sx, e.pa.sy);
      if (rtlProgress > 0.01) {
        // Blend corner from midpoint (straight) → Manhattan elbow
        const mx = (e.pa.sx + e.pb.sx) * 0.5;
        const my = (e.pa.sy + e.pb.sy) * 0.5;
        const cx = mx + (e.pb.sx - mx) * rtlProgress;
        const cy = my + (e.pa.sy - my) * rtlProgress;
        ctx.lineTo(cx, cy);
      }
      ctx.lineTo(e.pb.sx, e.pb.sy);
      ctx.stroke();
    }

    // ── Draw nodes back-to-front ──
    const order = [];
    for (let i = 0; i < nodes.length; i++) if (proj[i]) order.push(i);
    order.sort((a, b) => proj[b].depth - proj[a].depth);

    for (const i of order) {
      const n = nodes[i];
      const p = proj[i];
      const a = fogAlpha(p.depth);
      if (a < 0.02) continue;
      const r = Math.max(0.4, n.r3d * p.scale);

      // halo (modest — we don't want bokeh)
      const halo = r * (2 + 1.5 * a);
      const grad = ctx.createRadialGradient(p.sx, p.sy, 0, p.sx, p.sy, halo);
      grad.addColorStop(0, n.color + Math.round(a * 70).toString(16).padStart(2, '0'));
      grad.addColorStop(0.6, n.color + Math.round(a * 18).toString(16).padStart(2, '0'));
      grad.addColorStop(1, n.color + '00');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(p.sx, p.sy, halo, 0, Math.PI * 2);
      ctx.fill();

      // hard core
      ctx.fillStyle = n.color + Math.round(a * 235).toString(16).padStart(2, '0');
      ctx.beginPath();
      ctx.arc(p.sx, p.sy, r, 0, Math.PI * 2);
      ctx.fill();

      // label — show when node is close/large enough to read
      if (r > 2.5 && a > 0.18) {
        const labelAlpha = Math.min(1, (r - 2.5) / 6) * a * 0.85;
        const fontSize = Math.max(9, Math.min(13, r * 1.1));
        ctx.font = `300 ${fontSize}px "JetBrains Mono", monospace`;
        ctx.fillStyle = `rgba(245, 242, 235, ${labelAlpha})`;
        ctx.fillText(n.label, p.sx + r + 5, p.sy + fontSize * 0.35);
      }
    }

    // ── Tapeout: draw die seal at centre during hold ──────────
    if (tapeoutPhase === 2 || (tapeoutPhase === 3 && tapeoutCollapse > 0.05)) {
      const holdAlpha = tapeoutPhase === 2
        ? Math.min(1, (t - tapeoutT0 + (tapeoutPhase === 2 ? 0 : TAPEOUT_HOLD)) / 300)
        : tapeoutCollapse;
      const sz = 52;
      const cx = W / 2, cy = H / 2;
      const mk = 8; // corner mark length
      ctx.strokeStyle = `rgba(255,199,90,${holdAlpha * 0.9})`;
      ctx.lineWidth = 1.5;
      // die outline
      ctx.strokeRect(cx - sz/2, cy - sz/2, sz, sz);
      // corner crosshair marks
      for (const [dx, dy] of [[-1,-1],[1,-1],[-1,1],[1,1]]) {
        const ox = cx + dx * sz/2, oy = cy + dy * sz/2;
        ctx.beginPath(); ctx.moveTo(ox + dx * mk, oy); ctx.lineTo(ox, oy); ctx.lineTo(ox, oy + dy * mk); ctx.stroke();
      }
      // centre label
      ctx.font = `400 10px "JetBrains Mono", monospace`;
      ctx.fillStyle = `rgba(255,199,90,${holdAlpha * 0.75})`;
      ctx.textAlign = 'center';
      ctx.fillText('TAPEOUT COMPLETE', cx, cy - sz/2 - 10);
      ctx.fillText('DRC: CLEAN · LVS: CLEAN', cx, cy + sz/2 + 18);
      ctx.textAlign = 'left';
    }
  }

  // Recompute tube depth on resize / dom changes
  let lastDocH = 0;
  function maybeUpdateTube() {
    const docH = document.documentElement.scrollHeight;
    if (Math.abs(docH - lastDocH) > 50) {
      lastDocH = docH;
      const newTube = pageDepth();
      const ratio = newTube / TUBE_DEPTH;
      if (ratio !== 1) {
        for (const n of nodes) n.z = n.zf * newTube;
        TUBE_DEPTH = newTube;
      }
    }
  }
  setInterval(maybeUpdateTube, 1500);

  let raf;
  let timer;
  function loop(t) {
    try { render(t); } catch (e) { console.error('graph-fly render failed', e); return; }
    raf = requestAnimationFrame(loop);
  }
  // Render the first frame immediately so the canvas isn't blank before
  // the first RAF tick (esp. in background tabs / on initial paint).
  render(performance.now());
  raf = requestAnimationFrame(loop);

  // Fallback: if the tab is in the background RAF throttles aggressively;
  // a low-rate setInterval keeps SOMETHING drawn so when the user comes
  // back the canvas isn't empty for a frame.
  function backgroundTick() {
    if (document.hidden) {
      try { render(performance.now()); } catch (e) {}
    }
  }
  timer = setInterval(backgroundTick, 500);

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) cancelAnimationFrame(raf);
    else raf = requestAnimationFrame(loop);
  });
})();
