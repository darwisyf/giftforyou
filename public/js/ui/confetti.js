// Full-screen confetti burst on a canvas
const cv = document.getElementById('confetti');
const cx = cv.getContext('2d');
let parts = [], running = false;

function resize() {
  const dpr = window.devicePixelRatio || 1;
  cv.width = innerWidth * dpr; cv.height = innerHeight * dpr;
  cx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
addEventListener('resize', resize); resize();

export function confetti(n = 180, theme) {
  const cols = [theme ? theme.a : '#ff4d8d', theme ? theme.b : '#ff9a8b', '#ffd166', '#06d6a0', '#4cc9f0', '#ffffff', '#f72585'];
  for (let i = 0; i < n; i++) {
    const left = i % 2 === 0;
    parts.push({
      x: left ? -10 : innerWidth + 10, y: innerHeight * 0.85,
      vx: (left ? 1 : -1) * (5 + Math.random() * 12), vy: -(12 + Math.random() * 14),
      w: 6 + Math.random() * 6, h: 8 + Math.random() * 10,
      r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.35,
      c: cols[(Math.random() * cols.length) | 0]
    });
  }
  if (!running) { running = true; requestAnimationFrame(tick); }
}

function tick() {
  cx.clearRect(0, 0, innerWidth, innerHeight);
  for (const p of parts) {
    p.vy += 0.32; p.vx *= 0.985; p.vy *= 0.995;
    p.x += p.vx; p.y += p.vy; p.r += p.vr;
    cx.save(); cx.translate(p.x, p.y); cx.rotate(p.r);
    cx.fillStyle = p.c; cx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h * Math.abs(Math.cos(p.r)));
    cx.restore();
  }
  parts = parts.filter(p => p.y < innerHeight + 50);
  if (parts.length) requestAnimationFrame(tick);
  else { running = false; cx.clearRect(0, 0, innerWidth, innerHeight); }
}
