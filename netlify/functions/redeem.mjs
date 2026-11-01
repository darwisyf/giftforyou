// POST /api/redeem { code }
//   unused code -> { status: 'unused' }                     (it will be used when they create the link)
//   used code   -> { status: 'used', id, editKey, data }    (opens that gift for editing on this device)
import { json, normCode, codesStore, giftsStore, addEditKey } from '../lib/shared.mjs';

export default async req => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  let body = {};
  try { body = await req.json(); } catch (e) {}
  const code = normCode(body.code);
  const rec = code && await codesStore().get(code, { type: 'json' });
  if (!rec) return json({ error: "That code isn't valid. Please check it and try again." }, 404);
  if (!rec.usedBy) return json({ status: 'unused', code });

  const gifts = giftsStore();
  const gift = await gifts.get(rec.usedBy, { type: 'json' });
  if (!gift) return json({ error: 'The gift for this code was removed.' }, 410);
  const editKey = await addEditKey(gift);
  await gifts.setJSON(rec.usedBy, gift);
  return json({ status: 'used', code, id: rec.usedBy, editKey, data: gift.data });
};

export const config = { path: '/api/redeem' };
