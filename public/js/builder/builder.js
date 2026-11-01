// The editor: form, autosave, photos, preview, and the Create / Update link button
import { app, esc, clone, setPath, toast, view, copyText } from '../core/utils.js';
import { applyTheme } from '../core/themes.js';
import { blank, normalize, emptySec, validate, parseMusic, parseTime, fmtTime, songStart } from '../core/model.js';
import { loadDraft, saveDraft, clearDraft, getLink, setLink, getCode, linkUrl } from '../core/storage.js';
import { field, themePicker, quizCard, sectionCard, photoItem, topBar, linkCard, codeReadyCard, codeModal } from './templates.js';
import { compressImage } from './photos.js';
import { createGift, updateGift } from './publish.js';
import { startGift } from '../gift/gift.js';
import { stopMusic } from '../gift/music.js';
import { openQrMaker } from '../qr/qr-maker.js';

let state = null;
let cfg = { whatsapp: '', priceText: '' };
let saveTimer = null;
let busy = false;

/* data: open this gift instead of the saved draft (used by editor links) */
export function openBuilder(config, data) {
  if (config) cfg = config;
  state = data ? normalize(data) : (loadDraft() || blank());
  if (data) saveDraft(state);
  render(false);
}

/* ---------------- Rendering ---------------- */
function musicStatus(d) {
  const p = parseMusic(d.music);
  if (p === null) return { cls: '', txt: 'Paste a YouTube or Spotify link (song, album or playlist). Leave empty for no music.' };
  if (p === false) return { cls: 'bad', txt: "✗ That link isn't recognized. Use a youtube.com / youtu.be or open.spotify.com link." };
  if (isNaN(parseTime(d.musicStart))) return { cls: 'bad', txt: '✗ Start time should look like 1:26 (minutes:seconds) or 86 (seconds).' };
  const st = songStart(d);
  let txt = `✓ ${p.label} detected` + (st ? `, starting at ${fmtTime(st)}` : ', starting from the beginning');
  txt += p.kind === 'youtube'
    ? '. It starts playing when they press Start, and loops back to that point.'
    : '. They tap ▶ on the player to listen' + (st ? (p.type === 'track' ? ' and it jumps to that point.' : '; the start time applies to the first song.') : '.');
  return { cls: 'ok', txt };
}

function render(keepScroll) {
  const y = window.scrollY;
  view.mode = 'builder';
  stopMusic();
  applyTheme(state.theme);
  document.title = 'Wishy · Birthday Wish Maker 🎂';
  const link = getLink();
  const code = getCode();
  const ms = musicStatus(state);

  app.innerHTML = `${topBar(link)}
  <header class="b-head">
    <div class="b-logo">🎂 Birthday Wish Maker</div>
    <p>Fill in the form, preview it for free, then create a link and send it to your special person.</p>
  </header>
  <main class="b-main">
    ${link ? linkCard(linkUrl(link.id), state.to) : code ? codeReadyCard(code) : ''}

    <section class="card">
      <h2><span class="num">1</span> The basics</h2>
      <p class="hint">Who is this for, and who is it from?</p>
      <div class="grid2">
        ${field("Birthday person's name *", 'to', state.to, { ph: 'e.g. Sarah', max: 60 })}
        ${field('Your name', 'from', state.from, { ph: 'e.g. Your love, Bahij', max: 60 })}
      </div>
      ${field('Opening title', 'introTitle', state.introTitle, { ph: 'Someone made something special for you' })}
      ${field('Opening message', 'introText', state.introText, { area: true, rows: 3 })}
      ${themePicker(state.theme)}
    </section>

    <section class="card">
      <h2><span class="num">2</span> Quiz game</h2>
      <p class="hint">Write up to 5 multiple-choice questions and pick the correct answer for each with the circle. Leave a question empty to skip it.</p>
      ${state.quiz.map(quizCard).join('')}
      ${field('Message after the quiz', 'quizEndMsg', state.quizEndMsg, { area: true, rows: 3 })}
    </section>

    <section class="card">
      <h2><span class="num">3</span> Birthday message</h2>
      <p class="hint">Add as many sections as you want. Each one has a title, a long text and optional photos with captions.</p>
      ${field('Main headline', 'heroTitle', state.heroTitle, { ph: 'Leave empty for "Happy Birthday, ' + (state.to || 'Name') + '!"' })}
      <div id="sections">${state.sections.map((s, i) => sectionCard(s, i, state.sections.length)).join('')}</div>
      <button class="btn btn-ghost" data-action="add-section">＋ Add section</button>
      <div style="height:18px"></div>
      ${field('Closing message', 'closing', state.closing, { area: true, rows: 4, ph: 'e.g. I love you more than words can say. Happy birthday! ❤️' })}
    </section>

    <section class="card">
      <h2><span class="num">4</span> Photo gallery</h2>
      <p class="hint">Optional extra gallery at the end of the page. Photos are resized automatically, and each one can have its own caption.</p>
      <label class="drop">
        <input type="file" class="fileIn" accept="image/*" multiple>
        <div class="big">📸</div>
        <div><b>Click to choose photos</b> or drag &amp; drop them here</div>
        <div style="font-size:12px;opacity:.6;margin-top:4px">${state.images.length} photo(s) added</div>
      </label>
      <div class="pgrid">${state.images.map((im, i) => photoItem(im, i, state.images.length)).join('')}</div>
    </section>

    <section class="card">
      <h2><span class="num">5</span> Background song 🎵</h2>
      <p class="hint">Pick "your song". It plays in a small player while they go through the quiz and the birthday page.</p>
      <div class="mgrid">
        <div class="field" style="margin-bottom:0"><label>YouTube or Spotify link</label>
          <input class="inp" data-path="music" value="${esc(state.music)}" placeholder="e.g. https://youtu.be/xxxxxxxxxxx or https://open.spotify.com/track/…" maxlength="300">
        </div>
        <div class="field" style="margin-bottom:0"><label>Start at (optional)</label>
          <input class="inp" data-path="musicStart" value="${esc(state.musicStart)}" placeholder="e.g. 1:26" maxlength="10" inputmode="numeric">
        </div>
      </div>
      <div class="mstatus ${ms.cls}" id="musicStatus">${esc(ms.txt)}</div>
    </section>
  </main>`;
  window.scrollTo(0, keepScroll ? y : 0);
}

/* ---------------- Autosave ---------------- */
function persist() {
  const ok = saveDraft(state);
  const st = document.getElementById('saveStatus');
  if (st) st.textContent = ok ? '✓ Draft saved on this device' : '⚠ Too many new photos to autosave. Create your link to keep them.';
}
function scheduleSave() {
  const st = document.getElementById('saveStatus');
  if (st) st.textContent = 'Saving…';
  clearTimeout(saveTimer);
  saveTimer = setTimeout(persist, 500);
}

/* ---------------- Photos ---------------- */
async function addFiles(files, sIdx) {
  const target = Number.isInteger(sIdx) && state.sections[sIdx] ? state.sections[sIdx].images : state.images;
  const list = Array.from(files || []).filter(f => f.type.startsWith('image/'));
  if (!list.length) return;
  toast(`Processing ${list.length} photo(s)…`, 10000);
  let ok = 0;
  for (const f of list) {
    try { target.push({ src: await compressImage(f), caption: '' }); ok++; } catch (e) { /* unreadable file */ }
  }
  render(true);
  persist();
  toast(`✓ Added ${ok} photo(s)` + (ok < list.length ? ` (${list.length - ok} couldn't be read)` : ''));
}

/* ---------------- Create / update link ---------------- */
function setBusy(on) {
  busy = on;
  document.querySelectorAll('.b-bar .btn, .linkcard .btn, #codeModal .btn').forEach(b => { b.disabled = on; });
}
const progress = msg => toast(msg, 120000);
const showErrors = errs => toast('<b>Please fix these first:</b><ul>' + errs.map(e => `<li>${esc(e)}</li>`).join('') + '</ul>', 5000);

function publish() {
  if (busy) return;
  const errs = validate(state);
  if (errs.length) return showErrors(errs);
  if (getLink()) return saveChanges();
  openCodeModal();
}

async function saveChanges() {
  setBusy(true);
  try {
    await updateGift(state, { onProgress: progress, persist });
    render(true);
    toast('✓ Saved. Your link now shows the latest version.', 4000);
  } catch (e) {
    toast('⚠ ' + esc(e.message || 'Something went wrong') + '. Please try again.', 6000);
  } finally { setBusy(false); }
}

/* ---- Access code dialog ---- */
function openCodeModal() {
  closeCodeModal();
  document.body.insertAdjacentHTML('beforeend', codeModal(cfg, getCode()));
  const inp = document.getElementById('codeInp');
  inp.focus();
  inp.addEventListener('keydown', e => { if (e.key === 'Enter') submitCode(); });
}
function closeCodeModal() {
  const m = document.getElementById('codeModal');
  if (m) m.remove();
}

async function submitCode() {
  if (busy) return;
  const inp = document.getElementById('codeInp'), err = document.getElementById('codeErr');
  const code = inp.value.trim();
  if (!code) { err.textContent = 'Please enter your code.'; return inp.focus(); }
  err.textContent = '';
  setBusy(true);
  try {
    await createGift(state, code, { onProgress: progress, persist });
    closeCodeModal();
    render(false);
    toast('🎉 Your link is ready! Copy it, or make a cute QR for it.', 5000);
  } catch (e) {
    if (e.reason) {             // problem with the code: keep the dialog open
      toast('', 1);
      err.textContent = e.message;
      inp.select();
    } else {
      toast('⚠ ' + esc(e.message || 'Something went wrong') + '. Please try again.', 6000);
    }
  } finally { setBusy(false); }
}

/* Clicks inside the dialog (it lives outside #app) */
document.addEventListener('click', e => {
  const b = e.target.closest('#codeModal [data-action]');
  if (b && b.dataset.action === 'code-submit') submitCode();
  if (b && b.dataset.action === 'code-cancel' && !busy) closeCodeModal();
  if (e.target.id === 'codeModal' && !busy) closeCodeModal();
});
document.addEventListener('keydown', e => { if (e.key === 'Escape' && !busy) closeCodeModal(); });

/* ---------------- Events (bound once) ---------------- */
function onInput(e) {
  if (view.mode !== 'builder') return;
  const t = e.target, p = t.dataset && t.dataset.path;
  if (!p || (t.type === 'radio' && !t.checked)) return;
  setPath(state, p, p.endsWith('.answer') ? parseInt(t.value, 10) : t.value);
  if (p === 'theme') applyTheme(t.value);
  if (p === 'music' || p === 'musicStart') {
    const st = document.getElementById('musicStatus'), ms = musicStatus(state);
    if (st) { st.className = 'mstatus ' + ms.cls; st.textContent = ms.txt; }
  }
  scheduleSave();
}

function onClick(e) {
  if (view.mode !== 'builder') return;
  const b = e.target.closest('[data-action]');
  if (!b) return;
  const i = parseInt(b.dataset.i, 10), d = parseInt(b.dataset.d, 10), s = parseInt(b.dataset.s, 10);
  const imgs = Number.isInteger(s) ? state.sections[s].images : state.images;
  const move = arr => { const j = i + d; if (j >= 0 && j < arr.length) [arr[i], arr[j]] = [arr[j], arr[i]]; };
  const changed = () => { render(true); scheduleSave(); };

  switch (b.dataset.action) {
    case 'add-section': state.sections.push(emptySec()); changed(); break;
    case 'rm-section': {
      const sec = state.sections[i];
      if ((sec.title || sec.text || sec.images.length) && !confirm('Remove this section?')) return;
      state.sections.splice(i, 1); changed(); break;
    }
    case 'mv-section': move(state.sections); changed(); break;
    case 'rm-img': imgs.splice(i, 1); changed(); break;
    case 'mv-img': move(imgs); changed(); break;
    case 'reset':
      if (!confirm('Start a new gift? The form will be cleared.' + (getLink()
        ? ' Your current link keeps working, and you can edit it again later with your code. A new gift needs a new code.'
        : ''))) return;
      state = blank(); setLink(null); clearDraft(); render(false); break;
    case 'preview': {
      const errs = validate(state);
      if (errs.length) return showErrors(errs);
      startGift(clone(state), { preview: true, onBack: () => render(false) });
      break;
    }
    case 'publish': publish(); break;
    case 'copy-link': copyText(document.getElementById('linkUrl').value, () => toast('📋 Link copied!')); break;
    case 'qr': {
      const link = getLink();
      if (link) openQrMaker({ url: linkUrl(link.id), to: state.to, theme: state.theme });
      break;
    }
  }
}

const secIdx = el => { const v = parseInt(el.dataset.s, 10); return Number.isInteger(v) ? v : undefined; };
const dropOf = e => view.mode === 'builder' && e.target.closest && e.target.closest('.drop');

app.addEventListener('input', onInput);
app.addEventListener('change', onInput);
app.addEventListener('click', onClick);
app.addEventListener('change', e => {
  if (view.mode === 'builder' && e.target.classList.contains('fileIn')) { addFiles(e.target.files, secIdx(e.target)); e.target.value = ''; }
});
app.addEventListener('dragover', e => { const d = dropOf(e); if (d) { e.preventDefault(); d.classList.add('over'); } });
app.addEventListener('dragleave', e => { const d = dropOf(e); if (d) d.classList.remove('over'); });
app.addEventListener('drop', e => { const d = dropOf(e); if (d) { e.preventDefault(); d.classList.remove('over'); addFiles(e.dataTransfer.files, secIdx(d)); } });
