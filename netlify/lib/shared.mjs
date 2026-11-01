// Small helpers shared by the API functions
import { getStore } from '@netlify/blobs';

export const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }
  });

const ALPHABET = 'abcdefghijkmnpqrstuvwxyz23456789'; // no look-alike characters (l, o, 0, 1)
export function randomId(len, alphabet = ALPHABET) {
  const bytes = crypto.getRandomValues(new Uint8Array(len));
  let out = '';
  for (const b of bytes) out += alphabet[b % alphabet.length];
  return out;
}

export async function hash(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
}

/* Comparing secrets without leaking timing information */
export function safeEqual(a, b) {
  a = String(a); b = String(b);
  let diff = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return diff === 0;
}

/* Storage */
export const giftsStore = () => getStore({ name: 'gifts', consistency: 'strong' });
export const codesStore = () => getStore({ name: 'codes', consistency: 'strong' }); // CODE -> { note, created, usedBy, usedAt }

export const validId = id => /^[a-z0-9]{6,20}$/.test(id || '');

/* Access codes look like WISH-7K3M-Q9TX. Users may type them with spaces, dashes or lowercase. */
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const newCode = () => { const r = randomId(8, CODE_ALPHABET); return `WISH-${r.slice(0, 4)}-${r.slice(4)}`; };
export function normCode(v) {
  const s = String(v || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const body = s.startsWith('WISH') ? s.slice(4) : s;
  return /^[A-Z0-9]{8}$/.test(body) ? `WISH-${body.slice(0, 4)}-${body.slice(4)}` : null;
}

/* Gift owners prove themselves with an edit key. A gift can have several (e.g. a second device). */
const hashesOf = rec => rec.editHashes || (rec.editHash ? [rec.editHash] : []);
export async function addEditKey(rec) {
  const editKey = randomId(32);
  rec.editHashes = [...hashesOf(rec), await hash(editKey)].slice(-10);
  delete rec.editHash;
  return editKey;
}

/* Loads a gift and checks the x-edit-key header. Returns { rec } or { error: Response } */
export async function ownGift(req, id) {
  if (!validId(id)) return { error: json({ error: 'Not found' }, 404) };
  const rec = await giftsStore().get(id, { type: 'json' });
  if (!rec) return { error: json({ error: 'Not found' }, 404) };
  const key = req.headers.get('x-edit-key') || '';
  const h = key ? await hash(key) : '';
  if (!key || !hashesOf(rec).some(x => safeEqual(x, h))) return { error: json({ error: 'Not allowed' }, 403) };
  return { rec };
}

/* Admin requests carry the x-admin-password header (ADMIN_PASSWORD environment variable) */
export function adminCheck(req) {
  const pw = process.env.ADMIN_PASSWORD || '';
  if (pw.length < 8) return json({ error: 'Set ADMIN_PASSWORD (8+ characters) in Netlify first' }, 503);
  if (!safeEqual(req.headers.get('x-admin-password') || '', pw)) return json({ error: 'Wrong password' }, 401);
  return null;
}
