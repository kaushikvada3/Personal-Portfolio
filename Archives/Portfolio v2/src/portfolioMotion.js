import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

function splitChars(element) {
  if (!element) {
    return [];
  }
  if (element.dataset.motionSplit === 'chars') {
    return Array.from(element.querySelectorAll('.char'));
  }

  const text = element.textContent ?? '';
  element.setAttribute('aria-label', text.trim());
  element.textContent = '';
  element.dataset.motionSplit = 'chars';

  return Array.from(text).map((char) => {
    const span = document.createElement('span');
    span.className = 'char';
    span.setAttribute('aria-hidden', 'true');
    span.textContent = char === ' ' ? '\u00A0' : char;
    element.appendChild(span);
    return span;
  });
}

function splitWords(element) {
  if (!element) {
    return [];
  }
  if (element.dataset.motionSplit === 'words') {
    return Array.from(element.querySelectorAll('.word'));
  }

  const text = element.textContent ?? '';
  const words = text.trim().split(/\s+/).filter(Boolean);
  element.setAttribute('aria-label', text.trim());
  element.textContent = '';
  element.dataset.motionSplit = 'words';

  return words.map((word, index) => {
    const span = document.createElement('span');
    span.className = 'word';
    span.setAttribute('aria-hidden', 'true');
    span.textContent = word;
    element.appendChild(span);
    if (index < words.length - 1) {
      element.appendChild(document.createTextNode(' '));
    }
    return span;
  });
}

function animatePanel(section, selector) {
  if (!section) {
    return;
  }
  const items = section.querySelectorAll(selector);
  if (!items.length) {
    return;
  }

  gsap.from(items, {
    y: 34,
    opacity: 0,
    duration: 0.8,
    stagger: 0.1,
    ease: 'power3.out',
    scrollTrigger: {
      trigger: section,
      start: 'top 72%',
      once: true,
    },
  });
}

export function setupPortfolioMotion() {
  const heroPrimary = document.querySelector('.hero-line-primary');
  const heroAccent = document.querySelector('.hero-accent');
  if (!heroPrimary || !heroAccent) {
    return;
  }

  const primaryChars = splitChars(heroPrimary);
  const accentChars = splitChars(heroAccent);

  const heroTimeline = gsap.timeline({
    defaults: { ease: 'power3.out' },
  });

  heroTimeline
    .from('.top-bar-identity', {
      y: -18,
      autoAlpha: 0,
      duration: 0.35,
      clearProps: 'opacity,visibility,transform',
    })
    .from('.top-bar-nav .nav-link', {
      y: -10,
      autoAlpha: 0,
      duration: 0.3,
      stagger: 0.05,
      clearProps: 'opacity,visibility,transform',
    }, '-=0.18')
    .from('.hero-kicker .label-mono', {
      y: 16,
      opacity: 0,
      letterSpacing: '0.48em',
      duration: 0.35,
    }, '-=0.08')
    .from('.hero-kicker-line', {
      scaleX: 0,
      opacity: 0,
      duration: 0.45,
      transformOrigin: 'left center',
    }, '-=0.28')
    .from(primaryChars, {
      yPercent: 110,
      rotateX: -78,
      opacity: 0,
      filter: 'blur(10px)',
      duration: 0.6,
      stagger: 0.015,
    }, '-=0.15')
    .from(accentChars, {
      yPercent: 115,
      xPercent: 4,
      opacity: 0,
      filter: 'blur(12px)',
      duration: 0.55,
      stagger: 0.018,
    }, '-=0.38')
    .from('.hero-sub', {
      y: 24,
      opacity: 0,
      duration: 0.35,
    }, '-=0.28')
    .from('.hero-highlights .hero-highlight', {
      y: 18,
      opacity: 0,
      duration: 0.35,
      stagger: 0.05,
    }, '-=0.2')
    .from('.hero-facts .hero-fact-card', {
      y: 18,
      opacity: 0,
      duration: 0.4,
      stagger: 0.05,
    }, '-=0.28')
    .from('.hero-scroll-indicator', {
      y: 12,
      opacity: 0,
      duration: 0.3,
    }, '-=0.15');

  gsap.to('.hero-scroll-indicator', {
    autoAlpha: 0,
    y: 14,
    ease: 'none',
    scrollTrigger: {
      trigger: '#section-hero',
      start: 'top top',
      end: 'top+=240 top',
      scrub: true,
    },
  });

  gsap.utils.toArray('.scroll-section .section-heading').forEach((heading) => {
    if (heading.closest('#section-hero')) {
      return;
    }

    const words = splitWords(heading);
    gsap.from(words, {
      yPercent: 112,
      rotate: 4,
      opacity: 0,
      duration: 0.82,
      stagger: 0.08,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: heading,
        start: 'top 80%',
        once: true,
      },
    });
  });

  animatePanel(document.getElementById('section-architecture'), '.label-mono, .timeline-entry, .skills-board, .skill-cluster-title, .skill-card');
  animatePanel(document.getElementById('section-projects'), '.label-mono, .project-card');
  animatePanel(document.getElementById('section-contact'), '.contact-header, .interface-row, .btn-primary, .btn-secondary, .meta-item, .contact-footer');

  // Active nav link tracking
  const navLinks = document.querySelectorAll('.nav-link');
  const sections = document.querySelectorAll('.scroll-section');

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const id = entry.target.id;
      navLinks.forEach((link) => {
        const href = link.getAttribute('href');
        link.classList.toggle('active', href === `#${id}`);
      });
    });
  }, { threshold: 0.4 });

  sections.forEach((s) => observer.observe(s));

  ScrollTrigger.refresh();
}
