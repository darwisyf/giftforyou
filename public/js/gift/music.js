// Background song: YouTube or Spotify player that survives screen changes
import { loadScript, withTimeout } from '../core/utils.js';
import { parseMusic, songStart } from '../core/model.js';

const host = document.getElementById('musicHost');
let ytP = null, spP = null, spApi = null, ytPlayer = null, spCtrl = null;

function loadYT() {
  if (window.YT && window.YT.Player) return Promise.resolve(true);
  if (!ytP) ytP = withTimeout(new Promise(res => {
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => { if (prev) prev(); res(true); };
    loadScript('https://www.youtube.com/iframe_api').catch(() => res(null));
  }), 7000);
  return ytP;
}

function loadSpotify() {
  if (spApi) return Promise.resolve(spApi);
  if (!spP) spP = withTimeout(new Promise(res => {
    window.onSpotifyIframeApiReady = a => { spApi = a; res(a); };
    loadScript('https://open.spotify.com/embed/iframe-api/v1').catch(() => res(null));
  }), 8000);
  return spP;
}

export function preloadMusic(gift) {
  const m = parseMusic(gift.music);
  if (m && m.kind === 'youtube') loadYT();
  if (m && m.kind === 'spotify') loadSpotify();
}

export function startMusic(gift) {
  if (host.firstChild) return; // already playing
  const m = parseMusic(gift.music);
  if (!m) return;
  const st = songStart(gift);
  host.innerHTML = `<div class="music">
    <div class="mbar"><span><span class="note">🎵</span> <span class="mlabel">${m.kind === 'spotify' ? 'Tap ▶ to play our song' : 'Our song'}</span></span>
      <button data-m="toggle" title="Minimize / expand">▾</button></div>
    <div class="frame"><div id="mPlayer"></div></div>
  </div>`;
  const target = document.getElementById('mPlayer');

  // Plain embed if the player API can't load (the YouTube start time still works)
  const fallback = () => {
    if (!target.isConnected) return;
    target.outerHTML = `<iframe src="${m.embed(st)}" height="${m.h}" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" referrerpolicy="strict-origin-when-cross-origin" title="Background song"></iframe>`;
  };

  if (m.kind === 'youtube') {
    loadYT().then(ok => {
      if (!target.isConnected) return;
      if (!ok) return fallback();
      ytPlayer = new window.YT.Player(target, {
        height: String(m.h), width: '100%', videoId: m.id,
        playerVars: { autoplay: 1, start: st, playsinline: 1, rel: 0 },
        events: {
          onReady: e => { try { e.target.playVideo(); } catch (er) {} },
          onStateChange: e => { if (e.data === 0) { e.target.seekTo(st, true); e.target.playVideo(); } } // loop from the chosen point
        }
      });
    });
  } else {
    loadSpotify().then(a => {
      if (!target.isConnected) return;
      if (!a) return fallback();
      a.createController(target, { uri: `spotify:${m.type}:${m.id}`, width: '100%', height: m.h }, ctrl => {
        spCtrl = ctrl;
        if (!st) return;
        let jumped = false; // jump to the start point the first time it plays
        ctrl.addListener('playback_update', e => {
          const d = e && e.data;
          if (jumped || !d || d.isPaused) return;
          jumped = true;
          if ((d.position || 0) < st * 1000 - 1500) ctrl.seek(st);
        });
      });
    });
  }
}

export function stopMusic() {
  try { if (ytPlayer && ytPlayer.destroy) ytPlayer.destroy(); } catch (e) {}
  try { if (spCtrl && spCtrl.destroy) spCtrl.destroy(); } catch (e) {}
  ytPlayer = spCtrl = null;
  host.innerHTML = '';
}

host.addEventListener('click', e => {
  const b = e.target.closest('[data-m="toggle"]');
  if (!b) return;
  const min = host.querySelector('.music').classList.toggle('min');
  b.textContent = min ? '▴' : '▾';
});
