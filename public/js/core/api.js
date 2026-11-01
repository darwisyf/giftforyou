// All calls to our Netlify Functions
async function call(url, opts) {
  let r;
  try { r = await fetch(url, opts); }
  catch (e) { return { ok: false, status: 0, j: { error: 'No internet connection' } }; }
  let j = null;
  try { j = await r.json(); } catch (e) {}
  return { ok: r.ok, status: r.status, j };
}
const JSON_HDR = { 'content-type': 'application/json' };

export const api = {
  config:      ()           => call('/api/config'),
  uploadImage: blob         => call('/api/img', { method: 'POST', headers: { 'content-type': blob.type || 'image/jpeg' }, body: blob }),
  createGift:  (code, data) => call('/api/gifts', { method: 'POST', headers: { ...JSON_HDR, 'x-access-code': code }, body: JSON.stringify(data) }),
  updateGift:  (link, data) => call('/api/gifts/' + link.id, { method: 'PUT', headers: { ...JSON_HDR, 'x-edit-key': link.editKey }, body: JSON.stringify(data) }),
  getGift:     id           => call('/api/gifts/' + encodeURIComponent(id)),
  redeem:      code         => call('/api/redeem', { method: 'POST', headers: JSON_HDR, body: JSON.stringify({ code }) })
};
