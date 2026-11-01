// Small helpers used everywhere
export const app = document.getElementById('app');

export const esc = s => String(s == null ? '' : s)
  .replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export const clone = o => JSON.parse(JSON.stringify(o));
export const sleep = ms => new Promise(r => setTimeout(r, ms));

/* setPath(obj, 'sections.0.title', 'Hi') */
export function setPath(obj, path, val) {
  const k = path.split('.');
  let o = obj;
  for (let i = 0; i < k.length - 1; i++) o = o[k[i]];
  o[k[k.length - 1]] = val;
}

/* Which screen is active, so each module's event handlers only react on their own screen */
export const view = { mode: null }; // 'builder' | 'gift' | 'message'

let toastTimer;
export function toast(html, ms = 3000) {
  let el = document.querySelector('.toast');
  if (!el) { el = document.createElement('div'); el.className = 'toast'; document.body.appendChild(el); }
  el.innerHTML = html;
  requestAnimationFrame(() => el.classList.add('show'));
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), ms);
}
export function hideToast() {
  clearTimeout(toastTimer);
  const el = document.querySelector('.toast');
  if (el) el.classList.remove('show');
}

export function loadScript(src, attrs = {}) {
  return new Promise((res, rej) => {
    const el = document.createElement('script');
    el.src = src; el.async = true;
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
    el.onload = res; el.onerror = rej;
    document.head.appendChild(el);
  });
}

/* Resolves to null if the promise takes longer than ms */
export const withTimeout = (p, ms) => Promise.race([p, new Promise(r => setTimeout(() => r(null), ms))]);

