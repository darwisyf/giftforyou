// Admin only (x-admin-password header)
//   GET  /api/admin/codes                  -> list all codes
//   POST /api/admin/codes { count, note }  -> create codes
import { json, adminCheck, codesStore, newCode } from '../lib/shared.mjs';

export default async req => {
  const denied = adminCheck(req);
  if (denied) return denied;
  const store = codesStore();

  if (req.method === 'POST') {
    let body = {};
    try { body = await req.json(); } catch (e) {}
    const count = Math.min(50, Math.max(1, parseInt(body.count, 10) || 1));
    const note = String(body.note || '').slice(0, 100);
    const codes = [];
    for (let i = 0; i < count; i++) {
      let code;
      do { code = newCode(); } while (await store.getMetadata(code));
      await store.setJSON(code, { note, created: Date.now(), usedBy: null, usedAt: null });
      codes.push(code);
    }
    return json({ codes }, 201);
  }

  if (req.method === 'GET') {
    const { blobs } = await store.list();
    const codes = await Promise.all(blobs.map(async b => ({ code: b.key, ...(await store.get(b.key, { type: 'json' })) })));
    codes.sort((a, b) => (b.created || 0) - (a.created || 0));
    return json({ codes });
  }

  return json({ error: 'Method not allowed' }, 405);
};

export const config = { path: '/api/admin/codes' };
