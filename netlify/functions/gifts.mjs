// POST /api/gifts       -> create a gift (needs a valid, unused x-access-code) -> { id, editKey }
// GET  /api/gifts/:id   -> read a gift (public)
// PUT  /api/gifts/:id   -> update my gift (needs x-edit-key; free, any number of times)
import { json, randomId, giftsStore, codesStore, validId, ownGift, normCode, addEditKey } from '../lib/shared.mjs';

const MAX_BODY = 500 * 1024; // photos are uploaded separately, so the gift itself is just text
const IMG_SRC = /^\/api\/img\/[a-z0-9]{16}$/;
const THEMES = ['rose', 'lavender', 'ocean', 'sunset', 'mint'];

const str = (v, max) => (typeof v === 'string' ? v.slice(0, max) : '');
const arr = v => (Array.isArray(v) ? v : []);
const images = list => arr(list).filter(i => i && IMG_SRC.test(i.src)).slice(0, 80)
  .map(i => ({ src: i.src, caption: str(i.caption, 300) }));

// Keep only known fields with sane sizes — never store whatever the client sends
function clean(d) {
  if (!d || typeof d !== 'object') return null;
  const out = {
    v: 1,
    theme: THEMES.includes(d.theme) ? d.theme : 'rose',
    to: str(d.to, 80).trim(),
    from: str(d.from, 80),
    introTitle: str(d.introTitle, 300),
    introText: str(d.introText, 3000),
    quiz: arr(d.quiz).slice(0, 5).map(q => ({
      q: str(q && q.q, 300),
      options: [0, 1, 2, 3].map(i => str(q && q.options && q.options[i], 200)),
      answer: q && Number.isInteger(q.answer) && q.answer >= -1 && q.answer <= 3 ? q.answer : -1
    })),
    quizEndMsg: str(d.quizEndMsg, 3000),
    heroTitle: str(d.heroTitle, 300),
    sections: arr(d.sections).slice(0, 40).map(s => ({
      title: str(s && s.title, 300),
      text: str(s && s.text, 20000),
      images: images(s && s.images)
    })),
    images: images(d.images),
    music: str(d.music, 400),
    musicStart: str(d.musicStart, 12),
    closing: str(d.closing, 5000)
  };
  return out.to ? out : null;
}

async function readGift(req) {
  const text = await req.text();
  if (text.length > MAX_BODY) return { error: json({ error: 'Gift is too large' }, 413) };
  let data;
  try { data = clean(JSON.parse(text)); } catch (e) { data = null; }
  if (!data) return { error: json({ error: 'Invalid gift data' }, 400) };
  return { data };
}

export default async (req, context) => {
  const store = giftsStore();
  const id = context.params.id ? String(context.params.id).toLowerCase() : null;

  if (req.method === 'GET' && id) {
    if (!validId(id)) return json({ error: 'Not found' }, 404);
    const rec = await store.get(id, { type: 'json' });
    if (!rec) return json({ error: 'Not found' }, 404);
    return json(rec.data);
  }

  if (req.method === 'POST' && !id) {
    // 1) the access code must exist and not be used yet
    const code = normCode(req.headers.get('x-access-code'));
    const codes = codesStore();
    const c = code && await codes.get(code, { type: 'json' });
    if (!c) return json({ error: "That code isn't valid. Please check it and try again.", reason: 'invalid' }, 403);
    if (c.usedBy) return json({ error: 'This code was already used for another gift.', reason: 'used' }, 409);

    const { data, error } = await readGift(req);
    if (error) return error;

    // 2) save the gift, then mark the code as used by it
    let newId;
    do { newId = randomId(8); } while (await store.getMetadata(newId));
    const now = Date.now();
    const rec = { data, code, created: now, updated: now };
    const editKey = await addEditKey(rec);
    await store.setJSON(newId, rec);
    await codes.setJSON(code, { ...c, usedBy: newId, usedAt: now });
    return json({ id: newId, editKey }, 201);
  }

  if (req.method === 'PUT' && id) {
    const { rec, error: denied } = await ownGift(req, id);
    if (denied) return denied;
    const { data, error } = await readGift(req);
    if (error) return error;
    await store.setJSON(id, { ...rec, data, updated: Date.now() });
    return json({ id });
  }

  return json({ error: 'Method not allowed' }, 405);
};

export const config = { path: ['/api/gifts', '/api/gifts/:id'] };
