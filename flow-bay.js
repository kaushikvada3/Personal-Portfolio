// One module, three abstractions, one clock.
// A 4-bit synchronous counter rendered as: SystemVerilog source,
// RTL gates, placed-and-routed standard cells, and a live waveform.
// Every view reads from the same bit-state — hover any signal to
// highlight it across all four views.

(() => {
  const host = document.getElementById('flow-bay');
  if (!host) return;

  const canvas = document.createElement('canvas');
  host.appendChild(canvas);
  const ctx = canvas.getContext('2d');
  const DPR = Math.min(window.devicePixelRatio || 1, 2);
  const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;

  let W = 0, H = 0;
  let regions = {};
  const PAD = 16;

  function layoutRegions() {
    const usableW = W - PAD * 2;
    const svH = 84;
    const wfH = 92;
    const gaps = 8 * 3;
    const remain = (H - PAD * 2) - svH - wfH - gaps;
    const rtlH = Math.floor(remain * 0.5);
    const layH = remain - rtlH;
    const y = PAD;
    regions = {
      sv:  { x: PAD, y,                                            w: usableW, h: svH },
      rtl: { x: PAD, y: y + svH + 8,                               w: usableW, h: rtlH },
      lay: { x: PAD, y: y + svH + 8 + rtlH + 8,                    w: usableW, h: layH },
      wf:  { x: PAD, y: y + svH + 8 + rtlH + 8 + layH + 8,         w: usableW, h: wfH },
    };
  }

  function resize() {
    const r = host.getBoundingClientRect();
    W = Math.max(560, r.width);
    H = Math.max(380, r.height);
    canvas.width  = W * DPR;
    canvas.height = H * DPR;
    canvas.style.width  = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    layoutRegions();
  }

  // ─── State ────────────────────────────────────────────────
  let q = 0;
  let clkLevel = 0;
  let phase = 0;
  const HALF_PERIOD_MS = 420;
  let isPaused = REDUCED;
  let stepRequest = false;
  let lastT = performance.now();
  const HIST_MAX = 42;
  const history = [];
  let hoverSig = null;
  let mouseX = -1, mouseY = -1;
  let hits = [];

  function pushHistory() {
    history.push({ q, clk: clkLevel });
    if (history.length > HIST_MAX) history.shift();
  }
  function reset() {
    q = 0; clkLevel = 0; phase = 0;
    history.length = 0;
    for (let i = 0; i < 10; i++) pushHistory();
  }

  function doEdge(to) {
    const rising = !clkLevel && to;
    clkLevel = to;
    if (rising) q = (q + 1) & 0xF;
    pushHistory();
  }
  function tick(dt) {
    if (stepRequest) {
      doEdge(1); doEdge(0);
      stepRequest = false;
      return;
    }
    if (isPaused) return;
    phase += dt / HALF_PERIOD_MS;
    while (phase >= 1) { phase -= 1; doEdge(clkLevel ? 0 : 1); }
  }

  // ─── Signal model ─────────────────────────────────────────
  function sigVal(s) {
    if (!s) return 0;
    if (s === 'clk')   return clkLevel;
    if (s === 'rst_n') return 1;
    if (s === 'add')   return 1;
    if (s[0] === 'q')  return (q >> +s[1]) & 1;
    return 0;
  }
  const COL = {
    clk:   ['#FF6B9D', 'rgba(255,107,157,0.30)'],
    rst_n: ['#FF7A7A', 'rgba(255,122,122,0.30)'],
    q0:    ['#FFC75A', 'rgba(255,199,90,0.28)'],
    q1:    ['#FFC75A', 'rgba(255,199,90,0.28)'],
    q2:    ['#FFC75A', 'rgba(255,199,90,0.28)'],
    q3:    ['#FFC75A', 'rgba(255,199,90,0.28)'],
    add:   ['#9B7BFF', 'rgba(155,123,255,0.30)'],
  };
  const HOT = '#5AD3FF';
  function wireCol(s) {
    if (hoverSig === s) return HOT;
    const c = COL[s];
    if (!c) return 'rgba(255,255,255,0.25)';
    return sigVal(s) ? c[0] : c[1];
  }
  function wireW(s) { return hoverSig === s ? 2.4 : 1.5; }

  // ─── Primitives ───────────────────────────────────────────
  function rr(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
  function panel(r, title) {
    ctx.fillStyle = 'rgba(255,255,255,0.018)';
    rr(r.x, r.y, r.w, r.h, 8);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,199,90,0.55)';
    ctx.font = '500 9px "JetBrains Mono", monospace';
    const tw = ctx.measureText(title).width;
    ctx.fillText(title, r.x + r.w - tw - 10, r.y + 13);
  }
  function hitBox(x, y, w, h, sig) { hits.push({ x, y, w, h, sig }); }
  function poly(pts, sig) {
    ctx.strokeStyle = wireCol(sig);
    ctx.lineWidth = wireW(sig);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.stroke();
  }

  // ─── 1) SystemVerilog source ──────────────────────────────
  function drawSV() {
    const r = regions.sv;
    panel(r, 'src · counter4.sv');
    const KW  = 'rgba(155,123,255,0.92)';
    const ID  = 'rgba(245,242,235,0.96)';
    const NUM = 'rgba(255,199,90,0.92)';
    const OP  = 'rgba(245,242,235,0.42)';
    const STR = 'rgba(122,184,255,0.92)';
    const lines = [
      [[KW,'module '],[ID,'counter4'], [OP,' ('],[KW,'input '],[KW,'logic '],[ID,'clk'],[OP,', '],[ID,'rst_n'],[OP,', '],[KW,'output '],[KW,'logic '],[OP,'[3:0] '],[ID,'q'],[OP,');']],
      [[OP,'  '],[KW,'always_ff '],[OP,'@('],[KW,'posedge '],[ID,'clk'],[OP,')']],
      [[OP,'    '],[ID,'q '],[OP,'<= '],[ID,'rst_n '],[OP,'? '],[ID,'q '],[OP,'+ '],[NUM,'1 '],[OP,': '],[STR,"'0"],[OP,';']],
      [[KW,'endmodule']],
    ];
    ctx.font = '500 12px "JetBrains Mono", ui-monospace, monospace';
    let y = r.y + 28;
    for (const line of lines) {
      let x = r.x + 16;
      for (const [color, text] of line) {
        ctx.fillStyle = color;
        ctx.fillText(text, x, y);
        x += ctx.measureText(text).width;
      }
      y += 14;
    }
  }

  // ─── 2) RTL gates ─────────────────────────────────────────
  function drawRTL() {
    const r = regions.rtl;
    panel(r, 'rtl · synthesized gates');

    const clkRailY = r.y + 24;
    const qBusY    = r.y + r.h - 22;
    const cy       = r.y + r.h * 0.52;

    // Adder block
    const addX = r.x + 24, addY = cy - 30, addW = 70, addH = 60;
    drawBlock(addX, addY, addW, addH, '+1', 'add');

    // Four DFFs
    const dffW = 54, dffH = 50;
    const slotW = (r.w - 100 - 40) / 4;
    const dffXs = [];
    for (let i = 0; i < 4; i++) {
      const x = addX + addW + 38 + i * slotW + (slotW - dffW) / 2;
      dffXs.push(x);
      drawDFF(x, cy - dffH / 2, dffW, dffH, i);
    }

    // Clock rail across top
    poly([[r.x + 16, clkRailY], [r.x + r.w - 16, clkRailY]], 'clk');
    for (const x of dffXs) poly([[x + dffW / 2, clkRailY], [x + dffW / 2, cy - dffH / 2]], 'clk');
    sigLabel(r.x + 18, clkRailY - 6, 'clk', 'clk');
    sigLabel(r.x + 56, clkRailY - 6, 'rst_n', 'rst_n');

    // Adder -> first DFF D
    poly([[addX + addW, cy], [dffXs[0], cy]], 'add');

    // DFF Qs -> qBus -> back to adder input
    for (let i = 0; i < 4; i++) {
      const x = dffXs[i] + dffW;
      const sig = 'q' + i;
      poly([[x, cy], [x + 8, cy], [x + 8, qBusY]], sig);
      sigLabel(x + 14, cy + 4, 'q[' + i + ']', sig);
    }
    // bundled feedback rail (purple, combinational)
    poly([
      [dffXs[0] + dffW + 8, qBusY],
      [addX + addW * 0.5, qBusY],
      [addX + addW * 0.5, addY + addH],
    ], 'add');
  }

  function drawDFF(x, y, w, h, i) {
    const sig = 'q' + i;
    const hot = hoverSig === sig;
    ctx.fillStyle = hot ? 'rgba(90,211,255,0.10)' : 'rgba(255,255,255,0.04)';
    ctx.strokeStyle = hot ? HOT : 'rgba(255,255,255,0.20)';
    ctx.lineWidth = hot ? 1.4 : 1;
    rr(x, y, w, h, 5);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = hot ? HOT : 'rgba(245,242,235,0.85)';
    ctx.font = '500 11px "JetBrains Mono", monospace';
    ctx.fillText('DFF', x + w / 2 - 11, y + h / 2 + 4);
    // clock chevron
    ctx.strokeStyle = hot ? HOT : 'rgba(255,255,255,0.45)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + 5, y + h - 9);
    ctx.lineTo(x + 11, y + h - 5);
    ctx.lineTo(x + 5, y + h - 1);
    ctx.stroke();
    hitBox(x, y, w, h, sig);
  }
  function drawBlock(x, y, w, h, label, sig) {
    const hot = hoverSig === sig;
    ctx.fillStyle = hot ? 'rgba(90,211,255,0.10)' : 'rgba(255,255,255,0.04)';
    ctx.strokeStyle = hot ? HOT : 'rgba(155,123,255,0.45)';
    ctx.lineWidth = hot ? 1.4 : 1;
    rr(x, y, w, h, 5);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = hot ? HOT : 'rgba(245,242,235,0.9)';
    ctx.font = '300 18px "Newsreader", serif';
    const tw = ctx.measureText(label).width;
    ctx.fillText(label, x + (w - tw) / 2, y + h / 2 + 7);
    hitBox(x, y, w, h, sig);
  }
  function sigLabel(x, y, text, sig) {
    const hot = hoverSig === sig;
    ctx.fillStyle = hot ? HOT : 'rgba(245,242,235,0.50)';
    ctx.font = '500 9px "JetBrains Mono", monospace';
    ctx.fillText(text, x, y);
    const tw = ctx.measureText(text).width;
    hitBox(x - 2, y - 9, tw + 4, 13, sig);
  }

  // ─── 3) Standard-cell layout ──────────────────────────────
  function drawLayout() {
    const r = regions.lay;
    panel(r, 'p&r · placed + routed');

    const margin = 18;
    const innerW = r.w - margin * 2;
    const rowH = (r.h - margin * 2 - 12) / 2;
    const rowGap = 12;

    const topRowY = r.y + margin + 4;
    const botRowY = topRowY + rowH + rowGap;
    const cellW = (innerW - 16) / 4 - 4;
    const cellH = rowH - 16;
    const cellY1 = topRowY + 8;
    const cellY2 = botRowY + 8;

    // Power rails
    drawRail(r.x + margin, r.x + r.w - margin, topRowY, 'VDD');
    drawRail(r.x + margin, r.x + r.w - margin, topRowY + rowH, 'VSS');
    drawRail(r.x + margin, r.x + r.w - margin, botRowY, 'VDD');
    drawRail(r.x + margin, r.x + r.w - margin, botRowY + rowH, 'VSS');

    // M1 feedback bus (horizontal, between rows)
    const busY = botRowY - rowGap / 2;
    drawM1(r.x + margin + 6, r.x + r.w - margin - 6, busY, 'add');

    // Cells + routing per bit slice
    for (let i = 0; i < 4; i++) {
      const cx = r.x + margin + 8 + i * (cellW + 4);
      drawCell(cx, cellY1, cellW, cellH, 'ADDH_' + i, 'add');
      drawCell(cx, cellY2, cellW, cellH, 'DFFX1_' + i, 'q' + i);

      // M2 (vertical) — q[i] from DFF output up to feedback bus then up to ADDH
      const qX = cx + cellW * 0.78;
      drawM2(qX, cellY2, busY, 'q' + i);
      drawVia(qX, busY);
      drawM2(qX, busY, cellY1 + cellH, 'add');
      drawVia(qX, cellY1 + cellH);

      // Clock distribution: M2 vertical, one branch per cell, spanning both rows
      const clkX = cx + cellW * 0.22;
      drawM2(clkX, topRowY + 2, cellY2 + cellH, 'clk');
      drawVia(clkX, cellY1 + cellH);
      drawVia(clkX, cellY2 + cellH);
    }

    // Clock trunk along the top — M1 horizontal connecting all clock branches
    drawM1(r.x + margin + 6, r.x + r.w - margin - 6, topRowY + 2, 'clk');
  }
  function drawCell(x, y, w, h, name, sig) {
    const hot = hoverSig === sig;
    const grad = ctx.createLinearGradient(0, y, 0, y + h);
    if (hot) {
      grad.addColorStop(0, 'rgba(90,211,255,0.30)');
      grad.addColorStop(1, 'rgba(90,211,255,0.10)');
    } else {
      grad.addColorStop(0, 'rgba(40,38,56,0.95)');
      grad.addColorStop(1, 'rgba(22,20,32,0.95)');
    }
    ctx.fillStyle = grad;
    ctx.strokeStyle = hot ? HOT : 'rgba(255,255,255,0.18)';
    ctx.lineWidth = 1;
    rr(x, y, w, h, 3);
    ctx.fill();
    ctx.stroke();
    // poly streaks
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 1;
    for (let i = 1; i < 5; i++) {
      const px = x + (w / 5) * i;
      ctx.beginPath();
      ctx.moveTo(px, y + 3);
      ctx.lineTo(px, y + h - 3);
      ctx.stroke();
    }
    // name
    ctx.fillStyle = hot ? '#FFFFFF' : 'rgba(245,242,235,0.7)';
    ctx.font = '500 9px "JetBrains Mono", monospace';
    const tw = ctx.measureText(name).width;
    if (tw < w - 6) ctx.fillText(name, x + (w - tw) / 2, y + h / 2 + 3);
    hitBox(x, y, w, h, sig);
  }
  function drawRail(x1, x2, y, kind) {
    ctx.strokeStyle = kind === 'VDD' ? 'rgba(255,107,107,0.45)' : 'rgba(122,184,255,0.40)';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(x1, y); ctx.lineTo(x2, y);
    ctx.stroke();
  }
  function drawM1(x1, x2, y, sig) {
    const v = sigVal(sig);
    const hot = hoverSig === sig;
    ctx.strokeStyle = hot ? HOT : (v ? 'rgba(122,184,255,0.92)' : 'rgba(122,184,255,0.22)');
    ctx.lineWidth = hot ? 3 : 2;
    ctx.beginPath();
    ctx.moveTo(x1, y); ctx.lineTo(x2, y);
    ctx.stroke();
  }
  function drawM2(x, y1, y2, sig) {
    const v = sigVal(sig);
    const hot = hoverSig === sig;
    ctx.strokeStyle = hot ? HOT : (v ? 'rgba(155,123,255,0.90)' : 'rgba(155,123,255,0.22)');
    ctx.lineWidth = hot ? 3 : 2;
    ctx.beginPath();
    ctx.moveTo(x, y1); ctx.lineTo(x, y2);
    ctx.stroke();
  }
  function drawVia(x, y) {
    ctx.fillStyle = 'rgba(255,199,90,0.95)';
    ctx.fillRect(x - 2, y - 2, 4, 4);
  }

  // ─── 4) Waveform ──────────────────────────────────────────
  function drawWF() {
    const r = regions.wf;
    panel(r, 'wave · q[3:0]');
    const tracks = ['clk', 'q3', 'q2', 'q1', 'q0'];
    const trackH = (r.h - 18) / tracks.length;
    const xL = r.x + 58;
    const xR = r.x + r.w - 16;
    const stepW = (xR - xL) / HIST_MAX;
    for (let ti = 0; ti < tracks.length; ti++) {
      const sig = tracks[ti];
      const cy = r.y + 9 + trackH * ti + trackH / 2;
      ctx.strokeStyle = 'rgba(255,255,255,0.05)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(xL, cy); ctx.lineTo(xR, cy);
      ctx.stroke();
      const hot = hoverSig === sig;
      ctx.fillStyle = hot ? HOT : 'rgba(245,242,235,0.55)';
      ctx.font = '500 10px "JetBrains Mono", monospace';
      const txt = sig === 'clk' ? 'clk' : 'q[' + sig.slice(1) + ']';
      ctx.fillText(txt, r.x + 12, cy + 3);
      ctx.strokeStyle = hot ? HOT : (sig === 'clk' ? '#FF6B9D' : '#FFC75A');
      ctx.lineWidth = hot ? 2 : 1.5;
      ctx.beginPath();
      const hi = -trackH * 0.32;
      const lo =  trackH * 0.32;
      const valAt = (entry, s) => s === 'clk' ? entry.clk : (entry.q >> +s.slice(1)) & 1;
      for (let i = 0; i < history.length; i++) {
        const x = xR - (history.length - 1 - i) * stepW;
        const v = valAt(history[i], sig);
        const yT = cy + (v ? hi : lo);
        if (i === 0) ctx.moveTo(x, yT);
        else {
          const pv = valAt(history[i - 1], sig);
          const yPrev = cy + (pv ? hi : lo);
          ctx.lineTo(x, yPrev);
          ctx.lineTo(x, yT);
        }
      }
      ctx.stroke();
      hitBox(r.x + 6, cy - trackH / 2 + 2, r.w - 12, trackH - 4, sig);
    }
    // now-cursor
    ctx.strokeStyle = 'rgba(255,199,90,0.45)';
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(xR, r.y + 8); ctx.lineTo(xR, r.y + r.h - 6);
    ctx.stroke();
    ctx.setLineDash([]);
    // q hex
    const hex = "q = 4'h" + q.toString(16).toUpperCase();
    ctx.font = '500 11px "JetBrains Mono", monospace';
    const tw = ctx.measureText(hex).width;
    ctx.fillStyle = 'rgba(255,199,90,0.95)';
    ctx.fillText(hex, xR - tw, r.y + r.h - 4);
  }

  // ─── Render loop ──────────────────────────────────────────
  function render() {
    ctx.clearRect(0, 0, W, H);
    hits = [];
    drawSV();
    drawRTL();
    drawLayout();
    drawWF();
    // resolve hover (last hit wins, so waveform tracks win over panels)
    let newHover = null;
    for (let i = hits.length - 1; i >= 0; i--) {
      const b = hits[i];
      if (mouseX >= b.x && mouseX <= b.x + b.w && mouseY >= b.y && mouseY <= b.y + b.h) {
        newHover = b.sig;
        break;
      }
    }
    if (newHover !== hoverSig) {
      hoverSig = newHover;
      host.style.cursor = newHover ? 'pointer' : 'default';
    }
  }
  let raf = 0;
  let visible = false;
  function loop(t) {
    raf = 0;
    if (!visible) return;
    // Clamp dt so a resume after tab-switch / scroll-away doesn't
    // fast-forward the counter through dozens of skipped clock edges.
    const dt = Math.min(t - lastT, 100);
    lastT = t;
    tick(dt);
    render();
    raf = requestAnimationFrame(loop);
  }
  function startLoop() {
    if (raf || !visible) return;
    lastT = performance.now();
    raf = requestAnimationFrame(loop);
  }

  // ─── Mouse ────────────────────────────────────────────────
  canvas.addEventListener('mousemove', (e) => {
    const r = canvas.getBoundingClientRect();
    mouseX = e.clientX - r.left;
    mouseY = e.clientY - r.top;
  });
  canvas.addEventListener('mouseleave', () => { mouseX = -1; mouseY = -1; });

  // ─── Controls ─────────────────────────────────────────────
  const controls = document.createElement('div');
  controls.className = 'flow-controls';
  controls.innerHTML = `
    <button data-act="run"   title="run">▶</button>
    <button data-act="pause" title="pause">❚❚</button>
    <button data-act="step"  title="step one clock">⏭</button>
    <button data-act="reset" title="reset">↺</button>`;
  host.appendChild(controls);
  function syncButtons() {
    controls.querySelectorAll('button').forEach(b => {
      const a = b.dataset.act;
      b.classList.toggle('active',
        (a === 'run'   && !isPaused) ||
        (a === 'pause' &&  isPaused)
      );
    });
  }
  controls.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    const a = b.dataset.act;
    if (a === 'run')   isPaused = false;
    if (a === 'pause') isPaused = true;
    if (a === 'step')  { isPaused = true; stepRequest = true; }
    if (a === 'reset') reset();
    syncButtons();
  });
  syncButtons();

  // ─── Init ─────────────────────────────────────────────────
  resize();
  reset();
  window.addEventListener('resize', resize);
  if ('IntersectionObserver' in window) {
    new IntersectionObserver((entries) => {
      visible = entries[entries.length - 1].isIntersecting;
      if (visible) startLoop();
    }, { threshold: 0.05 }).observe(host);
  } else {
    visible = true;
    startLoop();
  }
})();
