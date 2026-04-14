/**
 * Silicon wafer fabrication loading animation (Canvas 2D — no WebGL conflict).
 * Dies fill radially from center; optional yield pulse at completion.
 */

const COLORS = {
  siliconFill: 'rgba(132, 137, 145, 0.14)',
  siliconStroke: 'rgba(132, 137, 145, 0.35)',
  ring: 'rgba(162, 167, 175, 0.22)',
  dieDark: 'rgba(42, 49, 57, 0.85)',
  dieGold: 'rgba(215, 179, 90, 0.92)',
  dieGoldFlash: 'rgba(242, 202, 105, 1)',
  yieldBloom: 'rgba(224, 185, 108, 0.45)',
};

function clamp01(v) {
  return Math.max(0, Math.min(1, v));
}

function pulseYield(t) {
  return 0.5 + 0.5 * Math.sin(t * 5);
}

/** @param {CanvasRenderingContext2D} ctx */
function fillRoundRect(ctx, x, y, w, h, r) {
  if (typeof ctx.roundRect === 'function') {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
    ctx.fill();
    return;
  }
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
  ctx.fill();
}

export class WaferLoader {
  /**
   * @param {HTMLCanvasElement} canvas
   */
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: true });
    this.dpr = Math.min(typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1, 2);

    this.progress = 0;
    /** 0–1 wafer fade-in driven by progress in [0, 0.06] */
    this.waferAppear = 0;
    /** Number of dies that should appear lit (float for smooth fill) */
    this.litTarget = 0;

    this.yieldPhase = false;
    this.yieldT = 0;
    this.yieldDuration = 1.15;
    this._yieldResolve = null;

    this._running = true;
    this._time = 0;

    /** @type {{ x: number, y: number, w: number, h: number, d: number, a: number }[]} */
    this.dies = [];

    this._onResize = () => this._resize();
    window.addEventListener('resize', this._onResize);
    this._resize();

    this._loop = this._loop.bind(this);
    requestAnimationFrame(this._loop);
  }

  _resize() {
    const parent = this.canvas.parentElement;
    const logical = Math.min(280, typeof window !== 'undefined' ? window.innerWidth * 0.4 : 280);
    const size = parent ? Math.min(parent.clientWidth || logical, logical) : logical;
    const w = Math.max(200, size);
    const h = w;
    this._logicalW = w;
    this._logicalH = h;
    this.canvas.style.width = `${w}px`;
    this.canvas.style.height = `${h}px`;
    this.canvas.width = Math.floor(w * this.dpr);
    this.canvas.height = Math.floor(h * this.dpr);
    this._buildDies(w, h);
  }

  /**
   * Build rectangular dies inside the wafer circle; sort by distance then angle (center-out sweep).
   */
  _buildDies(w, h) {
    const cx = w / 2;
    const cy = h / 2;
    const R = Math.min(w, h) * 0.46;
    const cols = 14;
    const rows = 14;
    const cellW = (2 * R) / cols;
    const cellH = (2 * R) / rows;
    const list = [];

    const startX = cx - R + cellW * 0.5;
    const startY = cy - R + cellH * 0.5;

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const px = startX + col * cellW;
        const py = startY + row * cellH;
        const dx = px - cx;
        const dy = py - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist + Math.max(cellW, cellH) * 0.35 > R) continue;

        const dieW = cellW * 0.72;
        const dieH = cellH * 0.72;
        const angle = Math.atan2(dy, dx);
        list.push({
          x: px - dieW * 0.5,
          y: py - dieH * 0.5,
          w: dieW,
          h: dieH,
          d: dist,
          a: angle,
        });
      }
    }

    list.sort((p, q) => {
      if (Math.abs(p.d - q.d) > 0.5) return p.d - q.d;
      return p.a - q.a;
    });
    this.dies = list;
  }

  /**
   * @param {number} p 0..1 overall load progress
   */
  setProgress(p) {
    const v = clamp01(p);
    this.progress = v;
    // Wafer materializes in first ~6% of bar
    this.waferAppear = clamp01(v / 0.06);
    // Dies map from ~5% to ~98% so yield can play at the end
    const t0 = 0.05;
    const t1 = 0.98;
    const u = clamp01((v - t0) / (t1 - t0));
    this.litTarget = u * (this.dies.length || 1);
  }

  /**
   * Run yield pulse; returns a Promise that resolves when the animation can hand off to page reveal.
   */
  triggerYield() {
    return new Promise((resolve) => {
      this.yieldPhase = true;
      this.yieldT = 0;
      this._yieldResolve = resolve;
    });
  }

  destroy() {
    this._running = false;
    window.removeEventListener('resize', this._resize);
    if (this._yieldResolve) {
      this._yieldResolve();
      this._yieldResolve = null;
    }
  }

  _loop(now) {
    if (!this._running) return;
    const delta = this._time ? (now - this._time) * 0.001 : 0.016;
    this._time = now;

    if (this.yieldPhase) {
      this.yieldT += delta;
      if (this.yieldT >= this.yieldDuration && this._yieldResolve) {
        const fn = this._yieldResolve;
        this._yieldResolve = null;
        this.yieldPhase = false;
        fn();
      }
    }

    this._draw();
    requestAnimationFrame(this._loop);
  }

  _draw() {
    const ctx = this.ctx;
    const dpr = this.dpr;
    const w = this._logicalW;
    const h = this._logicalH;
    if (!w || !h) return;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    const cx = w / 2;
    const cy = h / 2;
    const R = Math.min(w, h) * 0.46;

    const appear = this.waferAppear * (1 - 0.08 * Math.sin(this._time * 0.002));

    ctx.save();
    ctx.globalAlpha = appear;

    // Wafer body + orientation flat (chord at bottom)
    const notch = 0.11;
    ctx.beginPath();
    ctx.arc(cx, cy, R, Math.PI / 2 + notch, Math.PI / 2 - notch, true);
    ctx.closePath();
    ctx.fillStyle = COLORS.siliconFill;
    ctx.fill();
    ctx.strokeStyle = COLORS.siliconStroke;
    ctx.lineWidth = 1.25;
    ctx.stroke();

    // Concentric rings (inside wafer)
    for (let i = 1; i <= 4; i++) {
      const r = (R * i) / 5;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.strokeStyle = COLORS.ring;
      ctx.lineWidth = 0.6;
      ctx.stroke();
    }

    ctx.restore();

    // Yield radial bloom (between wafer and dies for depth)
    if (this.yieldPhase) {
      const y = Math.min(1, this.yieldT / 0.45);
      const pulse = 0.55 + 0.45 * Math.sin(this.yieldT * 6);
      const grd = ctx.createRadialGradient(cx, cy, R * 0.1, cx, cy, R * (1.1 + y * 0.4));
      grd.addColorStop(0, `rgba(224, 185, 108, ${0.38 * pulse})`);
      grd.addColorStop(0.45, `rgba(224, 185, 108, ${0.14 * pulse})`);
      grd.addColorStop(1, 'rgba(224, 185, 108, 0)');
      ctx.beginPath();
      ctx.arc(cx, cy, R * 1.35, 0, Math.PI * 2);
      ctx.fillStyle = grd;
      ctx.fill();
    }

    // Dies
    const dieAlpha = clamp01((appear - 0.2) / 0.8);
    const n = this.dies.length;
    const litF = this.litTarget;

    for (let i = 0; i < n; i++) {
      const d = this.dies[i];
      const fi = Math.floor(litF);
      let t = 0;
      if (i < fi) t = 1;
      else if (i === fi && litF > fi) t = litF - fi;
      else t = 0;

      let alpha = dieAlpha;
      let fill = COLORS.dieDark;

      if (t > 0) {
        const isEdge = t < 1;
        fill = isEdge ? COLORS.dieGoldFlash : COLORS.dieGold;
        const edgeFlash = isEdge && !this.yieldPhase ? 0.38 + 0.62 * Math.sin(this._time * 0.018) : 1;
        const yPulse = this.yieldPhase && t >= 0.999 ? 0.72 + 0.28 * pulseYield(this.yieldT) : 1;
        alpha *= t * edgeFlash * yPulse;
      } else {
        alpha *= 0.88;
      }

      ctx.globalAlpha = alpha;
      ctx.fillStyle = fill;
      ctx.shadowColor = 'rgba(215, 179, 90, 0.4)';
      ctx.shadowBlur = t > 0.25 ? 3.5 * t : 0;
      fillRoundRect(ctx, d.x, d.y, d.w, d.h, 1.5);
      ctx.shadowBlur = 0;
    }

    ctx.globalAlpha = 1;
  }
}
