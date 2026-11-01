// Admin page: generate access codes and see which ones were used
import { esc, toast, copyText } from '../core/utils.js';

const app = document.getElementById('app');
const PW_KEY = 'wishy.admin.pw';
let pw = sessionStorage.getItem(PW_KEY) || '';
let codes = [], filter = 'all', search = '', fresh = [];

async function call(method, body) {
  const r = await fetch('/api/admin/codes', {
    method,
    headers: { 'content-type': 'application/json', 'x-admin-password': pw },
    body: body ? JSON.stringify(body) : undefined
  }).catch(() => null);
  if (!r) return { ok: false, status: 0, j: { error: 'No internet connection' } };
  let j = null; try { j = await r.json(); } catch (e) {}
  return { ok: r.ok, status: r.status, j };
}

const editorLink = c => `${location.origin}/?code=${encodeURIComponent(c)}`;
const giftLink = id => `${location.origin}/g/${id}`;
const fmtDate = t => (t ? new Date(t).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '');

/* What you send the buyer after they pay */
const buyerMessage = c =>
`Thank you for your payment! 🎂

Your Wishy code: ${c}

Open your personal editor here:
${editorLink(c)}

Fill in the form, then press "Create link". Your code is used once to create your gift link, and you can update it for free after that. To edit later from another phone, just open the editor link above again.`;

const copy = (text, what = 'Copied') => copyText(text, () => toast('📋 ' + what));

/* ---------------- Screens ---------------- */
function renderLogin(msg = '') {
  app.innerHTML = `<div class="adm"><div class="card login">
    <h2>🔐 Wishy admin</h2>
    <p class="hint">Enter the admin password you set in Netlify.</p>
    <input class="inp" id="pw" type="password" placeholder="Password" autocomplete="current-password">
    <div class="code-err" id="err">${esc(msg)}</div>
    <button class="btn btn-primary" style="width:100%" data-a="login">Sign in</button>
  </div></div>`;
  const inp = document.getElementById('pw');
  inp.focus();
  inp.addEventListener('keydown', e => { if (e.key === 'Enter') login(); });
}

function rows() {
  const q = search.trim().toUpperCase();
  return codes.filter(c =>
    (filter === 'all' || (filter === 'new' ? !c.usedBy : !!c.usedBy)) &&
    (!q || c.code.includes(q) || (c.note || '').toUpperCase().includes(q)));
}

function renderMain() {
  const used = codes.filter(c => c.usedBy).length;
  const list = rows();
  app.innerHTML = `<div class="adm">
    <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap">
      <div><h1>Wishy admin</h1><p class="sub">Generate a code after someone pays you, then send them the message.</p></div>
      <button class="btn btn-ghost" data-a="logout">Sign out</button>
    </div>

    <section class="card">
      <h2>🎟️ New codes</h2>
      <div class="gen">
        <div class="field" style="margin:0"><label>How many</label><input class="inp" id="count" type="number" min="1" max="50" value="1"></div>
        <div class="field" style="margin:0"><label>Note (buyer name / WhatsApp)</label><input class="inp" id="note" maxlength="100" placeholder="e.g. Rina 0812-xxxx, paid via BCA"></div>
        <button class="btn btn-primary" data-a="gen">Generate</button>
      </div>
      ${fresh.length ? `<div class="new-codes">
        <b>✓ ${fresh.length} new code(s)</b>
        <pre>${esc(fresh.join('\n'))}</pre>
        <div class="linkbtns">
          ${fresh.length === 1 ? `<button class="btn btn-primary" data-a="msg" data-c="${esc(fresh[0])}">📋 Copy message for buyer</button>` : ''}
          <button class="btn btn-ghost" data-a="copy-fresh">Copy codes</button>
        </div>
      </div>` : ''}
    </section>

    <section class="card">
      <h2>📋 All codes</h2>
      <div class="stats">
        <span class="stat"><b>${codes.length}</b>total</span>
        <span class="stat"><b>${codes.length - used}</b>unused</span>
        <span class="stat"><b>${used}</b>used</span>
      </div>
      <div class="filters">
        <input class="inp" id="search" placeholder="Search code or note" value="${esc(search)}">
        ${['all', 'new', 'used'].map(f => `<button class="chip ${filter === f ? 'on' : ''}" data-a="filter" data-f="${f}">${{ all: 'All', new: 'Unused', used: 'Used' }[f]}</button>`).join('')}
        <button class="chip" data-a="refresh">↻ Refresh</button>
      </div>
      ${list.length ? `<table>
        <thead><tr><th>Code</th><th>Note</th><th>Status</th><th>Created</th><th></th></tr></thead>
        <tbody>${list.map(c => `<tr>
          <td class="code">${esc(c.code)}</td>
          <td>${esc(c.note || '')}</td>
          <td>${c.usedBy ? `<span class="tag used">Used ${esc(fmtDate(c.usedAt))}</span>` : '<span class="tag new">Unused</span>'}</td>
          <td style="white-space:nowrap;opacity:.7">${esc(fmtDate(c.created))}</td>
          <td><div class="acts">
            <button class="icon-btn" data-a="msg" data-c="${esc(c.code)}">Message</button>
            <button class="icon-btn" data-a="copy-code" data-c="${esc(c.code)}">Code</button>
            ${c.usedBy ? `<a class="icon-btn" href="${esc(giftLink(c.usedBy))}" target="_blank" rel="noopener" style="text-decoration:none">Gift ↗</a>` : ''}
          </div></td>
        </tr>`).join('')}</tbody>
      </table>` : '<p class="hint">No codes here yet.</p>'}
    </section>
  </div>`;
  const s = document.getElementById('search');
  s.addEventListener('input', () => { search = s.value; const pos = s.selectionStart; renderMain(); const n = document.getElementById('search'); n.focus(); n.setSelectionRange(pos, pos); });
}

/* ---------------- Actions ---------------- */
async function load() {
  const r = await call('GET');
  if (r.status === 401 || r.status === 503) { sessionStorage.removeItem(PW_KEY); pw = ''; return renderLogin(r.j && r.j.error); }
  if (!r.ok) return toast('⚠ ' + ((r.j && r.j.error) || 'Could not load codes'), 5000);
  codes = r.j.codes;
  renderMain();
}

async function login() {
  pw = document.getElementById('pw').value;
  if (!pw) return;
  sessionStorage.setItem(PW_KEY, pw);
  load();
}

async function generate(btn) {
  const count = parseInt(document.getElementById('count').value, 10) || 1;
  const note = document.getElementById('note').value;
  btn.disabled = true;
  const r = await call('POST', { count, note });
  btn.disabled = false;
  if (!r.ok) return toast('⚠ ' + ((r.j && r.j.error) || 'Could not create codes'), 5000);
  fresh = r.j.codes;
  await load();
}

app.addEventListener('click', e => {
  const b = e.target.closest('[data-a]');
  if (!b) return;
  const c = b.dataset.c;
  switch (b.dataset.a) {
    case 'login': login(); break;
    case 'logout': sessionStorage.removeItem(PW_KEY); pw = ''; fresh = []; renderLogin(); break;
    case 'gen': generate(b); break;
    case 'msg': copy(buyerMessage(c), 'Message copied. Paste it in WhatsApp.'); break;
    case 'copy-code': copy(c, 'Code copied'); break;
    case 'copy-fresh': copy(fresh.join('\n'), 'Codes copied'); break;
    case 'filter': filter = b.dataset.f; renderMain(); break;
    case 'refresh': load(); break;
  }
});

pw ? load() : renderLogin();
