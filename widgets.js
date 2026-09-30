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

// Musique d'ambiance : coupée par défaut ; si le visiteur l'a activée, elle le suit de page en page
(() => {
  const a = document.getElementById('bg-music'), btn = document.querySelector('.music');
  if (!a || !btn) return;
  const TARGET = .35, KEY = 'musique', POS = 'musique-t';
  let fade;
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
  const ramp = (to, done) => {
    clearInterval(fade);
    fade = setInterval(() => {
      const v = a.volume + (to > a.volume ? .03 : -.03);
      if ((to > a.volume && v >= to) || (to <= a.volume && v <= to)) { a.volume = to; clearInterval(fade); done && done(); }
      else a.volume = Math.max(0, Math.min(1, v));
    }, 40);
  };
  // on reprend le morceau là où la page précédente l'avait laissé
  let restored = false;
  const restore = () => {
    if (restored) return; restored = true;
    let t = 0; try { t = parseFloat(sessionStorage.getItem(POS)) || 0; } catch (e) {}
    if (t) try { a.currentTime = t; } catch (e) {}
  };
  const play = () => { restore(); a.volume = 0; return a.play().then(() => { ui(true); ramp(TARGET); }); };
  const stop = () => { ui(false); ramp(0, () => a.pause()); };
  btn.addEventListener('click', () => {
    const on = a.paused || btn.getAttribute('aria-pressed') === 'false';
    try { localStorage.setItem(KEY, on ? 'on' : 'off'); } catch (e) {}
    on ? play().catch(() => ui(false)) : stop();
  });
  addEventListener('pagehide', () => { try { sessionStorage.setItem(POS, a.currentTime || 0); } catch (e) {} });
  // le bouton n'apparaît que si le fichier existe
  a.addEventListener('error', () => { btn.hidden = true; });
  btn.hidden = false;
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
