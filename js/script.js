// Keep --header-h in sync with the real sticky header height, so anchor
// scrolls and full-viewport sections land flush under it instead of
// leaving a sliver of the next/previous section visible.
const siteHeader = document.querySelector('.site-header');
const setHeaderHeightVar = () => {
  document.documentElement.style.setProperty('--header-h', `${siteHeader.offsetHeight}px`);
};
setHeaderHeightVar();
window.addEventListener('resize', setHeaderHeightVar);

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
  '.about-photo, .about-content, .work-card, .toolkit-col, .timeline-item, .info-badge, .extra-grid > div, .contact-card'
);
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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
