// Draws a styled ("cute") QR code on a canvas.
// The real QR is always kept intact: finder eyes, a light margin, high error correction (H).
// Decorations outside the QR (heart / circle frames) are drawn in a light tint so scanners ignore them.
// Tested: every style decodes with OpenCV's QR reader, including blurred, tilted and small copies.
import { encodeQR } from './qrcode.js';

export const PRESETS = {
  heart:  { name: 'Big heart',     icon: '💖', frame: 'heart',  module: 'soft',   eye: 'heart',  decor: 'heart' },
  hearts: { name: 'Little hearts', icon: '💕', frame: 'square', module: 'heart',  eye: 'heart',  decor: null },
  bubble: { name: 'Bubble',        icon: '🫧', frame: 'circle', module: 'dot',    eye: 'circle', decor: 'dot' },
  petals: { name: 'Petals',        icon: '🌸', frame: 'square', module: 'leaf',   eye: 'leaf',   decor: null },
  soft:   { name: 'Soft classic',  icon: '🍬', frame: 'square', module: 'soft',   eye: 'round',  decor: null }
};

export const PALETTES = {
  rose:     { name: 'Rose',     c1: '#e11d74', c2: '#be123c', bg: '#fff6f9' },
  berry:    { name: 'Berry',    c1: '#9333ea', c2: '#6d28d9', bg: '#faf6ff' },
  ocean:    { name: 'Ocean',    c1: '#0284c7', c2: '#1e40af', bg: '#f2f9ff' },
  sunset:   { name: 'Sunset',   c1: '#ea580c', c2: '#be123c', bg: '#fff8f1' },
  mint:     { name: 'Mint',     c1: '#059669', c2: '#0f766e', bg: '#f2fdf6' },
  midnight: { name: 'Midnight', c1: '#334155', c2: '#0f172a', bg: '#ffffff' }
};

/* Gift theme -> matching QR color */
export const paletteForTheme = t => ({ rose: 'rose', lavender: 'berry', ocean: 'ocean', sunset: 'sunset', mint: 'mint' }[t] || 'rose');

/* ---------------- small geometry helpers ---------------- */
function seeded(str) {           // same link -> same decoration pattern
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) { h = Math.imul(h ^ str.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

function insidePoly(poly, x, y) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/* Outline polygon for the frame, fitted into the box (x, y, w, h).
   The heart is a "chubby" one (two overlapping circles + a soft point), so a big QR fits inside. */
function framePolygon(kind, x, y, w, h) {
  let inside, cx0 = 0, cy0 = 0;
  if (kind === 'heart') {
    const A = 0.55, TIP = 1.8;                         // circle centers at (±A, 0), radius 1, tip at (0, TIP)
    const inC = (px, py) => (px - A) ** 2 + py ** 2 <= 1 || (px + A) ** 2 + py ** 2 <= 1;
    // where the straight side touches the right circle (tangent from the tip)
    const d = Math.hypot(A, TIP), base = Math.atan2(TIP, -A), off = Math.acos(1 / d);
    const cand = [base + off, base - off].map(a => [A + Math.cos(a), Math.sin(a)]);
    const [tx, ty] = cand[0][0] > cand[1][0] ? cand[0] : cand[1];
    inside = (px, py) => {
      if (inC(px, py)) return true;
      if (py < 0 || py > TIP) return false;
      const half = py <= ty ? A + Math.sqrt(Math.max(0, 1 - py * py)) : tx * (TIP - py) / (TIP - ty);
      return Math.abs(px) <= half;
    };
    cy0 = 0.35;
  } else {
    inside = (px, py) => px * px + py * py <= 1;
  }
  // walk outwards from the middle to find the edge in 360 directions
  const pts = [];
  for (let i = 0; i < 360; i++) {
    const t = (i / 360) * Math.PI * 2, ux = Math.cos(t), uy = Math.sin(t);
    let lo = 0, hi = 4;
    for (let k = 0; k < 30; k++) { const m = (lo + hi) / 2; inside(cx0 + ux * m, cy0 + uy * m) ? (lo = m) : (hi = m); }
    pts.push([cx0 + ux * lo, cy0 + uy * lo]);
  }
  const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  const s = Math.min(w / (maxX - minX), h / (maxY - minY));
  const ox = x + (w - (maxX - minX) * s) / 2, oy = y + (h - (maxY - minY) * s) / 2;
  return pts.map(([px, py]) => [ox + (px - minX) * s, oy + (py - minY) * s]);
}

/* Largest square (centered horizontally) that fits inside the polygon */
function fitSquare(poly, box) {
  const cx = box.x + box.w / 2;
  const fits = (cy, half) => {
    for (let k = 0; k <= 24; k++) {
      const t = -half + (2 * half * k) / 24;
      if (!insidePoly(poly, cx + t, cy - half) || !insidePoly(poly, cx + t, cy + half) ||
          !insidePoly(poly, cx - half, cy + t) || !insidePoly(poly, cx + half, cy + t)) return false;
    }
    return true;
  };
  let best = { cy: box.y + box.h / 2, half: 0 };
  for (let k = 0; k <= 40; k++) {
    const cy = box.y + box.h * (0.25 + 0.5 * (k / 40));
    let lo = 0, hi = box.w / 2;
    for (let it = 0; it < 22; it++) { const mid = (lo + hi) / 2; fits(cy, mid) ? (lo = mid) : (hi = mid); }
    if (lo > best.half) best = { cy, half: lo };
  }
  return { cx, cy: best.cy, half: best.half };
}

/* ---------------- shapes ---------------- */
function roundRect(ctx, x, y, w, h, r) {           // r = [tl, tr, br, bl]
  const [tl, tr, br, bl] = r;
  ctx.moveTo(x + tl, y);
  ctx.lineTo(x + w - tr, y); tr ? ctx.arcTo(x + w, y, x + w, y + tr, tr) : ctx.lineTo(x + w, y);
  ctx.lineTo(x + w, y + h - br); br ? ctx.arcTo(x + w, y + h, x + w - br, y + h, br) : ctx.lineTo(x + w, y + h);
  ctx.lineTo(x + bl, y + h); bl ? ctx.arcTo(x, y + h, x, y + h - bl, bl) : ctx.lineTo(x, y + h);
  ctx.lineTo(x, y + tl); tl ? ctx.arcTo(x, y, x + tl, y, tl) : ctx.lineTo(x, y);
  ctx.closePath();
}

/* Heart that fills a (w x w) box centered at (cx, cy) */
export function heartPath(ctx, cx, cy, w) {
  const x = cx - w / 2, y = cy - w / 2, h = w;
  ctx.moveTo(cx, y + h * 0.98);
  ctx.bezierCurveTo(x + w * 0.38, y + h * 0.76, x - w * 0.02, y + h * 0.56, x, y + h * 0.3);
  ctx.bezierCurveTo(x, y + h * 0.06, x + w * 0.2, y - h * 0.02, x + w * 0.29, y);
  ctx.bezierCurveTo(x + w * 0.4, y + h * 0.02, x + w * 0.47, y + h * 0.08, cx, y + h * 0.2);
  ctx.bezierCurveTo(x + w * 0.53, y + h * 0.08, x + w * 0.6, y + h * 0.02, x + w * 0.71, y);
  ctx.bezierCurveTo(x + w * 0.8, y - h * 0.02, x + w, y + h * 0.06, x + w, y + h * 0.3);
  ctx.bezierCurveTo(x + w * 1.02, y + h * 0.56, x + w * 0.62, y + h * 0.76, cx, y + h * 0.98);
  ctx.closePath();
}

function moduleShape(ctx, style, x, y, c, n) {   // n = neighbours { u, d, l, r }
  const cx = x + c / 2, cy = y + c / 2;
  switch (style) {
    case 'dot': ctx.moveTo(cx + c * 0.47, cy); ctx.arc(cx, cy, c * 0.47, 0, Math.PI * 2); break;
    case 'heart': heartPath(ctx, cx, cy + c * 0.02, c * 1.08); break;
    case 'leaf': roundRect(ctx, x + c * 0.04, y + c * 0.04, c * 0.92, c * 0.92, [c * 0.46, 0, c * 0.46, 0]); break;
    case 'soft': {
      const r = c * 0.5, e = 0.5; // tiny overlap so neighbours merge without hairlines
      roundRect(ctx, x - e, y - e, c + 2 * e, c + 2 * e, [
        !n.u && !n.l ? r : 0, !n.u && !n.r ? r : 0, !n.d && !n.r ? r : 0, !n.d && !n.l ? r : 0]);
      break;
    }
    default: ctx.rect(x, y, c, c);
  }
}

/* The three big corner "eyes" (7x7 modules).
   The outer ring keeps nearly square corners (scanners use them to find the code);
   the cute part is the inner "pupil". */
const EYE_R = 0.4; // outer corner radius in modules (tested with a strict scanner)
function drawEye(ctx, style, x, y, c, bg) {
  const s = 7 * c, R = EYE_R * c;
  ctx.beginPath(); roundRect(ctx, x, y, s, s, [R, R, R, R]); ctx.fill();
  ctx.save(); ctx.fillStyle = bg; ctx.beginPath();
  const r2 = Math.max(0, R - c * 0.6);
  roundRect(ctx, x + c, y + c, 5 * c, 5 * c, [r2, r2, r2, r2]); ctx.fill(); ctx.restore();
  ctx.beginPath();
  const px = x + 2 * c, py = y + 2 * c, ps = 3 * c;
  if (style === 'circle') ctx.arc(px + ps / 2, py + ps / 2, (ps / 2) * 1.08, 0, Math.PI * 2);
  else if (style === 'heart') heartPath(ctx, px + ps / 2, py + ps / 2 + c * 0.08, ps * 1.25);
  else if (style === 'leaf') roundRect(ctx, px, py, ps, ps, [c * 1.3, c * 0.15, c * 1.3, c * 0.15]);
  else roundRect(ctx, px, py, ps, ps, [c * 0.7, c * 0.7, c * 0.7, c * 0.7]);
  ctx.fill();
}

const isEye = (x, y, n) => (x < 7 && y < 7) || (x >= n - 7 && y < 7) || (x < 7 && y >= n - 7);

/* ---------------- main ---------------- */
/*
  opts: {
    text, preset, palette, center: 'none' | 'heart' | 'initial', initial,
    caption,        // '' = no caption
    size = 1080     // width in px
  }
*/
export function renderQR(canvas, opts) {
  const P = PRESETS[opts.preset] || PRESETS.heart;
  const C = PALETTES[opts.palette] || PALETTES.rose;
  const qr = encodeQR(opts.text, 'H');
  const n = qr.size;
  const W = opts.size || 1080;
  const capH = opts.caption ? Math.round(W * 0.17) : 0;
  canvas.width = W; canvas.height = W + capH;
  const ctx = canvas.getContext('2d');
  const rand = seeded(opts.text + P.frame);

  ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, W + capH);
  const art = { x: W * 0.05, y: W * 0.05, w: W * 0.9, h: W * 0.9 };

  // 1) where does the QR go, and how big is one module?
  const MARGIN = 2; // light modules around the QR inside a frame
  let c, ox, oy, poly = null;
  if (P.frame === 'square') {
    const quiet = 3;
    c = art.w / (n + quiet * 2);
    ox = (W - n * c) / 2; oy = (W - n * c) / 2;
  } else {
    poly = framePolygon(P.frame, art.x, art.y, art.w, art.h);
    const sq = fitSquare(poly, art);
    c = (sq.half * 2) / (n + MARGIN * 2);
    ox = sq.cx - (n * c) / 2; oy = sq.cy - (n * c) / 2;
  }

  const grad = ctx.createLinearGradient(0, 0, W, W);
  grad.addColorStop(0, C.c1); grad.addColorStop(1, C.c2);

  // 2) frame: soft fill, tinted decorations, outline
  if (poly) {
    const path = () => { ctx.beginPath(); poly.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath(); };
    ctx.save(); path(); ctx.fillStyle = '#ffffff'; ctx.fill(); ctx.restore();

    ctx.save();
    ctx.globalAlpha = 0.2; ctx.fillStyle = grad; ctx.beginPath();
    const range = Math.ceil(W / c);
    for (let gy = -range; gy < range; gy++) for (let gx = -range; gx < range; gx++) {
      if (gx >= -MARGIN && gx < n + MARGIN && gy >= -MARGIN && gy < n + MARGIN) continue; // keep the QR + margin clear
      const x = ox + gx * c, y = oy + gy * c, in1 = c * 0.15;
      if (!(insidePoly(poly, x + in1, y + in1) && insidePoly(poly, x + c - in1, y + in1) &&
            insidePoly(poly, x + in1, y + c - in1) && insidePoly(poly, x + c - in1, y + c - in1))) continue;
      if (rand() < 0.5) continue;
      if (P.decor === 'heart') heartPath(ctx, x + c / 2, y + c / 2, c * 0.9);
      else { ctx.moveTo(x + c * 0.88, y + c / 2); ctx.arc(x + c / 2, y + c / 2, c * 0.38, 0, Math.PI * 2); }
    }
    ctx.fill(); ctx.restore();

    ctx.save(); path(); ctx.lineWidth = c * 0.9; ctx.lineJoin = 'round'; ctx.strokeStyle = grad; ctx.stroke(); ctx.restore();
  }

  // 3) logo area in the middle (high error correction makes this safe)
  let hole = null;
  if (opts.center && opts.center !== 'none') {
    let k = Math.round(n * 0.22); if (k % 2 === 0) k++;
    const s = Math.floor((n - k) / 2);
    hole = { x0: s, y0: s, x1: s + k, y1: s + k, k };
  }
  const inHole = (x, y) => hole && x >= hole.x0 && x < hole.x1 && y >= hole.y0 && y < hole.y1;

  // 4) data modules
  const dark = (x, y) => x >= 0 && y >= 0 && x < n && y < n && qr.isDark(x, y) && !isEye(x, y, n) && !inHole(x, y);
  ctx.fillStyle = grad; ctx.beginPath();
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    if (!dark(x, y)) continue;
    moduleShape(ctx, P.module, ox + x * c, oy + y * c, c, { u: dark(x, y - 1), d: dark(x, y + 1), l: dark(x - 1, y), r: dark(x + 1, y) });
  }
  ctx.fill();

  // 5) eyes
  ctx.fillStyle = grad;
  drawEye(ctx, P.eye, ox, oy, c, '#ffffff');
  drawEye(ctx, P.eye, ox + (n - 7) * c, oy, c, '#ffffff');
  drawEye(ctx, P.eye, ox, oy + (n - 7) * c, c, '#ffffff');

  // 6) center badge
  if (hole) {
    const bx = ox + hole.x0 * c, by = oy + hole.y0 * c, bs = hole.k * c, mid = bs / 2;
    ctx.save();
    ctx.fillStyle = '#ffffff'; ctx.beginPath();
    ctx.arc(bx + mid, by + mid, mid * 0.92, 0, Math.PI * 2); ctx.fill();
    ctx.lineWidth = c * 0.45; ctx.strokeStyle = grad; ctx.stroke();
    ctx.fillStyle = grad; ctx.beginPath();
    if (opts.center === 'initial' && opts.initial) {
      ctx.font = `700 ${Math.round(bs * 0.62)}px "Dancing Script", "Poppins", cursive`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(opts.initial.slice(0, 2), bx + mid, by + mid * 1.04);
    } else {
      heartPath(ctx, bx + mid, by + mid + c * 0.1, bs * 0.56); ctx.fill();
    }
    ctx.restore();
  }

  // 7) caption
  if (capH) {
    ctx.save();
    ctx.fillStyle = grad; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    let fs = Math.round(capH * 0.52);
    ctx.font = `700 ${fs}px "Dancing Script", "Poppins", cursive`;
    while (ctx.measureText(opts.caption).width > W * 0.86 && fs > 20) { fs -= 2; ctx.font = `700 ${fs}px "Dancing Script", "Poppins", cursive`; }
    ctx.fillText(opts.caption, W / 2, W - W * 0.01 + capH * 0.42);
    ctx.restore();
  }

  return { version: qr.version, modules: n };
}
