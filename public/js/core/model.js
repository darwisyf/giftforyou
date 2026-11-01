// The gift data: defaults, cleaning, validation, and song-link parsing
import { THEMES } from './themes.js';

export const LETTERS = 'ABCD';

export const emptyQ = () => ({ q: '', options: ['', '', '', ''], answer: -1 });
export const emptySec = () => ({ title: '', text: '', images: [] });

export function blank() {
  return {
    v: 1, theme: 'rose', to: '', from: '',
    introTitle: 'Someone made something special for you',
    introText: "But first... let's see how well you really know me 😉",
    quiz: Array.from({ length: 5 }, emptyQ),
    quizEndMsg: "No matter your score, you'll always be my favorite person. Ready for your surprise?",
    heroTitle: '',
    sections: [emptySec(), emptySec(), emptySec()],
    images: [],
    music: '',
    musicStart: '',
    closing: ''
  };
}

/* Only allow our own image formats: inline JPEG/PNG/WebP (not uploaded yet) or photos uploaded to this site */
const SAFE_SRC = /^(data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/=]+|\/api\/img\/[a-z0-9]+)$/;
const normImgs = arr => (Array.isArray(arr) ? arr : [])
  .filter(i => i && typeof i.src === 'string' && SAFE_SRC.test(i.src))
  .map(i => ({ src: i.src, caption: String(i.caption || '') }));

export function normalize(d) {
  const out = Object.assign(blank(), d || {});
  const qz = Array.isArray(out.quiz) ? out.quiz.slice(0, 5) : [];
  while (qz.length < 5) qz.push(emptyQ());
  out.quiz = qz.map(q => ({
    q: (q && q.q) || '',
    options: [0, 1, 2, 3].map(i => (q && q.options && q.options[i]) || ''),
    answer: q && typeof q.answer === 'number' ? q.answer : -1
  }));
  out.sections = (Array.isArray(out.sections) ? out.sections : [])
    .map(s => ({ title: (s && s.title) || '', text: (s && s.text) || '', images: normImgs(s && s.images) }));
  out.images = normImgs(out.images);
  out.music = typeof out.music === 'string' ? out.music : '';
  out.musicStart = out.musicStart == null ? '' : String(out.musicStart);
  if (!THEMES[out.theme]) out.theme = 'rose';
  return out;
}

/* Every photo in the gift: section photos first, then the gallery */
export const allImages = d => [...d.sections.flatMap(s => s.images), ...d.images];

/* "1:26", "86", "1m26s", "1:02:03" -> seconds. '' -> 0. Invalid -> NaN */
export function parseTime(v) {
  v = String(v == null ? '' : v).trim().toLowerCase();
  if (!v) return 0;
  let m = v.match(/^(?:(\d+):)?(\d{1,3}):([0-5]\d)$/);
  if (m) return (+(m[1] || 0)) * 3600 + (+m[2]) * 60 + (+m[3]);
  if (/^\d+$/.test(v)) return +v;
  m = v.match(/^(?:(\d+)h)?\s*(?:(\d+)m)?\s*(?:(\d+)s)?$/);
  if (m && (m[1] || m[2] || m[3])) return (+(m[1] || 0)) * 3600 + (+(m[2] || 0)) * 60 + (+(m[3] || 0));
  return NaN;
}

export function fmtTime(t) {
  t = Math.max(0, t | 0);
  const h = (t / 3600) | 0, mm = ((t % 3600) / 60) | 0, ss = String(t % 60).padStart(2, '0');
  return h ? `${h}:${String(mm).padStart(2, '0')}:${ss}` : `${mm}:${ss}`;
}

/* YouTube / Spotify link -> player info. null = empty, false = not recognized */
export function parseMusic(url) {
  url = String(url || '').trim();
  if (!url) return null;
  let m = url.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/|v\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  if (m) {
    const id = m[1];
    const t = url.match(/[?&#](?:t|start)=([0-9hms]+)/i);
    return {
      kind: 'youtube', label: 'YouTube video', id, h: 158,
      linkStart: t ? (parseTime(t[1]) || 0) : 0,
      embed: st => `https://www.youtube.com/embed/${id}?autoplay=1&loop=1&playlist=${id}&playsinline=1&rel=0&start=${st}`
    };
  }
  m = url.match(/open\.spotify\.com\/(?:intl-[a-z]{2}(?:-[a-z]{2})?\/)?(?:embed\/)?(track|album|playlist|episode|show)\/([A-Za-z0-9]+)/i)
    || url.match(/^spotify:(track|album|playlist|episode|show):([A-Za-z0-9]+)$/i);
  if (m) {
    const type = m[1].toLowerCase(), id = m[2];
    return {
      kind: 'spotify', label: 'Spotify ' + type, type, id, linkStart: 0,
      h: type === 'track' || type === 'episode' ? 80 : 152,
      embed: () => `https://open.spotify.com/embed/${type}/${id}?utm_source=generator&theme=0`
    };
  }
  return false;
}

/* The "Start at" field wins; otherwise a ?t= in the YouTube link */
export function songStart(d) {
  const m = parseMusic(d.music);
  if (!m) return 0;
  const t = parseTime(d.musicStart);
  return d.musicStart.trim() && !isNaN(t) ? t : m.linkStart;
}

export function validate(d) {
  const errs = [];
  if (!d.to.trim()) errs.push("Enter the birthday person's name.");
  d.quiz.forEach((q, i) => {
    if (!q.q.trim()) return;
    if (q.options.filter(o => o.trim()).length < 2) errs.push(`Question ${i + 1}: add at least 2 answers.`);
    if (q.answer < 0 || !(q.options[q.answer] || '').trim()) errs.push(`Question ${i + 1}: mark the correct answer (it can't be empty).`);
  });
  if (parseMusic(d.music) === false) errs.push("The song link isn't a valid YouTube or Spotify link (or clear it).");
  if (isNaN(parseTime(d.musicStart))) errs.push('The song start time should look like 1:26 or 86.');
  return errs;
}
