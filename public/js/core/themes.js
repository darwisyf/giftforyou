export const THEMES = {
  rose:     { name: 'Rose',     a: '#ff4d8d', b: '#ff9a8b', bg1: '#fff0f5', bg2: '#ffe3ec', dark: '#4a1029' },
  lavender: { name: 'Lavender', a: '#8b5cf6', b: '#e879f9', bg1: '#f7f2ff', bg2: '#ece3ff', dark: '#2e1065' },
  ocean:    { name: 'Ocean',    a: '#0ea5e9', b: '#2dd4bf', bg1: '#effaff', bg2: '#dcf3ff', dark: '#0c3a52' },
  sunset:   { name: 'Sunset',   a: '#f97316', b: '#f43f5e', bg1: '#fff7ed', bg2: '#ffe8d6', dark: '#4a1d06' },
  mint:     { name: 'Mint',     a: '#10b981', b: '#84cc16', bg1: '#f0fdf6', bg2: '#dcfce9', dark: '#0b3b2c' }
};

export const themeOf = key => THEMES[key] || THEMES.rose;

export function applyTheme(key) {
  const t = themeOf(key);
  const r = document.documentElement.style;
  r.setProperty('--a', t.a); r.setProperty('--b', t.b);
  r.setProperty('--bg1', t.bg1); r.setProperty('--bg2', t.bg2); r.setProperty('--dark', t.dark);
}
