// Pages de détail : bilingue EN / FR (même mécanisme que l'accueil) + apparitions au défilement
(() => {
  const d = document.documentElement;
  const ATTR = { 'data-en-alt': 'alt', 'data-en-aria': 'aria-label', 'data-en-href': 'href', 'data-en-content': 'content' };
  const nodes = [...document.querySelectorAll('[data-en]')];
  const attrNodes = [...document.querySelectorAll(Object.keys(ATTR).map(a => '[' + a + ']').join(','))];
  // on mémorise la version française d'origine (le <title> compris)
  nodes.forEach(el => { el._fr = el.innerHTML; });
  attrNodes.forEach(el => { el._frA = {}; for (const a in ATTR) if (el.hasAttribute(a)) el._frA[ATTR[a]] = el.getAttribute(ATTR[a]); });
  const apply = lang => {
    const en = lang === 'en';
    d.lang = en ? 'en' : 'fr';
    nodes.forEach(el => { el.innerHTML = en ? el.dataset.en : el._fr; });
    attrNodes.forEach(el => { for (const a in ATTR) if (el.hasAttribute(a)) el.setAttribute(ATTR[a], en ? el.getAttribute(a) : el._frA[ATTR[a]]); });
    document.querySelectorAll('.lang button').forEach(b => b.setAttribute('aria-pressed', b.dataset.lang === d.lang));
    d.classList.remove('i18n-pending');
    document.dispatchEvent(new CustomEvent('langchange', { detail: d.lang }));
  };
  document.querySelectorAll('.lang button').forEach(b => b.addEventListener('click', () => {
    try { localStorage.setItem('lang', b.dataset.lang); } catch (e) {}
    apply(b.dataset.lang);
  }));
  apply(d.lang === 'fr' ? 'fr' : 'en');
})();

(() => {
  const els = document.querySelectorAll('.rv');
  if (!('IntersectionObserver' in window)) { els.forEach(el => el.classList.add('in')); return; }
  document.documentElement.classList.add('js');
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
  }), { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  els.forEach(el => io.observe(el));
})();

// Une section par écran : un cran de molette = une section (ordinateur), comme l'accueil.
// Si une section dépasse l'écran (petite hauteur), on la parcourt d'abord jusqu'en bas.
(() => {
  const mq = window.matchMedia('(min-width: 901px) and (min-height: 560px)');
  const secs = () => [...document.querySelectorAll('.d-hero, .d-section, body > footer')];
  const root = document.documentElement;
  const maxY = () => root.scrollHeight - innerHeight;
  // haut de la section, sauf le pied de page (hauteur naturelle) aligné sur le bas de l'écran
  const top = el => el.tagName === 'FOOTER' ? maxY() : el.offsetTop;
  let lock = false, acc = 0, t0 = 0, lastEv = 0, lockedAt = 0;
  const current = () => {
    const list = secs();
    if (scrollY >= maxY() - 2) return list.length - 1;
    const y = scrollY + innerHeight / 2;
    const i = list.findIndex(s => s.offsetTop <= y && s.offsetTop + s.offsetHeight > y);
    return i < 0 ? 0 : i;
  };
  const scrollTo = y => {
    lock = true; lockedAt = performance.now();
    window.scrollTo({ top: Math.max(0, Math.min(maxY(), y)), behavior: 'smooth' });
    // on ne relâche qu'après l'animation ET une pause de la molette (inertie du pavé tactile)
    const release = () => {
      const n = performance.now();
      if (n - lockedAt > 700 && n - lastEv > 200) { lock = false; acc = 0; } else setTimeout(release, 60);
    };
    setTimeout(release, 700);
  };
  const step = dir => {
    const list = secs(), i = current(), s = list[i];
    const bottom = s.offsetTop + s.offsetHeight;
    // section plus haute que l'écran : on la termine avant de passer à la suivante
    if (dir > 0 && bottom > scrollY + innerHeight + 4 && s.tagName !== 'FOOTER') return scrollTo(Math.min(bottom - innerHeight, scrollY + innerHeight * .85));
    if (dir < 0 && scrollY > s.offsetTop + 4) return scrollTo(Math.max(s.offsetTop, scrollY - innerHeight * .85));
    const j = Math.max(0, Math.min(list.length - 1, i + dir));
    // en remontant, on arrive en bas de la section précédente si elle est plus haute que l'écran
    const t = list[j];
    scrollTo(dir < 0 && t.offsetHeight > innerHeight + 4 && t.tagName !== 'FOOTER' ? t.offsetTop + t.offsetHeight - innerHeight : top(t));
  };
  window.addEventListener('wheel', e => {
    if (!mq.matches || e.ctrlKey) return;
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY) || e.shiftKey) return;
    e.preventDefault();
    lastEv = performance.now();
    if (lock) return;
    const now = lastEv; if (now - t0 > 250) acc = 0; t0 = now;
    acc += e.deltaY;
    if (Math.abs(acc) < 40) return;            // ignore les micro-mouvements du pavé tactile
    step(acc > 0 ? 1 : -1);
  }, { passive: false });
  // clavier : flèches, Page suivante / précédente, espace
  window.addEventListener('keydown', e => {
    if (!mq.matches || lock || e.altKey || e.ctrlKey || e.metaKey) return;
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
    const down = ['ArrowDown', 'PageDown'].includes(e.key) || (e.key === ' ' && !e.shiftKey);
    const up = ['ArrowUp', 'PageUp'].includes(e.key) || (e.key === ' ' && e.shiftKey);
    if (e.key === 'Home' || e.key === 'End') { e.preventDefault(); scrollTo(e.key === 'Home' ? 0 : maxY()); return; }
    if (down || up) { e.preventDefault(); step(down ? 1 : -1); }
  });
})();

// Silhouette détourée (page Astronomie) : elle flotte en continu ;
// la souris l'attire et amplifie le vol, qui se calme ensuite doucement.
(() => {
  const fig = document.querySelector('.d-media.cutout');
  if (!fig || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const hero = fig.closest('.d-hero') || document.body;
  const fine = matchMedia('(pointer: fine)').matches;
  let tx = 0, ty = 0, mx = 0, my = 0;          // cible et position lissée de la souris (-0,5 … 0,5)
  let energy = 0, lastX = null, lastY = null;  // énergie du vol, nourrie par la vitesse de la souris
  let visible = true, raf = 0;
  const t0 = performance.now();
  const loop = now => {
    const t = (now - t0) / 1000;
    energy *= 0.965;                            // retour progressif au calme
    const amp = 1 + energy * 2.2;
    // flottement : plusieurs sinus de périodes différentes, pour ne jamais paraître mécanique
    const fx = (Math.sin(t * 0.7) * 6 + Math.sin(t * 0.31 + 1.1) * 4) * amp;
    const fy = (Math.sin(t * 0.9 + 0.4) * 12 + Math.sin(t * 0.43) * 5) * amp;
    const fr = (Math.sin(t * 0.55 + 0.8) * 1.6) * amp;
    mx += (tx - mx) * 0.06; my += (ty - my) * 0.06;
    fig.style.setProperty('--fx', (fx + mx * 28).toFixed(2));
    fig.style.setProperty('--fy', (fy + my * 30).toFixed(2));
    fig.style.setProperty('--fr', (fr + mx * 5).toFixed(3));
    raf = visible && !document.hidden ? requestAnimationFrame(loop) : 0;
  };
  const start = () => { if (!raf && visible && !document.hidden) raf = requestAnimationFrame(loop); };
  if (fine) {
    hero.addEventListener('pointermove', e => {
      const r = hero.getBoundingClientRect();
      tx = (e.clientX - r.left) / r.width - 0.5; ty = (e.clientY - r.top) / r.height - 0.5;
      if (lastX !== null) energy = Math.min(1, energy + Math.hypot(e.clientX - lastX, e.clientY - lastY) / 600);
      lastX = e.clientX; lastY = e.clientY;
      start();
    });
    hero.addEventListener('pointerleave', () => { tx = 0; ty = 0; lastX = lastY = null; });
  }
  // pause hors écran ou onglet caché (économie de batterie)
  if ('IntersectionObserver' in window)
    new IntersectionObserver(([e]) => { visible = e.isIntersecting; start(); }).observe(fig);
  document.addEventListener('visibilitychange', start);
  start();
})();

// Liens internes (« Plus de détails »…) : défilement fluide jusqu'à la section
document.addEventListener('click', e => {
  const a = e.target.closest && e.target.closest('a[href^="#"]');
  if (!a || a.getAttribute('href').length < 2) return;
  const target = document.getElementById(a.getAttribute('href').slice(1));
  if (!target) return;
  e.preventDefault();
  const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
  window.scrollTo({ top: target.getBoundingClientRect().top + scrollY, behavior: calm ? 'auto' : 'smooth' });
  history.replaceState(null, '', '#' + target.id);
});

// Visiteurs qui limitent les animations : on fige aussi les animations SVG (orbites, étoile filante)
if (matchMedia('(prefers-reduced-motion: reduce)').matches)
  document.querySelectorAll('svg').forEach(svg => svg.pauseAnimations && svg.pauseAnimations());
