// Entry point: decide which screen to show
//   /                -> editor
//   /?code=WISH-...  -> editor link: an unused code is kept for "Create link",
//                       a used code opens that gift for editing on this device
//   /g/<id>          -> the gift the birthday person opens
import { api } from './core/api.js';
import { toast } from './core/utils.js';
import { getLink, setLink, setCode } from './core/storage.js';
import { showMessage } from './ui/decor.js';
import { openBuilder } from './builder/builder.js';
import { startGift } from './gift/gift.js';

const giftMatch = location.pathname.match(/^\/g\/([a-z0-9]+)\/?$/i);
const codeParam = new URLSearchParams(location.search).get('code');

async function openGift(id) {
  showMessage('🎁', 'Opening your surprise…');
  const r = await api.getGift(id.toLowerCase());
  if (r.ok) return startGift(r.j);
  if (r.status === 404) return showMessage('😢', 'Gift not found', "This link doesn't exist or was removed. Please double-check the link you received.");
  showMessage('📡', "Couldn't load the gift", 'Please check your internet connection and refresh the page.');
}

async function openEditor() {
  const cfgP = api.config().then(r => (r.ok ? r.j : {}));
  if (!codeParam) return openBuilder(await cfgP);

  showMessage('🎟️', 'Checking your code…');
  const r = await api.redeem(codeParam);
  history.replaceState(null, '', '/'); // keep the code out of the address bar
  const cfg = await cfgP;

  if (!r.ok) {
    openBuilder(cfg);
    return toast('⚠ ' + ((r.j && r.j.error) || "Couldn't check the code"), 6000);
  }
  if (r.j.status === 'unused') {
    setCode(r.j.code);
    openBuilder(cfg);
    return toast(getLink()
      ? 'This code is still unused. Press <b>New gift</b> first to use it for another gift.'
      : '🎟️ Code accepted! Fill in the form, then press <b>Create link</b>.', 6000);
  }
  // used code -> edit that gift here
  setLink({ id: r.j.id, editKey: r.j.editKey });
  setCode(null);
  openBuilder(cfg, r.j.data);
  toast('✏️ Your gift is open for editing. Press <b>Update link</b> to save changes.', 6000);
}

giftMatch ? openGift(giftMatch[1]) : openEditor();
