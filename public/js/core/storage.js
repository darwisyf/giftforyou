// What's remembered on this device: the draft, the link it was published to, and an unused code
import { normalize } from './model.js';

const DRAFT_KEY = 'bdayWish.draft.v1';
const LINK_KEY = 'bdayWish.link.v1'; // { id, editKey }
const CODE_KEY = 'bdayWish.code.v1'; // an unused access code waiting to be used

export function loadDraft() {
  try { const raw = localStorage.getItem(DRAFT_KEY); return raw ? normalize(JSON.parse(raw)) : null; }
  catch (e) { return null; }
}
/* returns false when the browser storage is full (too many un-uploaded photos) */
export function saveDraft(state) {
  try { localStorage.setItem(DRAFT_KEY, JSON.stringify(state)); return true; }
  catch (e) { return false; }
}
export function clearDraft() {
  try { localStorage.removeItem(DRAFT_KEY); } catch (e) {}
}

export function getLink() {
  try { const l = JSON.parse(localStorage.getItem(LINK_KEY)); return l && l.id && l.editKey ? l : null; }
  catch (e) { return null; }
}
export function setLink(l) {
  try { l ? localStorage.setItem(LINK_KEY, JSON.stringify(l)) : localStorage.removeItem(LINK_KEY); } catch (e) {}
}

export const getCode = () => { try { return localStorage.getItem(CODE_KEY) || ''; } catch (e) { return ''; } };
export function setCode(c) {
  try { c ? localStorage.setItem(CODE_KEY, c) : localStorage.removeItem(CODE_KEY); } catch (e) {}
}

export const linkUrl = id => `${location.origin}/g/${id}`;
