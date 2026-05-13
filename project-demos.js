// ─────────────────────────────────────────────────────────────
// Live demos embedded inside the two project cards.
//   • Project Obsidian: a fake VGA framebuffer + 2D blitter
//     copying sprite rects, with BLIT_X/Y/W/H registers updating
//     and a moving raster scanline.
//   • Two-Level Cache: a CPU → L1 → L2 → DRAM packet flow with
//     live hit/miss counters and color-coded routing.
// Each demo renders into a canvas dropped behind the card text
// so the title/description remain readable.
// ─────────────────────────────────────────────────────────────
(() => {
  const projects = document.querySelectorAll('.proj');
  if (!projects.length) return;

  // First proj is Obsidian, second is Two-Level Cache (per current HTML order).
  // Locate them by text content to be safer.
  let obsidianCard = null;
  let cacheCard = null;
  for (const p of projects) {
    const name = p.querySelector('.proj-name')?.textContent?.toLowerCase() || '';
    if (name.includes('obsidian')) obsidianCard = p;
    else if (name.includes('cache')) cacheCard = p;
  }
  if (obsidianCard) installBlitter(obsidianCard);
  if (cacheCard) installCache(cacheCard);

  // ─── shared helpers ──────────────────────────────────────────
  function makeCanvas(card) {
    const c = document.createElement('canvas');
    c.className = 'proj-canvas';
    c.style.cssText = `
      position: absolute; inset: 0; width: 100%; height: 100%;
      z-index: 1; pointer-events: none; opacity: 1;
    `;
    // Insert before existing .proj-art so the art still bleeds through faintly
    const art = card.querySelector('.proj-art');
    if (art) card.insertBefore(c, art.nextSibling);
    else card.prepend(c);
    return c;
  }

  function fit(canvas) {
    const r = canvas.getBoundingClientRect();
    const DPR = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.floor(r.width * DPR));
    canvas.height = Math.max(1, Math.floor(r.height * DPR));
    const ctx = canvas.getContext('2d');
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    return { ctx, W: r.width, H: r.height };
  }

  function onVisible(el, cb) {
    if (!('IntersectionObserver' in window)) return cb(true);
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) cb(e.isIntersecting);
    }, { threshold: 0.1 });
    io.observe(el);
  }

  // ═══════════════════════════════════════════════════════════
  //   PROJECT OBSIDIAN — blitter + framebuffer
  // ═══════════════════════════════════════════════════════════
  function installBlitter(card) {
    const canvas = makeCanvas(card);
    let { ctx, W, H } = fit(canvas);
    addEventListener('resize', () => ({ ctx, W, H } = fit(canvas)));

    // Logical framebuffer: low-res, "VGA-ish"
    const FB_W = 80, FB_H = 60;
    const fb = new Uint8Array(FB_W * FB_H); // palette index
    const palette = [
      '#0b0a13', // 0 — bg
      '#1c1830', // 1 — dark purple
      '#6E5CFF', // 2 — primary purple
      '#FFC75A', // 3 — gold
      '#FF6B9D', // 4 — pink
      '#7AB8FF', // 5 — blue
      '#9B7BFF', // 6 — lavender
      '#44FF99', // 7 — green
    ];

    // Sprites: small shape arrays drawn at random positions
    const sprites = makeSprites();
    function makeSprites() {
      const s = [];
      // Each sprite is 6×6 with a palette index ≠ 0
      const patterns = [
        ['......', '..2...', '.2222.', '.2222.', '..2...', '......'],
        ['..33..', '.3333.', '33333.', '.3333.', '.33...', '......'],
        ['.4..4.', '4444..', '.44444', '.4444.', '.4..4.', '......'],
        ['.55.5.', '55.55.', '55555.', '.555..', '..5...', '......'],
        ['..6...', '.666..', '66666.', '.6.6..', '6...6.', '......'],
      ];
      for (const p of patterns) {
        const arr = [];
        for (const row of p) {
          for (const ch of row) arr.push(ch === '.' ? 0 : parseInt(ch, 10));
        }
        s.push({ data: arr, w: 6, h: 6 });
      }
      return s;
    }

    // Blitter state
    let BLIT = { x: 0, y: 0, w: 6, h: 6, op: 'COPY', src: 0, frame: 0 };
    let scanline = 0;
    let lastBlit = 0;

    function clearFB() {
      for (let i = 0; i < fb.length; i++) {
        fb[i] = ((i + Math.floor(i / FB_W)) & 1) ? 0 : 1; // subtle checker bg
      }
    }
    clearFB();

    function blitSprite(s, x, y) {
      for (let j = 0; j < s.h; j++) {
        for (let i = 0; i < s.w; i++) {
          const c = s.data[j * s.w + i];
          if (!c) continue;
          const fx = x + i, fy = y + j;
          if (fx < 0 || fy < 0 || fx >= FB_W || fy >= FB_H) continue;
          fb[fy * FB_W + fx] = c;
        }
      }
    }

    let running = true;
    canvas.style.opacity = '1';
    requestAnimationFrame(loop);

    let raf;
    function loop() {
      if (!running) return;
      raf = requestAnimationFrame(loop);
      step();
      draw();
    }

    let nextBlitAt = 0;
    function step() {
      const now = performance.now();
      scanline = (scanline + 1) % FB_H;
      // Fire a new blit a few times per second
      if (now > nextBlitAt) {
        const s = sprites[Math.floor(Math.random() * sprites.length)];
        BLIT = {
          x: Math.floor(Math.random() * (FB_W - s.w)),
          y: Math.floor(Math.random() * (FB_H - s.h)),
          w: s.w, h: s.h, op: 'COPY', src: sprites.indexOf(s), frame: BLIT.frame + 1,
        };
        blitSprite(s, BLIT.x, BLIT.y);
        lastBlit = now;
        nextBlitAt = now + 220 + Math.random() * 240;
        // Occasionally clear/fade some of the framebuffer so it doesn't saturate
        if (BLIT.frame % 28 === 0) clearFB();
      }
    }

    function draw() {
      ctx.clearRect(0, 0, W, H);

      // Layout: framebuffer fills most of the card, registers strip on right
      const pad = 18;
      const regW = Math.min(170, W * 0.30);
      const fbBoxW = W - regW - pad * 3;
      const fbBoxH = H - pad * 2;
      const fbX = pad;
      const fbY = pad;
      const cellW = fbBoxW / FB_W;
      const cellH = fbBoxH / FB_H;

      // FB cells
      for (let j = 0; j < FB_H; j++) {
        for (let i = 0; i < FB_W; i++) {
          const c = fb[j * FB_W + i];
          if (c === 0) continue;
          ctx.fillStyle = palette[c];
          ctx.globalAlpha = c === 1 ? 0.22 : 0.92;
          ctx.fillRect(fbX + i * cellW, fbY + j * cellH, cellW + 0.5, cellH + 0.5);
        }
      }
      ctx.globalAlpha = 1;

      // FB bezel
      ctx.strokeStyle = 'rgba(255,255,255,0.10)';
      ctx.lineWidth = 1;
      ctx.strokeRect(fbX, fbY, fbBoxW, fbBoxH);

      // Last-blit rectangle outline
      const since = performance.now() - lastBlit;
      const a = Math.max(0, 1 - since / 600);
      if (a > 0) {
        ctx.strokeStyle = `rgba(255,199,90,${a})`;
        ctx.lineWidth = 1.5;
        ctx.strokeRect(
          fbX + BLIT.x * cellW - 1,
          fbY + BLIT.y * cellH - 1,
          BLIT.w * cellW + 2,
          BLIT.h * cellH + 2,
        );
      }

      // Raster scanline
      const sy = fbY + scanline * cellH;
      ctx.fillStyle = 'rgba(122,184,255,0.10)';
      ctx.fillRect(fbX, sy, fbBoxW, cellH * 1.5);

      // Register strip
      const rx = fbX + fbBoxW + pad;
      const ry = fbY;
      const rh = fbBoxH;
      ctx.fillStyle = 'rgba(8,8,11,0.55)';
      ctx.fillRect(rx, ry, regW, rh);
      ctx.strokeStyle = 'rgba(255,199,90,0.18)';
      ctx.strokeRect(rx, ry, regW, rh);

      const lines = [
        ['BLIT_CTRL', 'V2.0'],
        ['', ''],
        ['BLIT_X', hex(BLIT.x, 2)],
        ['BLIT_Y', hex(BLIT.y, 2)],
        ['BLIT_W', hex(BLIT.w, 2)],
        ['BLIT_H', hex(BLIT.h, 2)],
        ['BLIT_OP', BLIT.op],
        ['BLIT_SRC', '$' + hex(BLIT.src, 1)],
        ['', ''],
        ['SCANLINE', hex(scanline, 2)],
        ['FRAME', hex(BLIT.frame & 0xFF, 2)],
        ['STATUS', a > 0 ? 'BUSY' : 'IDLE'],
      ];
      ctx.textBaseline = 'top';
      ctx.font = '500 9.5px "JetBrains Mono", monospace';
      const lh = (rh - 20) / lines.length;
      for (let i = 0; i < lines.length; i++) {
        const y = ry + 10 + i * lh;
        const [k, v] = lines[i];
        ctx.fillStyle = 'rgba(245,242,235,0.45)';
        ctx.fillText(k, rx + 10, y);
        ctx.fillStyle = (k === 'STATUS' && v === 'BUSY') ? '#FFC75A' : 'rgba(245,242,235,0.92)';
        ctx.textAlign = 'right';
        ctx.fillText(v, rx + regW - 10, y);
        ctx.textAlign = 'left';
      }
    }

    function hex(n, w) {
      return '0x' + n.toString(16).toUpperCase().padStart(w, '0');
    }
  }

  // ═══════════════════════════════════════════════════════════
  //   TWO-LEVEL CACHE — packet flow visualizer
  // ═══════════════════════════════════════════════════════════
  function installCache(card) {
    const canvas = makeCanvas(card);
    let { ctx, W, H } = fit(canvas);
    addEventListener('resize', () => ({ ctx, W, H } = fit(canvas)));

    // Simple LRU-ish state
    const L1_SETS = 4, L1_WAYS = 2;
    const L2_SETS = 8, L2_WAYS = 4;
    const l1 = Array.from({ length: L1_SETS }, () => Array(L1_WAYS).fill(null));
    const l2 = Array.from({ length: L2_SETS }, () => Array(L2_WAYS).fill(null));
    let l1Hits = 0, l1Miss = 0, l2Hits = 0, l2Miss = 0;
    const packets = [];

    function lookup(arr, set, tag) {
      const row = arr[set];
      for (let i = 0; i < row.length; i++) if (row[i] === tag) {
        // LRU bump
        row.splice(i, 1); row.push(tag);
        return true;
      }
      return false;
    }
    function insert(arr, set, tag) {
      const row = arr[set];
      row.shift(); row.push(tag);
    }

    let running = true;
    canvas.style.opacity = '1';
    requestAnimationFrame(loop);
    let raf;
    function loop() {
      if (!running) return;
      raf = requestAnimationFrame(loop);
      step();
      draw();
    }

    let nextReq = 0;
    function fireRequest() {
      // Address with locality: 70% same hot set, 30% random
      const hot = (Math.random() < 0.7);
      const addr = hot
        ? (0x1000 + Math.floor(Math.random() * 4) * 16)
        : Math.floor(Math.random() * 0xFFFF) & ~0xF;
      const l1Set = (addr >> 4) & (L1_SETS - 1);
      const l2Set = (addr >> 4) & (L2_SETS - 1);
      const tag = addr >> 6;

      const h1 = lookup(l1, l1Set, tag);
      let h2 = false;
      if (!h1) {
        h2 = lookup(l2, l2Set, tag);
        if (!h2) {
          // miss everywhere — fill L2 then L1
          insert(l2, l2Set, tag);
          insert(l1, l1Set, tag);
          l1Miss++; l2Miss++;
        } else {
          insert(l1, l1Set, tag);
          l1Miss++; l2Hits++;
        }
      } else {
        l1Hits++;
      }

      packets.push({
        addr, l1Set, l2Set, tag,
        path: h1 ? 'L1' : h2 ? 'L2' : 'DRAM',
        t: 0, life: h1 ? 700 : h2 ? 1100 : 1500,
      });
    }
    function step() {
      const now = performance.now();
      if (now > nextReq) {
        fireRequest();
        nextReq = now + 320 + Math.random() * 260;
      }
      const dt = 16;
      for (let i = packets.length - 1; i >= 0; i--) {
        packets[i].t += dt;
        if (packets[i].t > packets[i].life) packets.splice(i, 1);
      }
    }

    function draw() {
      ctx.clearRect(0, 0, W, H);
      const pad = 22;
      const inner = { x: pad, y: pad, w: W - pad * 2, h: H - pad * 2 };

      // Four columns: CPU | L1 | L2 | DRAM
      const cols = 4;
      const colW = inner.w / cols;
      const stops = [];
      const labels = ['CPU', 'L1 $', 'L2 $', 'DRAM'];
      for (let i = 0; i < cols; i++) {
        stops.push({ x: inner.x + colW * (i + 0.5), label: labels[i] });
      }

      // Connector rail
      ctx.strokeStyle = 'rgba(255,255,255,0.08)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(stops[0].x, inner.y + inner.h * 0.5);
      ctx.lineTo(stops[cols - 1].x, inner.y + inner.h * 0.5);
      ctx.stroke();

      // Blocks
      for (let i = 0; i < cols; i++) {
        const s = stops[i];
        const bw = colW * 0.62;
        const bh = inner.h * 0.66;
        const bx = s.x - bw / 2;
        const by = inner.y + (inner.h - bh) / 2;
        ctx.fillStyle = 'rgba(255,255,255,0.025)';
        ctx.strokeStyle = 'rgba(255,255,255,0.10)';
        ctx.lineWidth = 1;
        ctx.fillRect(bx, by, bw, bh);
        ctx.strokeRect(bx, by, bw, bh);

        ctx.fillStyle = 'rgba(245,242,235,0.85)';
        ctx.font = '500 10px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(s.label, s.x, by - 8);

        // Cache contents grid (L1, L2)
        if (i === 1 || i === 2) {
          const arr = i === 1 ? l1 : l2;
          const rows = arr.length;
          const ways = arr[0].length;
          const cw = bw / ways;
          const ch = bh / rows;
          for (let r = 0; r < rows; r++) {
            for (let w = 0; w < ways; w++) {
              const tag = arr[r][w];
              const cx = bx + w * cw;
              const cy = by + r * ch;
              ctx.fillStyle = tag == null ? 'rgba(255,255,255,0.03)' : 'rgba(155,123,255,0.30)';
              ctx.fillRect(cx + 2, cy + 2, cw - 4, ch - 4);
              if (tag != null) {
                ctx.fillStyle = 'rgba(245,242,235,0.6)';
                ctx.font = '400 8px "JetBrains Mono", monospace';
                ctx.textAlign = 'center';
                ctx.fillText('0x' + (tag & 0xFF).toString(16).padStart(2, '0').toUpperCase(),
                  cx + cw / 2, cy + ch / 2 + 3);
              }
            }
          }
        } else if (i === 3) {
          // DRAM: filled rows
          ctx.fillStyle = 'rgba(255,199,90,0.10)';
          for (let r = 0; r < 6; r++) {
            ctx.fillRect(bx + 6, by + 10 + r * 12, bw - 12, 6);
          }
        } else if (i === 0) {
          // CPU: pulsing dot
          const t = performance.now() / 1000;
          const r = 4 + Math.sin(t * 4) * 1.5;
          ctx.fillStyle = '#44FF99';
          ctx.beginPath();
          ctx.arc(s.x, by + bh / 2, r, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Packets (each travels CPU → its hit point → back to CPU)
      for (const p of packets) {
        const tFrac = p.t / p.life;
        const endIdx = p.path === 'L1' ? 1 : p.path === 'L2' ? 2 : 3;
        const goingOut = tFrac < 0.5;
        const k = goingOut ? tFrac * 2 : 1 - (tFrac - 0.5) * 2;
        const cpuX = stops[0].x;
        const endX = stops[endIdx].x;
        const x = cpuX + (endX - cpuX) * k;
        const y = inner.y + inner.h * 0.5;
        const color = p.path === 'L1' ? '#44FF99' : p.path === 'L2' ? '#FFC75A' : '#FF6B9D';
        // halo
        const grad = ctx.createRadialGradient(x, y, 0, x, y, 14);
        grad.addColorStop(0, color + '88');
        grad.addColorStop(1, color + '00');
        ctx.fillStyle = grad;
        ctx.beginPath(); ctx.arc(x, y, 14, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = color;
        ctx.beginPath(); ctx.arc(x, y, 3.5, 0, Math.PI * 2); ctx.fill();
      }

      // Stats
      ctx.font = '500 10px "JetBrains Mono", monospace';
      ctx.fillStyle = 'rgba(245,242,235,0.65)';
      ctx.textAlign = 'left';
      const ratio = (l1Hits + l1Miss) > 0 ? (100 * l1Hits / (l1Hits + l1Miss)) : 0;
      const l2ratio = (l2Hits + l2Miss) > 0 ? (100 * l2Hits / (l2Hits + l2Miss)) : 0;
      ctx.fillText(`L1 HIT ${l1Hits}  MISS ${l1Miss}  RATIO ${ratio.toFixed(1)}%`, inner.x, inner.y + inner.h + 4);
      ctx.fillText(`L2 HIT ${l2Hits}  MISS ${l2Miss}  RATIO ${l2ratio.toFixed(1)}%`, inner.x, inner.y + inner.h + 18);
    }
  }
})();
