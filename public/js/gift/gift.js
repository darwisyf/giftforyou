// What the birthday person sees: intro -> quiz -> score -> birthday page
import { app, esc, view } from '../core/utils.js';
import { normalize, LETTERS } from '../core/model.js';
import { applyTheme, themeOf } from '../core/themes.js';
import { confetti } from '../ui/confetti.js';
import { heartsHTML, balloonsHTML } from '../ui/decor.js';
import { preloadMusic, startMusic } from './music.js';

let gift = null, quiz = [], qi = 0, score = 0;
let isPreview = false, onBack = null, revealObs = null, allImgs = [], lbIndex = 0;

const burst = n => confetti(n, themeOf(gift.theme));
const backBtn = () => isPreview ? '<button class="btn btn-ghost edit-fab" data-g="back">✏️ Back to editor</button>' : '';

/* options.preview: show a "Back to editor" button that calls options.onBack */
export function startGift(data, options = {}) {
  view.mode = 'gift';
  gift = normalize(data);
  isPreview = !!options.preview;
  onBack = options.onBack || null;
  applyTheme(gift.theme);
  document.title = `Happy Birthday, ${gift.to || 'you'}! 🎂`;
  quiz = gift.quiz
    .filter(q => q.q.trim() && q.answer >= 0 && (q.options[q.answer] || '').trim())
    .map(q => ({ q: q.q, opts: q.options.map((t, j) => ({ t, correct: j === q.answer })).filter(o => o.t.trim()) }));
  qi = 0; score = 0;
  preloadMusic(gift);
  showIntro();
}

function showIntro() {
  window.scrollTo(0, 0);
  app.innerHTML = `${backBtn()}<div class="screen">${heartsHTML()}
    <div class="panel">
      <div class="bigemoji">💌</div>
      <div class="for">For ${esc(gift.to)}</div>
      <h1>${esc(gift.introTitle || 'Someone made something special for you')}</h1>
      <p class="lead">${esc(gift.introText)}</p>
      <button class="btn btn-primary btn-lg" data-g="start">${quiz.length ? 'Start the quiz 🎮' : 'Open it 💝'}</button>
    </div></div>`;
}

function showQuestion() {
  const q = quiz[qi];
  app.innerHTML = `${backBtn()}<div class="screen">${heartsHTML()}
    <div class="panel" style="text-align:left">
      <div class="qprog"><span>Question ${qi + 1} of ${quiz.length}</span><span>⭐ ${score}</span></div>
      <div class="bar"><i style="width:${(qi / quiz.length) * 100}%"></i></div>
      <p class="qtext">${esc(q.q)}</p>
      <div class="qopts">${q.opts.map((o, j) => `
        <button class="qopt" data-g="ans" data-j="${j}"><span class="letter">${LETTERS[j]}</span><span>${esc(o.t)}</span></button>`).join('')}
      </div>
      <div class="feedback" id="fb"></div>
      <div class="next-wrap" id="nx" style="text-align:center"></div>
    </div></div>`;
  requestAnimationFrame(() => { const bar = app.querySelector('.bar i'); if (bar) bar.style.width = ((qi + 1) / quiz.length * 100) + '%'; });
}

function answer(j) {
  const q = quiz[qi];
  const btns = app.querySelectorAll('.qopt');
  const correctIdx = q.opts.findIndex(o => o.correct);
  btns.forEach((b, k) => {
    b.disabled = true;
    b.classList.add(k === correctIdx ? 'correct' : k === j ? 'wrong' : 'dim');
  });
  const fb = document.getElementById('fb');
  if (q.opts[j].correct) {
    score++;
    const yay = ['Yay! You got it! 🎉', 'Correct! You know me so well 🥰', "That's right! 💯", 'Perfect! 😍'];
    fb.innerHTML = `<span style="color:#059669">${yay[(Math.random() * yay.length) | 0]}</span>`;
    burst(60);
  } else {
    fb.innerHTML = `<span style="color:#e11d48">Oops! The answer was "${esc(q.opts[correctIdx].t)}" 😜</span>`;
  }
  const last = qi === quiz.length - 1;
  document.getElementById('nx').innerHTML = `<button class="btn btn-primary" data-g="next">${last ? 'See my score ✨' : 'Next question →'}</button>`;
}

function showResult() {
  const n = quiz.length, ratio = score / n;
  const title = ratio === 1 ? 'Perfect score! 💯' : ratio >= 0.6 ? 'So close! 🥰' : ratio > 0 ? 'Hmm... we need more dates 😜' : 'Oh no! 🙈';
  app.innerHTML = `${backBtn()}<div class="screen">${heartsHTML()}
    <div class="panel">
      <div class="for">Your score</div>
      <div class="score">${score} / ${n}</div>
      <h1>${title}</h1>
      <p class="lead">${esc(gift.quizEndMsg)}</p>
      <button class="btn btn-primary btn-lg" data-g="unwrap">Unwrap your gift 🎁</button>
    </div></div>`;
  if (ratio === 1) burst(200);
}

function showMain() {
  window.scrollTo(0, 0);
  const title = gift.heroTitle.trim() || `Happy Birthday, ${gift.to}!`;
  const secs = gift.sections.filter(s => s.title.trim() || s.text.trim() || s.images.length);
  allImgs = [];
  const polaroid = im => {
    const i = allImgs.push(im) - 1;
    return `<figure class="polaroid" data-g="lb" data-i="${i}" style="--r:${(Math.random() * 8 - 4).toFixed(1)}deg">
      <img src="${esc(im.src)}" alt="${esc(im.caption)}" loading="lazy">
      ${im.caption.trim() ? `<figcaption>${esc(im.caption)}</figcaption>` : ''}
    </figure>`;
  };
  app.innerHTML = `${backBtn()}
    <header class="hero">${balloonsHTML(themeOf(gift.theme))}
      <div class="cake">🎂</div>
      <h1>${esc(title)}</h1>
      ${gift.from ? `<div class="from">with love, from <b>${esc(gift.from)}</b></div>` : ''}
      <div class="scroll-hint">scroll down ↓</div>
    </header>
    <main class="content">
      ${secs.map(s => `<article class="sec reveal">
        ${s.title.trim() ? `<h2>${esc(s.title)}</h2>` : ''}
        ${s.text.trim() ? `<div class="txt">${esc(s.text)}</div>` : ''}
        ${s.images.length ? `<div class="s-imgs${s.images.length === 1 ? ' one' : ''}">${s.images.map(polaroid).join('')}</div>` : ''}
      </article>`).join('')}
      ${gift.images.length ? `<section class="sec gallery reveal">
        <h2>Our moments 📸</h2>
        <div class="g-grid">${gift.images.map(polaroid).join('')}</div></section>` : ''}
      ${(gift.closing.trim() || gift.from) ? `<section class="sec closing reveal">
        <div style="font-size:46px">💝</div>
        ${gift.closing.trim() ? `<div class="txt">${esc(gift.closing)}</div>` : ''}
        ${gift.from ? `<div class="sig">— ${esc(gift.from)}</div>` : ''}
      </section>` : ''}
      <div class="endbar">
        <button class="btn btn-primary" data-g="boom">🎉 More confetti!</button>
        <button class="btn btn-ghost" data-g="replay">↺ Play again</button>
      </div>
    </main>
    <div class="lb" id="lb">
      <button class="x" data-g="lbx" aria-label="Close">✕</button>
      <button class="pv" data-g="lbp" aria-label="Previous">‹</button>
      <img id="lbImg" alt="">
      <div class="cap" id="lbCap"></div>
      <button class="nx" data-g="lbn" aria-label="Next">›</button>
    </div>`;
  if (revealObs) revealObs.disconnect();
  if ('IntersectionObserver' in window) {
    revealObs = new IntersectionObserver(ents => ents.forEach(en => {
      if (en.isIntersecting) { en.target.classList.add('in'); revealObs.unobserve(en.target); }
    }), { threshold: 0.12 });
    app.querySelectorAll('.reveal').forEach(el => revealObs.observe(el));
  } else app.querySelectorAll('.reveal').forEach(el => el.classList.add('in'));
  setTimeout(() => burst(260), 300);
  setTimeout(() => burst(160), 1500);
}

/* ---------- Photo viewer ---------- */
function openLb(i) {
  if (!allImgs.length) return;
  lbIndex = (i + allImgs.length) % allImgs.length;
  const im = allImgs[lbIndex];
  document.getElementById('lbImg').src = im.src;
  document.getElementById('lbCap').textContent = im.caption || '';
  document.getElementById('lb').classList.add('open');
  const multi = allImgs.length > 1;
  app.querySelector('.lb .pv').style.display = multi ? '' : 'none';
  app.querySelector('.lb .nx').style.display = multi ? '' : 'none';
}
function closeLb() { const lb = document.getElementById('lb'); if (lb) lb.classList.remove('open'); }

app.addEventListener('click', e => {
  if (view.mode !== 'gift') return;
  if (e.target.id === 'lb') return closeLb();
  const b = e.target.closest('[data-g]');
  if (!b) return;
  switch (b.dataset.g) {
    case 'back': if (onBack) onBack(); break;
    case 'start': startMusic(gift); quiz.length ? showQuestion() : showMain(); break;
    case 'ans': answer(parseInt(b.dataset.j, 10)); break;
    case 'next': qi++; qi < quiz.length ? showQuestion() : showResult(); break;
    case 'unwrap': startMusic(gift); showMain(); break;
    case 'boom': burst(240); break;
    case 'replay': qi = 0; score = 0; showIntro(); break;
    case 'lb': openLb(parseInt(b.dataset.i, 10)); break;
    case 'lbx': closeLb(); break;
    case 'lbp': openLb(lbIndex - 1); break;
    case 'lbn': openLb(lbIndex + 1); break;
  }
});

document.addEventListener('keydown', e => {
  const lb = document.getElementById('lb');
  if (view.mode !== 'gift' || !lb || !lb.classList.contains('open')) return;
  if (e.key === 'Escape') closeLb();
  if (e.key === 'ArrowLeft') openLb(lbIndex - 1);
  if (e.key === 'ArrowRight') openLb(lbIndex + 1);
});
