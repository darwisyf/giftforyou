// "Make a cute QR" window: pick a style, color, center and caption, then download or share the PNG
import { esc, toast } from '../core/utils.js';
import { renderQR, PRESETS, PALETTES, paletteForTheme } from './qr-styles.js';

const PREFS_KEY = 'wishy.qr.v1';
let st = null;      // current choices
let ctx = null;     // { url, to }
let renderTimer = null;

const loadPrefs = () => { try { return JSON.parse(localStorage.getItem(PREFS_KEY)) || {}; } catch (e) { return {}; } };
const savePrefs = () => { try { localStorage.setItem(PREFS_KEY, JSON.stringify(st)); } catch (e) {} };

export function openQrMaker({ url, to, theme }) {
  ctx = { url, to: (to || '').trim() };
  const p = loadPrefs();
  st = {
    preset: PRESETS[p.preset] ? p.preset : 'heart',
    palette: PALETTES[p.palette] ? p.palette : paletteForTheme(theme),
    center: ['none', 'heart', 'initial'].includes(p.center) ? p.center : 'heart',
    initial: (ctx.to[0] || 'W').toUpperCase(),
    showCaption: p.showCaption !== false,
    caption: ctx.to ? `For ${ctx.to} ♥` : 'Scan me ♥'
  };
  close();
  document.body.insertAdjacentHTML('beforeend', modalHTML());
  draw();
}

function chips() {
  return Object.entries(PRESETS).map(([k, p]) =>
    `<button class="qr-chip ${st.preset === k ? 'on' : ''}" data-qr="preset" data-v="${k}"><span>${p.icon}</span>${p.name}</button>`).join('');
}
function swatches() {
  return Object.entries(PALETTES).map(([k, p]) =>
    `<button class="qr-sw ${st.palette === k ? 'on' : ''}" data-qr="palette" data-v="${k}" title="${p.name}"
      style="background:linear-gradient(135deg,${p.c1},${p.c2})"></button>`).join('');
}
function centers() {
  const opts = { none: 'None', heart: '♥ Heart', initial: 'Initial' };
  return Object.entries(opts).map(([k, label]) =>
    `<button class="qr-chip small ${st.center === k ? 'on' : ''}" data-qr="center" data-v="${k}">${label}</button>`).join('');
}

function modalHTML() {
  return `<div class="modal qr-modal" id="qrModal">
    <div class="box qr-box">
      <button class="qr-x" data-qr="close" aria-label="Close">✕</button>
      <div class="qr-preview">
        <canvas id="qrCanvas"></canvas>
        <div class="qr-check" id="qrCheck"></div>
      </div>
      <div class="qr-opts">
        <h3>💝 Make a cute QR</h3>
        <p>Print it on a card, stick it on a gift box, or send it as a picture.</p>
        <label class="qr-lbl">Shape</label>
        <div class="qr-row" id="qrPresets">${chips()}</div>
        <label class="qr-lbl">Color</label>
        <div class="qr-row" id="qrPalettes">${swatches()}</div>
        <label class="qr-lbl">In the middle</label>
        <div class="qr-row" id="qrCenters">${centers()}
          <input class="inp qr-initial" id="qrInitial" maxlength="2" value="${esc(st.initial)}" ${st.center === 'initial' ? '' : 'hidden'} aria-label="Initial">
        </div>
        <label class="qr-lbl qr-cap-lbl"><input type="checkbox" id="qrCapOn" ${st.showCaption ? 'checked' : ''}> Text under the QR</label>
        <input class="inp" id="qrCaption" maxlength="40" value="${esc(st.caption)}" ${st.showCaption ? '' : 'disabled'}>
        <div class="qr-actions">
          <button class="btn btn-primary" data-qr="download">⬇️ Download PNG</button>
          ${navigator.share ? '<button class="btn btn-ghost" data-qr="share">📤 Share</button>' : ''}
        </div>
      </div>
    </div>
  </div>`;
}

function refreshControls() {
  document.getElementById('qrPresets').innerHTML = chips();
  document.getElementById('qrPalettes').innerHTML = swatches();
  const ci = document.getElementById('qrCenters');
  ci.querySelectorAll('.qr-chip').forEach(b => b.classList.toggle('on', b.dataset.v === st.center));
  document.getElementById('qrInitial').hidden = st.center !== 'initial';
}

async function draw() {
  const canvas = document.getElementById('qrCanvas');
  if (!canvas) return;
  // make sure the pretty font is ready before drawing text on the canvas
  try { await document.fonts.load('700 64px "Dancing Script"'); } catch (e) {}
  renderQR(canvas, {
    text: ctx.url, preset: st.preset, palette: st.palette,
    center: st.center, initial: st.initial,
    caption: st.showCaption ? st.caption.trim() : '',
    size: 1080
  });
  savePrefs();
  selfCheck(canvas);
}
const redraw = () => { clearTimeout(renderTimer); renderTimer = setTimeout(draw, 120); };

/* If this browser can read QR codes itself, double-check the result */
async function selfCheck(canvas) {
  const el = document.getElementById('qrCheck');
  if (!el) return;
  if (!('BarcodeDetector' in window)) { el.className = 'qr-check'; el.textContent = 'Tip: test-scan it with your phone camera before printing.'; return; }
  try {
    const det = new window.BarcodeDetector({ formats: ['qr_code'] });
    const found = await det.detect(canvas);
    const ok = found.some(f => f.rawValue === ctx.url);
    el.className = 'qr-check ' + (ok ? 'ok' : 'bad');
    el.textContent = ok ? '✓ Scan test passed' : '⚠ Hard to scan on this device. Try another shape or color.';
  } catch (e) { el.className = 'qr-check'; el.textContent = 'Tip: test-scan it with your phone camera before printing.'; }
}

function fileName() {
  const slug = ctx.to.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase();
  return `wishy-qr${slug ? '-' + slug : ''}.png`;
}
const toBlob = () => new Promise(res => document.getElementById('qrCanvas').toBlob(res, 'image/png'));

async function download() {
  const blob = await toBlob();
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = fileName();
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  toast('⬇️ QR saved! Test-scan it once before printing.');
}

async function share() {
  const blob = await toBlob();
  const file = new File([blob], fileName(), { type: 'image/png' });
  try {
    if (navigator.canShare && navigator.canShare({ files: [file] })) await navigator.share({ files: [file], title: 'A birthday surprise 🎂' });
    else await navigator.share({ title: 'A birthday surprise 🎂', url: ctx.url });
  } catch (e) { /* user cancelled */ }
}

function close() {
  const m = document.getElementById('qrModal');
  if (m) m.remove();
}

/* ---------------- events (bound once) ---------------- */
document.addEventListener('click', e => {
  if (!document.getElementById('qrModal')) return;
  if (e.target.id === 'qrModal') return close();
  const b = e.target.closest('#qrModal [data-qr]');
  if (!b) return;
  const v = b.dataset.v;
  switch (b.dataset.qr) {
    case 'close': close(); break;
    case 'preset': st.preset = v; refreshControls(); redraw(); break;
    case 'palette': st.palette = v; refreshControls(); redraw(); break;
    case 'center':
      st.center = v; refreshControls(); redraw();
      if (v === 'initial') document.getElementById('qrInitial').focus();
      break;
    case 'download': download(); break;
    case 'share': share(); break;
  }
});
document.addEventListener('input', e => {
  if (!document.getElementById('qrModal')) return;
  if (e.target.id === 'qrCaption') { st.caption = e.target.value; redraw(); }
  if (e.target.id === 'qrInitial') { st.initial = e.target.value.toUpperCase(); redraw(); }
  if (e.target.id === 'qrCapOn') {
    st.showCaption = e.target.checked;
    document.getElementById('qrCaption').disabled = !st.showCaption;
    redraw();
  }
});
document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
