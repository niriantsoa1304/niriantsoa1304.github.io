// Keep --header-h in sync with the real sticky header height, so anchor
// scrolls and full-viewport sections land flush under it instead of
// leaving a sliver of the next/previous section visible.
const siteHeader = document.querySelector('.site-header');
const setHeaderHeightVar = () => {
  document.documentElement.style.setProperty('--header-h', `${siteHeader.offsetHeight}px`);
};
setHeaderHeightVar();
window.addEventListener('resize', setHeaderHeightVar);

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Theme toggle (light/dark)
const themeToggle = document.getElementById('theme-toggle');

const applyTheme = (theme) => {
  document.documentElement.setAttribute('data-theme', theme);
  themeToggle.setAttribute('aria-pressed', theme === 'dark');
};

applyTheme(document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light');

themeToggle.addEventListener('click', () => {
  const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  localStorage.setItem('theme', next);
  applyTheme(next);
});

// Language toggle (English/French) — translatable elements carry a
// data-fr attribute; their original English markup is cached into
// data-en the first time so switching back doesn't need a duplicate copy
const langToggle = document.getElementById('lang-toggle');
if (langToggle) {
  const i18nElements = document.querySelectorAll('[data-fr]');
  const i18nPlaceholders = document.querySelectorAll('[data-fr-placeholder]');

  const applyLang = (lang) => {
    document.documentElement.setAttribute('lang', lang === 'fr' ? 'fr' : 'en');
    i18nElements.forEach((el) => {
      if (el.dataset.en === undefined) el.dataset.en = el.innerHTML;
      el.innerHTML = lang === 'fr' ? el.dataset.fr : el.dataset.en;
    });
    i18nPlaceholders.forEach((el) => {
      if (el.dataset.enPlaceholder === undefined) el.dataset.enPlaceholder = el.placeholder;
      el.placeholder = lang === 'fr' ? el.dataset.frPlaceholder : el.dataset.enPlaceholder;
    });
    langToggle.textContent = lang === 'fr' ? 'EN' : 'FR';
    langToggle.setAttribute('aria-label', lang === 'fr' ? 'Switch to English' : 'Passer en français');
  };

  applyLang(localStorage.getItem('lang') || 'en');

  langToggle.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('lang') === 'fr' ? 'fr' : 'en';
    const next = current === 'fr' ? 'en' : 'fr';
    localStorage.setItem('lang', next);
    applyLang(next);
  });
}

// Ambient starfield for the whole page — a single fixed layer behind all
// content, so it stays visible in the gaps around cards as you scroll
// instead of disappearing once the hero is out of view
const starfield = document.createElement('div');
starfield.className = 'starfield';
starfield.setAttribute('aria-hidden', 'true');

const starCount = prefersReducedMotion ? 24 : 55;
for (let i = 0; i < starCount; i++) {
  const star = document.createElement('span');
  star.className = 'star';
  star.style.setProperty('--size', `${(Math.random() * 2 + 1).toFixed(1)}px`);
  star.style.setProperty('--x', `${(Math.random() * 100).toFixed(1)}%`);
  star.style.setProperty('--y', `${(Math.random() * 100).toFixed(1)}%`);
  star.style.setProperty('--duration', `${(Math.random() * 3 + 2.5).toFixed(1)}s`);
  star.style.setProperty('--delay', `${(Math.random() * 4).toFixed(1)}s`);
  starfield.appendChild(star);
}
document.body.prepend(starfield);

// Scroll-to-top button
const scrollTopBtn = document.createElement('button');
scrollTopBtn.className = 'scroll-top';
scrollTopBtn.type = 'button';
scrollTopBtn.setAttribute('aria-label', 'Back to top');
scrollTopBtn.innerHTML = '<span aria-hidden="true">↑</span>';
document.body.appendChild(scrollTopBtn);

window.addEventListener('scroll', () => {
  scrollTopBtn.classList.toggle('is-visible', window.scrollY > 500);
});

scrollTopBtn.addEventListener('click', () => {
  window.scrollTo({ top: 0, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
});

// "Rate my work" star widget — there's no backend to store submissions,
// so a rating is turned into a pre-filled email instead of vanishing silently
const starRating = document.getElementById('star-rating');
if (starRating) {
  const stars = Array.from(starRating.querySelectorAll('.rate-star'));
  const commentField = document.getElementById('review-comment');
  const submitBtn = document.getElementById('review-submit');
  let selected = 0;

  const paintStars = (value) => {
    stars.forEach((star) => {
      star.classList.toggle('is-filled', Number(star.dataset.value) <= value);
    });
  };

  stars.forEach((star) => {
    star.addEventListener('mouseenter', () => paintStars(Number(star.dataset.value)));
    star.addEventListener('focus', () => paintStars(Number(star.dataset.value)));
    star.addEventListener('click', () => {
      selected = Number(star.dataset.value);
      paintStars(selected);
      starRating.setAttribute('aria-label', `Rated ${selected} out of 5 stars`);
    });
  });

  starRating.addEventListener('mouseleave', () => paintStars(selected));

  submitBtn.addEventListener('click', (event) => {
    event.preventDefault();
    const starLine = '★'.repeat(selected) + '☆'.repeat(5 - selected);
    const subject = encodeURIComponent('Rating for your portfolio');
    const body = encodeURIComponent(
      `Rating: ${starLine} (${selected}/5)\n\n${commentField.value.trim() || '(no comment)'}`
    );
    window.location.href = `mailto:niriantsoa1304@gmail.com?subject=${subject}&body=${body}`;
  });
}

// Mobile nav toggle
const navToggle = document.getElementById('nav-toggle');
const mainNav = document.getElementById('main-nav');

navToggle.addEventListener('click', () => {
  const isOpen = mainNav.classList.toggle('open');
  navToggle.classList.toggle('active', isOpen);
  navToggle.setAttribute('aria-expanded', isOpen);
});

mainNav.querySelectorAll('a').forEach((link) => {
  link.addEventListener('click', () => {
    mainNav.classList.remove('open');
    navToggle.classList.remove('active');
    navToggle.setAttribute('aria-expanded', 'false');
  });
});

// Highlight active section link while scrolling
const sections = document.querySelectorAll('main section[id]');
const navLinks = document.querySelectorAll('.main-nav a');

const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const id = entry.target.getAttribute('id');
        navLinks.forEach((link) => {
          link.classList.toggle('is-active', link.getAttribute('href') === `#${id}`);
        });
      }
    });
  },
  { rootMargin: '-45% 0px -50% 0px' }
);

sections.forEach((section) => observer.observe(section));

// Reveal elements as they scroll into view
const revealTargets = document.querySelectorAll(
  '.about-photo, .about-content, .work-card, .toolkit-col, .timeline-item, .info-badge, .extra-grid > div, .contact-card, .review-card'
);

if (!prefersReducedMotion) {
  revealTargets.forEach((el, i) => {
    el.classList.add('reveal');
    el.style.transitionDelay = `${(i % 4) * 80}ms`;
  });

  const revealObserver = new IntersectionObserver(
    (entries, obs) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          obs.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15 }
  );

  revealTargets.forEach((el) => revealObserver.observe(el));
}
