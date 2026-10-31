// POST /api/img        -> upload one photo (raw JPEG/PNG/WebP body, max ~4 MB) -> { url }
// GET  /api/img/:key   -> serve the photo
import { getStore } from '@netlify/blobs';
import { json, randomId } from '../lib/shared.mjs';

const MAX_BYTES = 4 * 1024 * 1024;
const TYPES = { 'image/jpeg': [0xff, 0xd8], 'image/png': [0x89, 0x50], 'image/webp': [0x52, 0x49] };

export default async (req, context) => {
  const store = getStore('gift-images');

  if (req.method === 'POST' && !context.params.key) {
    const type = (req.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
    if (!TYPES[type]) return json({ error: 'Only JPEG, PNG or WebP photos are allowed' }, 415);
    const buf = await req.arrayBuffer();
    if (!buf.byteLength) return json({ error: 'Empty photo' }, 400);
    if (buf.byteLength > MAX_BYTES) return json({ error: 'Photo is too large' }, 413);
    const head = new Uint8Array(buf, 0, 2);
    if (head[0] !== TYPES[type][0] || head[1] !== TYPES[type][1]) return json({ error: 'File is not a valid image' }, 400);

    const key = randomId(16);
    await store.set(key, buf, { metadata: { type, created: Date.now() } });
    return json({ url: `/api/img/${key}` }, 201);
  }

  if (req.method === 'GET' && context.params.key) {
    const key = context.params.key;
    if (!/^[a-z0-9]{16}$/.test(key)) return json({ error: 'Not found' }, 404);
    const found = await store.getWithMetadata(key, { type: 'arrayBuffer' });
    if (!found) return json({ error: 'Not found' }, 404);
    const type = (found.metadata && TYPES[found.metadata.type]) ? found.metadata.type : 'image/jpeg';
    return new Response(found.data, {
      headers: {
        'content-type': type,
        'cache-control': 'public, max-age=31536000, immutable', // keys never change content
        'x-content-type-options': 'nosniff'
      }
    });
  }

  return json({ error: 'Method not allowed' }, 405);
};

export const config = { path: ['/api/img', '/api/img/:key'] };
