// Boutons flottants, présents sur toutes les pages : « Discutons » et musique d'ambiance.
// À charger après le script de langue (qui émet l'événement « langchange »).

// « Discutons » : menu WhatsApp / e-mail, toujours visible
(() => {
  const cta = document.getElementById('cta'); if (!cta) return;
  const btn = cta.querySelector('.cta-main');
  const set = o => { cta.classList.toggle('open', o); btn.setAttribute('aria-expanded', o); };
  btn.addEventListener('click', e => { e.stopPropagation(); set(!cta.classList.contains('open')); });
  document.addEventListener('click', e => { if (!cta.contains(e.target)) set(false); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') set(false); });
  cta.querySelectorAll('.cta-menu a').forEach(a => a.addEventListener('click', () => set(false)));
})();

// Musique d'ambiance : coupée par défaut. Pour qu'elle ne s'interrompe jamais en changeant de page,
// la page où elle joue reste vivante : les pages suivantes s'ouvrent par-dessus, dans un cadre plein écran
// (« coquille »). Dans ce cadre, le bouton musique pilote la musique de la page d'origine.
(() => {
  const a = document.getElementById('bg-music'), btn = document.querySelector('.music');
  if (!a || !btn) return;
  const TARGET = .35, KEY = 'musique', POS = 'musique-t', SHELL = 'rs-shell';
  const tip = btn.querySelector('.tip');
  const ui = on => {
    btn.classList.toggle('playing', on);
    btn.setAttribute('aria-pressed', on);
    const en = document.documentElement.lang === 'en';
    const t = on ? (en ? 'Pause music' : 'Couper la musique') : (en ? 'Play music' : 'Activer la musique');
    btn.setAttribute('aria-label', t); if (tip) tip.textContent = t;
  };
  ui(false);
  document.addEventListener('langchange', () => ui(btn.classList.contains('playing')));
  a.addEventListener('error', () => { btn.hidden = true; });   // le bouton n'apparaît que si le fichier existe
  btn.hidden = false;

  // ——— Page ouverte dans la coquille : le bouton commande la musique de la page d'origine ———
  if (window.name === SHELL && window.parent !== window) {
    const send = msg => window.parent.postMessage(Object.assign({ rs: 1 }, msg), '*');
    addEventListener('message', e => { if (e.data && e.data.rs && e.data.type === 'state') ui(!!e.data.playing); });
    btn.addEventListener('click', () => send({ type: 'toggle' }));
    const announce = () => send({ type: 'page', href: location.href, title: document.title });
    announce(); document.addEventListener('langchange', announce);
    return;
  }

  // ——— Page d'origine (la seule qui joue la musique) ———
  let fade;
  const ramp = (to, done) => {
    clearInterval(fade);
    fade = setInterval(() => {
      const v = a.volume + (to > a.volume ? .03 : -.03);
      if ((to > a.volume && v >= to) || (to <= a.volume && v <= to)) { a.volume = to; clearInterval(fade); done && done(); }
      else a.volume = Math.max(0, Math.min(1, v));
    }, 40);
  };
  // on reprend le morceau là où une visite précédente l'avait laissé
  let restored = false;
  const restore = () => {
    if (restored) return; restored = true;
    let t = 0; try { t = parseFloat(sessionStorage.getItem(POS)) || 0; } catch (e) {}
    if (t) try { a.currentTime = t; } catch (e) {}
  };
  let frame = null;
  const tell = () => { if (frame && frame.contentWindow) frame.contentWindow.postMessage({ rs: 1, type: 'state', playing: !a.paused && btn.classList.contains('playing') }, '*'); };
  const play = () => { restore(); a.volume = 0; return a.play().then(() => { ui(true); ramp(TARGET); tell(); }); };
  const stop = () => { ui(false); tell(); ramp(0, () => a.pause()); };
  const toggle = () => {
    const on = a.paused || btn.getAttribute('aria-pressed') === 'false';
    try { localStorage.setItem(KEY, on ? 'on' : 'off'); } catch (e) {}
    on ? play().catch(() => { ui(false); tell(); }) : stop();
  };
  btn.addEventListener('click', toggle);
  addEventListener('pagehide', () => { try { sessionStorage.setItem(POS, a.currentTime || 0); } catch (e) {} });

  // Ouvre une page du site par-dessus celle-ci, sans l'arrêter
  const openInShell = href => {
    if (!frame) {
      frame = document.createElement('iframe');
      frame.name = SHELL; frame.title = document.title;
      frame.setAttribute('allow', 'autoplay; fullscreen');
      frame.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;border:0;z-index:2147483000;background:#150204';
      document.body.appendChild(frame);
      document.documentElement.style.overflow = 'hidden';
      // la page d'origine passe à l'arrière-plan : ses boutons flottants s'effacent, elle devient inerte
      [...document.body.children].forEach(el => { if (el !== frame && el !== a) el.setAttribute('inert', ''); });
      document.querySelectorAll('.cta, .music').forEach(el => { el.style.visibility = 'hidden'; });
      frame.addEventListener('load', tell);
    }
    frame.src = href;
  };
  addEventListener('message', e => {
    if (!frame || e.source !== frame.contentWindow || !e.data || !e.data.rs) return;
    if (e.data.type === 'toggle') toggle();
    if (e.data.type === 'page') {
      tell();
      if (e.data.title) document.title = e.data.title;
      try { history.replaceState(null, '', e.data.href); } catch (err) {}   // la barre d'adresse suit la page affichée
    }
  });
  // Lien interne cliqué pendant que la musique joue : on ouvre la page dans la coquille
  document.addEventListener('click', e => {
    if (a.paused || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const link = e.target.closest && e.target.closest('a[href]');
    if (!link || link.target === '_blank' || link.hasAttribute('download')) return;
    const url = new URL(link.getAttribute('href'), location.href);
    if (!/\.html?$/.test(url.pathname) || url.protocol !== location.protocol || url.host !== location.host) return;
    if (url.pathname === location.pathname) return;   // ancre sur la même page : comportement normal
    e.preventDefault();
    openInShell(url.href);
  });

  // si le visiteur l'avait activée : on essaie de relancer tout de suite ; si le navigateur bloque
  // le son automatique, on relance au premier clic ou à la première touche
  let pref = null; try { pref = localStorage.getItem(KEY); } catch (e) {}
  if (pref === 'on') {
    play().catch(() => {
      ui(false);
      const resume = e => {
        removeEventListener('pointerdown', resume); removeEventListener('keydown', resume);
        if (e.target.closest && e.target.closest('.music')) return;
        play().catch(() => ui(false));
      };
      addEventListener('pointerdown', resume);
      addEventListener('keydown', resume);
    });
  }
})();
