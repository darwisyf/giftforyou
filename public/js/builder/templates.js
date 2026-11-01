// HTML pieces of the editor form
import { esc } from '../core/utils.js';
import { THEMES } from '../core/themes.js';
import { LETTERS } from '../core/model.js';

const Q_PLACEHOLDERS = [
  'e.g. Where did we first meet?',
  'e.g. What is my favorite food?',
  'e.g. What was the first movie we watched together?',
  'e.g. What nickname do I always call you?',
  'e.g. Where is my dream travel destination?'
];

export function field(label, path, value, opts = {}) {
  const ph = esc(opts.ph || '');
  const ctl = opts.area
    ? `<textarea class="inp" rows="${opts.rows || 5}" data-path="${path}" placeholder="${ph}">${esc(value)}</textarea>`
    : `<input class="inp" data-path="${path}" value="${esc(value)}" placeholder="${ph}" maxlength="${opts.max || 200}">`;
  return `<div class="field"><label>${label}</label>${ctl}</div>`;
}

export function themePicker(current) {
  return `<div class="field"><label>Color theme</label><div class="themes">${Object.keys(THEMES).map(k => `
    <label class="theme-chip"><input type="radio" name="theme" data-path="theme" value="${k}" ${current === k ? 'checked' : ''}>
    <span class="sw" style="background:linear-gradient(135deg,${THEMES[k].a},${THEMES[k].b})"></span>${THEMES[k].name}</label>`).join('')}
  </div></div>`;
}

export function quizCard(q, i) {
  return `<div class="qcard">
    <div class="qhead"><span>Question ${i + 1}</span><span style="font-weight:400;font-size:12px;opacity:.7">● = correct answer</span></div>
    <input class="inp" data-path="quiz.${i}.q" value="${esc(q.q)}" placeholder="${esc(Q_PLACEHOLDERS[i])}" maxlength="200">
    <div class="opts">${q.options.map((o, j) => `
      <div class="opt">
        <input type="radio" name="ans${i}" data-path="quiz.${i}.answer" value="${j}" ${q.answer === j ? 'checked' : ''} title="Mark as the correct answer">
        <span class="letter">${LETTERS[j]}</span>
        <input class="inp" data-path="quiz.${i}.options.${j}" value="${esc(o)}" placeholder="Answer ${LETTERS[j]}" maxlength="120">
      </div>`).join('')}
    </div>
  </div>`;
}

/* s = section index, or undefined for the gallery */
export function photoItem(img, i, n, s) {
  const sec = s == null ? '' : ` data-s="${s}"`;
  const path = s == null ? `images.${i}.caption` : `sections.${s}.images.${i}.caption`;
  return `<div class="pitem">
    <img src="${esc(img.src)}" alt="">
    <input class="inp" data-path="${path}" value="${esc(img.caption)}" placeholder='Caption, e.g. "This is when we…"' maxlength="150">
    <div class="tools">
      <span>
        ${i > 0 ? `<button class="icon-btn" data-action="mv-img" data-i="${i}"${sec} data-d="-1" title="Move left">←</button>` : ''}
        ${i < n - 1 ? `<button class="icon-btn" data-action="mv-img" data-i="${i}"${sec} data-d="1" title="Move right">→</button>` : ''}
      </span>
      <button class="icon-btn danger" data-action="rm-img" data-i="${i}"${sec}>✕</button>
    </div>
  </div>`;
}

export function sectionCard(s, i, n) {
  return `<div class="scard">
    <div class="shead"><span>Section ${i + 1}</span>
      <span class="tools">
        ${i > 0 ? `<button class="icon-btn" data-action="mv-section" data-i="${i}" data-d="-1" title="Move up">↑</button>` : ''}
        ${i < n - 1 ? `<button class="icon-btn" data-action="mv-section" data-i="${i}" data-d="1" title="Move down">↓</button>` : ''}
        <button class="icon-btn danger" data-action="rm-section" data-i="${i}">✕ Remove</button>
      </span></div>
    ${field('Title', `sections.${i}.title`, s.title, { ph: 'e.g. The day I met you' })}
    ${field('Text', `sections.${i}.text`, s.text, { area: true, rows: 7, ph: 'Write your story, memories or wishes here. Line breaks are kept.' })}
    <div class="field" style="margin-bottom:0"><label>Photos for this section (optional)</label>
      <label class="drop small" data-s="${i}">
        <input type="file" class="fileIn" data-s="${i}" accept="image/*" multiple>
        <span class="big">🖼️</span><b>Add photos</b> <span style="opacity:.65">or drop them here · ${s.images.length} added</span>
      </label>
      ${s.images.length ? `<div class="pgrid">${s.images.map((im, j) => photoItem(im, j, s.images.length, i)).join('')}</div>` : ''}
    </div>
  </div>`;
}

/* The top bar */
export function topBar(link) {
  return `<div class="b-bar">
    <div class="b-left">
      <span class="brand">Made by <b>Wishy</b></span>
      <span class="status" id="saveStatus">Your draft is saved automatically on this device</span>
    </div>
    <button class="btn btn-ghost" data-action="reset">✨ New gift</button>
    <button class="btn btn-ghost" data-action="preview">👀 Preview</button>
    <button class="btn btn-primary" data-action="publish" id="pubBtn">${link ? '🔄 Update link' : '🔗 Create link'}</button>
  </div>`;
}

/* Small note when a code is ready to use (from an editor link) */
export function codeReadyCard(code) {
  return `<section class="card linkcard">
    <h2>🎟️ Your code is ready</h2>
    <p class="hint" style="margin:0">Code <span class="code-chip">${esc(code)}</span> will be used when you press <b>Create link</b>.
      Take your time filling in the form. Your draft is saved on this device.</p>
  </section>`;
}

/* Card at the top of the form once the link exists */
export function linkCard(url, to) {
  return `<section class="card linkcard">
    <h2>🎉 Your gift link is live</h2>
    <p class="hint">Send this link to ${esc(to) || 'them'}. Changed something below? Press <b>Update link</b> and this same link shows the new version.</p>
    <div class="linkrow">
      <input class="inp" id="linkUrl" readonly value="${esc(url)}">
      <button class="btn btn-primary" data-action="copy-link">📋 Copy</button>
    </div>
    <div class="linkbtns">
      <a class="btn btn-ghost" href="${esc(url)}" target="_blank" rel="noopener">Open ↗</a>
      <a class="btn btn-ghost" href="https://wa.me/?text=${encodeURIComponent('🎂 I made something for you: ' + url)}" target="_blank" rel="noopener">💬 Share on WhatsApp</a>
    </div>
  </section>`;
}

/* WhatsApp chat with the site owner to buy a code */
export function buyLink(cfg) {
  if (!cfg.whatsapp) return '';
  const msg = `Hi! I'd like to buy a Wishy code to make a birthday gift link 🎂`;
  return `https://wa.me/${cfg.whatsapp}?text=${encodeURIComponent(msg)}`;
}

/* The dialog that asks for an access code */
export function codeModal(cfg, code) {
  const wa = buyLink(cfg);
  return `<div class="modal" id="codeModal">
    <div class="box">
      <h3>🎟️ Enter your access code</h3>
      <p>Each code creates one gift link. After that, you can update your link for free as many times as you like.</p>
      <input class="inp code-inp" id="codeInp" value="${esc(code)}" placeholder="WISH-XXXX-XXXX" maxlength="20" autocomplete="off" spellcheck="false">
      <div class="code-err" id="codeErr"></div>
      <div class="row">
        <button class="btn btn-ghost" data-action="code-cancel">Cancel</button>
        <button class="btn btn-primary" data-action="code-submit">🔗 Create link</button>
      </div>
      ${wa ? `<div class="or">Don't have a code?</div>
        <a class="btn btn-wa" href="${esc(wa)}" target="_blank" rel="noopener">💬 Get one on WhatsApp${cfg.priceText ? ' · ' + esc(cfg.priceText) : ''}</a>` : ''}
    </div>
  </div>`;
}
