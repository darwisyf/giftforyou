// Save the gift to the server
import { api } from '../core/api.js';
import { getLink, setLink, setCode } from '../core/storage.js';
import { allImages } from '../core/model.js';

/* Error with the server's message and reason ('invalid' | 'used' for code problems) */
function fail(r, msg) {
  const e = new Error((r.j && r.j.error) || `${msg} (${r.status})`);
  e.reason = r.j && r.j.reason;
  return e;
}

async function uploadPhotos(state, onProgress, persist) {
  const pending = allImages(state).filter(im => im.src.startsWith('data:'));
  let n = 0;
  for (const im of pending) {
    onProgress(`Uploading photos… ${++n} / ${pending.length}`);
    const blob = await (await fetch(im.src)).blob();
    const r = await api.uploadImage(blob);
    if (!r.ok || !r.j || !r.j.url) throw fail(r, 'Photo upload failed');
    im.src = r.j.url; // photo now lives on the server; the draft stays small
    persist();
  }
}

/* First time: uses the access code and creates the link. Returns { id, editKey } */
export async function createGift(state, code, { onProgress, persist }) {
  await uploadPhotos(state, onProgress, persist);
  onProgress('Creating your link…');
  const r = await api.createGift(code, state);
  if (!r.ok || !r.j || !r.j.id) throw fail(r, 'Saving failed');
  const link = { id: r.j.id, editKey: r.j.editKey };
  setLink(link);
  setCode(null);
  return link;
}

/* Afterwards: free updates to the same link */
export async function updateGift(state, { onProgress, persist }) {
  const link = getLink();
  await uploadPhotos(state, onProgress, persist);
  onProgress('Saving…');
  const r = await api.updateGift(link, state);
  if (!r.ok) throw fail(r, 'Saving failed');
  return link;
}
