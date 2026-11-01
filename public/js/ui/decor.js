// Decorative backgrounds and the simple full-screen message
import { app, view } from '../core/utils.js';

export function heartsHTML() {
  const em = ['💖', '💕', '🎈', '✨', '🎉', '💗'];
  let s = '<div class="hearts">';
  for (let i = 0; i < 14; i++) {
    s += `<span style="left:${Math.random() * 100}%;animation-duration:${8 + Math.random() * 10}s;animation-delay:${-Math.random() * 15}s;font-size:${16 + Math.random() * 18}px">${em[i % em.length]}</span>`;
  }
  return s + '</div>';
}

export function balloonsHTML(theme) {
  const cols = [theme.a, theme.b, '#ffd166', '#4cc9f0', '#06d6a0', '#f72585'];
  let s = '<div class="balloons">';
  for (let i = 0; i < 12; i++) {
    const size = 0.7 + Math.random() * 0.6;
    s += `<span class="balloon" style="left:${Math.random() * 95}%;background:${cols[i % cols.length]};animation-duration:${11 + Math.random() * 9}s;animation-delay:${-Math.random() * 16}s;width:${64 * size}px;height:${80 * size}px"></span>`;
  }
  return s + '</div>';
}

/* title/text are trusted (written by us), not user input */
export function showMessage(emoji, title, text = '') {
  view.mode = 'message';
  app.innerHTML = `<div class="screen">${heartsHTML()}<div class="panel">
    <div class="bigemoji">${emoji}</div><h1>${title}</h1>${text ? `<p class="lead">${text}</p>` : ''}
  </div></div>`;
}
