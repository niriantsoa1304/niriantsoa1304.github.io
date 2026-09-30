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

// Silhouettes détourées : elles flottent en continu ; la souris les attire et amplifie le mouvement,
// qui se calme ensuite doucement. La Lune (Astronomie) vole ; le portrait (Enseignement) ondule, posé sur le bandeau.
(() => {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const SETTINGS = {
    moon:     { fx: [6, 4], fy: [12, 5], fr: 1.6, pull: [28, 30, 5], boost: 2.2 },
  };
  document.querySelectorAll('.d-media.cutout:not(.portrait)').forEach(fig => {
    const S = SETTINGS[fig.classList.contains('portrait') ? 'portrait' : 'moon'];
    const hero = fig.closest('.d-hero') || document.body;
    let tx = 0, ty = 0, mx = 0, my = 0, energy = 0, lastX = null, lastY = null, visible = true, raf = 0;
    const t0 = performance.now();
    const loop = now => {
      const t = (now - t0) / 1000;
      energy *= 0.965;                            // retour progressif au calme
      const amp = 1 + energy * S.boost;
      // plusieurs sinus de périodes différentes, pour ne jamais paraître mécanique
      const fx = (Math.sin(t * 0.7) * S.fx[0] + Math.sin(t * 0.31 + 1.1) * S.fx[1]) * amp;
      const fy = (Math.sin(t * 0.9 + 0.4) * S.fy[0] + Math.sin(t * 0.43) * S.fy[1]) * amp;
      const fr = Math.sin(t * 0.55 + 0.8) * S.fr * amp;
      mx += (tx - mx) * 0.06; my += (ty - my) * 0.06;
      fig.style.setProperty('--fx', (fx + mx * S.pull[0]).toFixed(2));
      let y = fy + my * S.pull[1], r = fr + mx * S.pull[2];
      if (S.maxUp) y = Math.max(-Math.min(S.maxUp, fig.offsetWidth * 0.07), y);   // montée proportionnelle à la taille de l'image
      if (S.maxTilt) r = Math.max(-S.maxTilt, Math.min(S.maxTilt, r));
      fig.style.setProperty('--fy', y.toFixed(2));
      fig.style.setProperty('--fr', r.toFixed(3));
      raf = visible && !document.hidden ? requestAnimationFrame(loop) : 0;
    };
    const start = () => { if (!raf && visible && !document.hidden) raf = requestAnimationFrame(loop); };
    if (matchMedia('(pointer: fine)').matches) {
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
  });
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

// ================= Animations des pages de chapitre (body.anim) =================
(() => {
  if (!document.body.classList.contains('anim')) return;
  const chalk = document.body.classList.contains('teach');   // Enseignement : poussière de craie au lieu d'étoiles
  const net = document.body.classList.contains('biz');       // Entrepreneuriat : étoiles qui scintillent, sans traits ni étoiles filantes
  const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Barre de progression dorée en haut de l'écran
  const bar = document.createElement('div'); bar.className = 'scroll-progress'; bar.setAttribute('aria-hidden', 'true');
  document.body.appendChild(bar);
  const prog = () => { const m = document.documentElement.scrollHeight - innerHeight; bar.style.setProperty('--p', m > 0 ? (scrollY / m).toFixed(4) : 0); };
  addEventListener('scroll', prog, { passive: true }); addEventListener('resize', prog); prog();

  if (calm) return;

  // Titre du chapitre : lettres une à une (refait à chaque changement de langue)
  const title = document.querySelector('.d-title');
  const split = () => {
    const t = title.textContent;
    title.setAttribute('aria-label', t);
    title.innerHTML = [...t].map((c, i) => `<span class="ch" aria-hidden="true" style="--i:${i}">${c === ' ' ? '&nbsp;' : c}</span>`).join('');
  };
  if (title) { split(); document.addEventListener('langchange', split); }

  // Cascades : chaque élément d'une section apparaît un peu après le précédent
  document.querySelectorAll('.d-section, .facts').forEach(sec => {
    sec.querySelectorAll('.rv').forEach((el, i) => el.style.setProperty('--d', (Math.min(i, 6) * 0.12).toFixed(2) + 's'));
  });
  document.querySelectorAll('.sky-stars li').forEach((li, i) => li.style.setProperty('--i', i));

  // Compteurs : les chiffres montent jusqu'à leur valeur
  const countUp = el => {
    const target = parseInt(el.textContent, 10); if (!(target > 1)) return;
    const t0 = performance.now(), dur = 1400;
    const step = now => { const k = Math.min(1, (now - t0) / dur); el.textContent = Math.round(target * (1 - Math.pow(1 - k, 3))); if (k < 1) requestAnimationFrame(step); };
    el.textContent = '0'; setTimeout(() => requestAnimationFrame(step), 1700);
  };
  document.querySelectorAll('.d-hero .fact-value').forEach(el => { if (/^\d+$/.test(el.textContent.trim())) countUp(el); });

  // Désignations d'astéroïdes : décodage façon écran de télescope
  const GLYPHS = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789';
  const decode = el => {
    const final = el.textContent; let frame = 0;
    const run = () => {
      el.textContent = [...final].map((c, i) => i < frame / 3 ? c : GLYPHS[Math.random() * GLYPHS.length | 0]).join('');
      if (frame++ < final.length * 3) setTimeout(run, 45); else el.textContent = final;
    };
    run();
  };
  const rec = document.querySelector('.record');
  if (rec && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return; io.disconnect();
      setTimeout(() => rec.querySelectorAll('tbody td:nth-child(-n+2)').forEach((td, i) => setTimeout(() => decode(td), i * 120)), 600);
    }, { threshold: 0.4 });
    io.observe(rec);
  }

  // Ciel étoilé vivant derrière le premier écran : scintillement, parallaxe souris, étoiles filantes
  const hero = document.querySelector('.d-hero');
  const cv = document.createElement('canvas'); cv.className = 'starfield'; cv.setAttribute('aria-hidden', 'true');
  hero.prepend(cv);
  const ctx = cv.getContext('2d');
  let W = 0, H = 0, dpr = 1, stars = [], shooting = null, nextShoot = performance.now() + 2500;
  let mx = 0, my = 0, tx = 0, ty = 0, visible = true, raf = 0;
  const resize = () => {
    dpr = Math.min(2, devicePixelRatio || 1);
    W = hero.clientWidth; H = hero.clientHeight;
    cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const n = Math.round(W * H / 6500);
    stars = Array.from({ length: chalk ? Math.round(n * .8) : n }, () => ({ x: Math.random() * W, y: Math.random() * H, r: Math.random() * (chalk ? 1.8 : 1.2) + .25,
      z: Math.random() * .8 + .2, ph: Math.random() * 6.28, sp: Math.random() * 1.5 + .5, gold: Math.random() < .25,
      vy: -(Math.random() * 12 + 6), vx: Math.random() * 6 - 3 }));   // vitesses (px/s) : la craie s'élève
  };
  let last = performance.now();
  const draw = now => {
    const dt = Math.min(.05, (now - last) / 1000); last = now;
    ctx.clearRect(0, 0, W, H);
    mx += (tx - mx) * .05; my += (ty - my) * .05;
    for (const s of stars) {
      if (chalk) {   // poussière qui monte en ondulant, et revient par le bas
        s.y += s.vy * dt * s.z; s.x += (s.vx + Math.sin(now / 1400 + s.ph) * 8) * dt * s.z;
        if (s.y < -6) { s.y = H + 6; s.x = Math.random() * W; }
      }
      const a = .35 + .65 * (0.5 + 0.5 * Math.sin(now / 1000 * s.sp + s.ph));
      const x = s.x + mx * 26 * s.z, y = s.y + my * 18 * s.z;
      ctx.globalAlpha = a * (.4 + s.z * .6);
      ctx.fillStyle = s.gold ? '#c8a15e' : '#f2e2c6';
      ctx.beginPath(); ctx.arc(x, y, s.r, 0, 6.283); ctx.fill();
    }
    // étoile filante (page Astronomie seulement)
    if (!chalk && !net && !shooting && now > nextShoot) {
      const fromLeft = Math.random() < .5;
      shooting = { x: fromLeft ? Math.random() * W * .5 : W * (.5 + Math.random() * .5), y: Math.random() * H * .35,
        vx: (fromLeft ? 1 : -1) * (7 + Math.random() * 4), vy: 2.5 + Math.random() * 2, life: 0 };
    }
    if (shooting) {
      const s = shooting; s.x += s.vx; s.y += s.vy; s.life++;
      const g = ctx.createLinearGradient(s.x, s.y, s.x - s.vx * 14, s.y - s.vy * 14);
      g.addColorStop(0, 'rgba(242,226,198,.95)'); g.addColorStop(1, 'rgba(200,161,94,0)');
      ctx.globalAlpha = Math.max(0, 1 - s.life / 70); ctx.strokeStyle = g; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(s.x - s.vx * 14, s.y - s.vy * 14); ctx.stroke();
      if (s.life > 70 || s.x < -100 || s.x > W + 100 || s.y > H) { shooting = null; nextShoot = now + 4000 + Math.random() * 5000; }
    }
    ctx.globalAlpha = 1;
    raf = visible && !document.hidden ? requestAnimationFrame(draw) : 0;
  };
  const start = () => { if (!raf && visible && !document.hidden) raf = requestAnimationFrame(draw); };
  resize(); addEventListener('resize', resize);
  if (matchMedia('(pointer: fine)').matches) {
    hero.addEventListener('pointermove', e => { const r = hero.getBoundingClientRect(); tx = (e.clientX - r.left) / r.width - .5; ty = (e.clientY - r.top) / r.height - .5; });
    hero.addEventListener('pointerleave', () => { tx = 0; ty = 0; });
  }
  if ('IntersectionObserver' in window) new IntersectionObserver(([e]) => { visible = e.isIntersecting; start(); }).observe(hero);
  document.addEventListener('visibilitychange', start);
  start();
})();

// Portrait (page Enseignement) : même mouvement que le portrait du hero de l'accueil —
// dérive lente et continue, la souris s'y ajoute ; chaque couche (photo, arche, filet, cercle) a sa propre amplitude.
(() => {
  const fig = document.querySelector('.d-media.cutout.portrait, .d-media.studio');
  if (!fig || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const hero = fig.closest('.d-hero');
  const fine = matchMedia('(pointer: fine)').matches;
  let tx = 0, ty = 0, mx = 0, my = 0, visible = true, raf = 0;
  const t0 = performance.now();
  const loop = now => {
    const t = (now - t0) / 1000;
    const ix = Math.sin(t * 0.55) * 0.22 + Math.sin(t * 0.23 + 1.3) * 0.12;
    const iy = Math.cos(t * 0.41) * 0.20 + Math.sin(t * 0.17 + 0.6) * 0.10;
    mx += (tx - mx) * 0.07; my += (ty - my) * 0.07;
    fig.style.setProperty('--px', (ix + mx * 2.2).toFixed(4));
    fig.style.setProperty('--py', (iy + my * 2.2).toFixed(4));
    raf = visible && !document.hidden ? requestAnimationFrame(loop) : 0;
  };
  const start = () => { if (!raf && visible && !document.hidden) raf = requestAnimationFrame(loop); };
  if (fine) {
    hero.addEventListener('pointermove', e => {
      const r = hero.getBoundingClientRect();
      tx = (e.clientX - r.left) / r.width - 0.5; ty = (e.clientY - r.top) / r.height - 0.5;
    });
    hero.addEventListener('pointerleave', () => { tx = 0; ty = 0; });
  }
  if ('IntersectionObserver' in window)
    new IntersectionObserver(([e]) => { visible = e.isIntersecting; start(); }).observe(hero);
  document.addEventListener('visibilitychange', start);
  start();
})();


// Compteurs de l'atelier (4 · 10 · 2) : ils défilent quand la section arrive à l'écran
(() => {
  const facts = document.querySelector('.ws-facts');
  if (!facts || !document.body.classList.contains('anim') || matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) return;
  const io = new IntersectionObserver(([e]) => {
    if (!e.isIntersecting) return; io.disconnect();
    facts.querySelectorAll('strong').forEach((el, i) => {
      const target = parseInt(el.textContent, 10), t0 = performance.now() + i * 150, dur = 1200;
      el.textContent = '0';
      const step = now => { const k = Math.max(0, Math.min(1, (now - t0) / dur)); el.textContent = Math.round(target * (1 - Math.pow(1 - k, 3))); if (k < 1) requestAnimationFrame(step); };
      requestAnimationFrame(step);
    });
  }, { threshold: .5 });
  io.observe(facts);
})();

// Méthode (Entrepreneuriat) : le fil doré passe par le centre des icônes
(() => {
  const wrap = document.querySelector('.process'); if (!wrap) return;
  const place = () => { const ico = wrap.querySelector('.card-ico'); if (!ico) return;
    const card = ico.closest('.card');   // offsetTop ignore les animations en cours
    wrap.style.setProperty('--thread', (card.offsetTop + ico.offsetTop + ico.offsetHeight / 2).toFixed(1) + 'px'); };
  place(); addEventListener('resize', place); if (document.fonts) document.fonts.ready.then(place);
})();
