import profile from "../data/profile.js";

const qs = (sel) => document.querySelector(sel);
const qsa = (sel) => [...document.querySelectorAll(sel)];

const metricsEl = qs("#liveMetrics");
const experienceEl = qs("#experience");
const projectsEl = qs("#projects");
const educationEl = qs("#educationCard");
const skillOrbitEl = qs("#skillOrbit");
const heroTitle = qs("#heroTitle");
const heroTagline = qs("#heroTagline");
const projectModal = qs("#projectModal");
const projectModalContent = projectModal ? projectModal.querySelector(".project-modal__content") : null;
const projectModalClose = projectModal ? projectModal.querySelector(".project-modal__close") : null;
const navLinks = qsa("[data-nav]");
const navIndicator = qs(".nav-indicator");
const GLASS_TARGETS =
  ".glass-panel, .hero-card, .metric-card, .project-card, .contact-card, .site-nav, .nav-cta";
const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
const ENABLE_ENHANCED_MOTION = false;
const ORBIT_BASE_SPEED = 0.035;
const ORBIT_SPEED_STEP = 0.006;

const orbitChips = [];
let orbitAnimationId = null;
let parallaxCleanup = null;
let glassPointerCleanup = null;
let activeNavLink = null;
let lastFocusedElement = null;
let modalListenersInitialized = false;

const refreshFeatherIcons = () => {
  if (window.feather) {
    window.feather.replace();
  }
};

document.addEventListener("DOMContentLoaded", () => {
  if (heroTagline) {
    heroTagline.textContent = profile.heroTagline;
  }
  renderMetrics();
  renderExperience();
  renderProjects();
  renderEducation();
  renderSkillOrbit();
  if (ENABLE_ENHANCED_MOTION && !motionQuery.matches) {
    initHeroAnimation();
    initLenis();
    initParallax();
  }
  initNav();
  initReveal();
  initNavChrome();
  if (!motionQuery.matches) {
    initGlassMotion();
  }
  window.addEventListener("resize", () => {
    if (activeNavLink) {
      updateNavIndicator(activeNavLink);
    }
  });
});

const handleMotionPreference = (event) => {
  if (event.matches) {
    stopOrbitAnimation();
    if (parallaxCleanup) {
      parallaxCleanup();
    }
    teardownGlassMotion();
  } else {
    if (orbitChips.length) {
      startOrbitAnimation();
    }
    if (ENABLE_ENHANCED_MOTION) {
      initParallax();
    }
    initGlassMotion();
  }
};

if (motionQuery.addEventListener) {
  motionQuery.addEventListener("change", handleMotionPreference);
} else if (motionQuery.addListener) {
  motionQuery.addListener(handleMotionPreference);
}

function renderMetrics() {
  if (!metricsEl) return;
  metricsEl.innerHTML = `
    <div class="metrics-grid">
      ${profile.metrics
        .map(
          (metric) => `
            <div class="metric-card">
              <div class="metric-icon">
                <i data-feather="${metric.icon}"></i>
              </div>
              <div>
                <h3>${metric.value}</h3>
                <p>${metric.label}</p>
              </div>
            </div>
          `,
        )
        .join("")}
    </div>
  `;
  refreshFeatherIcons();
}

function renderExperience() {
  if (!experienceEl) return;
  const cards = profile.experience
    .map(
      (exp) => `
      <article class="band timeline-card reveal">
        <header>
          <div class="experience-brand">
            ${
              exp.logo
                ? `<img src="${exp.logo}" alt="${exp.company} logo" class="experience-logo" loading="lazy" />`
                : `<div class="experience-logo placeholder">${exp.company
                    .split(" ")
                    .map((word) => word[0])
                    .join("")
                    .slice(0, 3)}</div>`
            }
            <div>
              <p class="eyebrow">${exp.company}</p>
              <h3>${exp.role}</h3>
            </div>
          </div>
          <div>
            <div class="meta">
              <p>${exp.location}</p>
              <p>${exp.timeline}</p>
            </div>
            <p class="experience-focus">${exp.focus}</p>
          </div>
        </header>
        <ul>
          ${exp.bullets.map((bullet) => `<li>${bullet}</li>`).join("")}
        </ul>
      </article>
    `,
    )
    .join("");
  experienceEl.innerHTML = `
    <header>
      <p class="eyebrow">Experience</p>
      <h2>Hands-on industry and lab impact.</h2>
    </header>
    <div class="timeline">
      ${cards}
    </div>
  `;
}

function renderProjects() {
  if (!projectsEl) return;
  const projectCards = profile.projects
    .map(
      (proj) => `
      <article class="project-card reveal" data-theme="${proj.theme ?? "teal"}" data-project-id="${proj.id ?? proj.name}" role="button" tabindex="0">
        <div class="project-head">
          <div class="project-icon">
            <i data-feather="${proj.icon ?? "cpu"}"></i>
          </div>
          <div>
            <p class="eyebrow">Project</p>
            <h3>${proj.name}</h3>
            <p class="meta">${proj.timeline}</p>
          </div>
        </div>
        <p class="project-description">${proj.description}</p>
        ${
          proj.tags?.length
            ? `<ul class="project-card__tags">${proj.tags.map((tag) => `<li>${tag}</li>`).join("")}</ul>`
            : ""
        }
        <span class="project-card__cta">Open details</span>
      </article>
    `,
    )
    .join("");

  projectsEl.innerHTML = `
    <header class="full-span">
      <p class="eyebrow">Projects</p>
      <h2>Selected builds and prototypes.</h2>
    </header>
    ${projectCards}
  `;
  refreshFeatherIcons();
  attachProjectCardEvents();
}

function renderEducation() {
  const { education } = profile;
  if (!educationEl) return;
  const location =
    (profile.contact && profile.contact.location) || education.location || "Riverside, CA";
  educationEl.innerHTML = `
    <h3>${education.school}</h3>
    <p>${education.degree}</p>
    <div class="education-meta">
      <span>GPA ${education.gpa}</span>
      <span>${location}</span>
    </div>
    <p>${profile.summary}</p>
    <div class="coursework-grid">
      ${education.coursework.map((course) => `<span class="course-chip">${course}</span>`).join("")}
    </div>
  `;
}

function renderSkillOrbit() {
  if (!skillOrbitEl) return;
  stopOrbitAnimation();
  skillOrbitEl.innerHTML = "";
  orbitChips.length = 0;
  const entries = Object.entries(profile.skills);
  const baseRadius = 120;
  const radiusStep = 55;

  const core = document.createElement("div");
  core.className = "orbit-core";
  core.innerHTML = "<span>Core</span><span>RTL</span>";
  skillOrbitEl.appendChild(core);

  entries.forEach(([category, skills], index) => {
    const radius = baseRadius + index * radiusStep;
    const direction = index % 2 === 0 ? 1 : -1;
    const arc = Math.PI * (1.35 - index * 0.08);
    const startAngle = -Math.PI / 2 + index * 0.25;
    const ring = document.createElement("div");
    ring.className = "orbit-ring";
    ring.style.width = `${radius * 2}px`;
    ring.style.height = `${radius * 2}px`;
    ring.dataset.label = category;
    skillOrbitEl.appendChild(ring);

    skills.forEach((skill, skillIndex) => {
      const divisor = Math.max(skills.length - 1, 1);
      const angle = startAngle + (skillIndex / divisor) * arc;
      const chip = document.createElement("span");
      chip.className = "orbit-chip";
      chip.textContent = skill;
      const x = radius * Math.cos(angle);
      const y = radius * Math.sin(angle);
      chip.style.setProperty("--orbit-x", `${x}px`);
      chip.style.setProperty("--orbit-y", `${y}px`);
      chip.style.top = "50%";
      chip.style.left = "50%";
      skillOrbitEl.appendChild(chip);
      chip.addEventListener("pointerenter", () => chip.classList.add("is-hovered"));
      chip.addEventListener("pointerleave", () => chip.classList.remove("is-hovered"));
      const speed = Math.max(0.015, ORBIT_BASE_SPEED - index * ORBIT_SPEED_STEP);
      orbitChips.push({
        element: chip,
        radius,
        angle,
        baseAngle: angle,
        speed: direction * speed,
        arc,
      });
    });
  });

  if (!motionQuery.matches) {
    startOrbitAnimation();
  }
}

function initHeroAnimation() {
  if (!window.SplitType || !window.anime) return;
  const split = new window.SplitType(heroTitle, { types: "chars" });
  window.anime({
    targets: split.chars,
    opacity: [0, 1],
    translateY: ["40%", "0%"],
    duration: 900,
    easing: "easeOutExpo",
    delay: window.anime.stagger(15),
  });
}

function initLenis() {
  if (!window.Lenis) return;
  const lenis = new window.Lenis({
    smoothWheel: true,
    lerp: 0.08,
  });

  function raf(time) {
    lenis.raf(time);
    requestAnimationFrame(raf);
  }
  requestAnimationFrame(raf);
}

function initNav() {
  const sections = navLinks.map((link) => document.querySelector(link.getAttribute("href")));
  navLinks.forEach((link) => {
    link.addEventListener("click", () => updateNavIndicator(link));
  });
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          navLinks.forEach((link) => {
            if (link.getAttribute("href").slice(1) === entry.target.id) {
              link.classList.add("active");
              updateNavIndicator(link);
            } else {
              link.classList.remove("active");
            }
          });
        }
      });
    },
    { threshold: 0.4 },
  );
  sections.forEach((section) => section && observer.observe(section));
  if (navLinks.length) {
    updateNavIndicator(navLinks[0]);
  }
}

function updateNavIndicator(target) {
  if (!navIndicator || !target || !target.parentElement) return;
  const parentRect = target.parentElement.getBoundingClientRect();
  const targetRect = target.getBoundingClientRect();
  const offset = targetRect.left - parentRect.left;
  navIndicator.style.width = `${targetRect.width}px`;
  navIndicator.style.transform = `translateX(${offset}px)`;
  navIndicator.style.opacity = 1;
  activeNavLink = target;
}

function initNavChrome() {
  const nav = document.querySelector(".site-nav");
  if (!nav) return;
  const updateNavState = () => {
    nav.classList.toggle("is-scrolled", window.scrollY > 32);
  };
  updateNavState();
  window.addEventListener("scroll", updateNavState, { passive: true });
}

function initReveal() {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("reveal-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.2 },
  );

  qsa(".reveal").forEach((element) => observer.observe(element));
}

function initGlassMotion() {
  if (motionQuery.matches || glassPointerCleanup) return;
  const surfaces = qsa(GLASS_TARGETS);
  if (!surfaces.length) return;
  let pointer = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  let rafId = null;

  const updateSurfaces = () => {
    surfaces.forEach((surface) => {
      const rect = surface.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const x = ((pointer.x - (rect.left + rect.width / 2)) / rect.width) * 50 + 50;
      const y = ((pointer.y - (rect.top + rect.height / 2)) / rect.height) * 50 + 50;
      surface.style.setProperty("--glass-spot-x", `${Math.min(Math.max(x, 0), 100)}%`);
      surface.style.setProperty("--glass-spot-y", `${Math.min(Math.max(y, 0), 100)}%`);
    });
    rafId = null;
  };

  const handlePointerMove = (event) => {
    pointer = { x: event.clientX, y: event.clientY };
    if (!rafId) {
      rafId = requestAnimationFrame(updateSurfaces);
    }
  };

  document.addEventListener("pointermove", handlePointerMove);
  glassPointerCleanup = () => {
    document.removeEventListener("pointermove", handlePointerMove);
    glassPointerCleanup = null;
  };
  updateSurfaces();
}

function teardownGlassMotion() {
  if (glassPointerCleanup) {
    glassPointerCleanup();
  }
}

function attachProjectCardEvents() {
  if (!projectsEl) return;
  const cards = projectsEl.querySelectorAll("[data-project-id]");
  cards.forEach((card) => {
    const projectId = card.getAttribute("data-project-id");
    const handleOpen = () => openProjectModal(projectId);
    card.addEventListener("click", handleOpen);
    card.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " " || event.key === "Spacebar") {
        event.preventDefault();
        handleOpen();
      }
    });
  });
  if (!modalListenersInitialized) {
    if (projectModalClose) {
      projectModalClose.addEventListener("click", closeProjectModal);
    }
    if (projectModal) {
      projectModal.addEventListener("click", (event) => {
        if (event.target === projectModal) {
          closeProjectModal();
        }
      });
    }
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && projectModal?.classList.contains("is-visible")) {
        closeProjectModal();
      }
    });
    modalListenersInitialized = true;
  }
}

function openProjectModal(projectId) {
  if (!projectModal || !projectModalContent) return;
  const project = profile.projects.find((proj) => (proj.id ?? proj.name) === projectId);
  if (!project) return;
  projectModalContent.innerHTML = buildProjectModalContent(project);
  refreshFeatherIcons();
  projectModal.classList.add("is-visible");
  projectModal.setAttribute("aria-hidden", "false");
  lastFocusedElement = document.activeElement;
  document.body.style.overflow = "hidden";
  requestAnimationFrame(() => projectModalClose?.focus());
}

function closeProjectModal() {
  if (!projectModal) return;
  projectModal.classList.remove("is-visible");
  projectModal.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
  if (lastFocusedElement && typeof lastFocusedElement.focus === "function") {
    lastFocusedElement.focus();
  }
  lastFocusedElement = null;
}

function buildProjectModalContent(project) {
  const tagsMarkup =
    project.tags?.length
      ? `<ul class="project-card__tags project-modal__tags">${project.tags
          .map((tag) => `<li>${tag}</li>`)
          .join("")}</ul>`
      : "";
  const highlightsMarkup =
    project.highlights?.length
      ? `<div>
          <p class="eyebrow">Highlights</p>
          <ul class="project-highlights">
            ${project.highlights.map((item) => `<li>${item}</li>`).join("")}
          </ul>
        </div>`
      : "";

  return `
    <div class="project-head">
      <div class="project-icon">
        <i data-feather="${project.icon ?? "cpu"}"></i>
      </div>
      <div>
        <p class="eyebrow">Project</p>
        <h3 id="projectModalTitle">${project.name}</h3>
      </div>
    </div>
    <div class="project-modal__meta">
      <span>${project.timeline}</span>
    </div>
    <p>${project.description}</p>
    ${tagsMarkup}
    ${highlightsMarkup}
  `;
}

function initParallax() {
  if (!ENABLE_ENHANCED_MOTION || motionQuery.matches || parallaxCleanup) return;
  const tiltTargets = qsa(".tilt-target");
  if (!tiltTargets.length) return;

  const bounds = new Map();
  const updateBounds = () => {
    tiltTargets.forEach((el) => bounds.set(el, el.getBoundingClientRect()));
  };

  let pointer = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  let rafId = null;

  const applyTilt = () => {
    tiltTargets.forEach((el) => {
      const rect = bounds.get(el);
      if (!rect) return;
      const relativeX = ((pointer.x - (rect.left + rect.width / 2)) / rect.width) * 12;
      const relativeY = ((pointer.y - (rect.top + rect.height / 2)) / rect.height) * 12;
      el.style.setProperty("--tiltX", `${relativeX}deg`);
      el.style.setProperty("--tiltY", `${-relativeY}deg`);
      el.classList.add("is-tilting");
    });
    rafId = null;
  };

  const handlePointer = (event) => {
    pointer = { x: event.clientX, y: event.clientY };
    if (!rafId) {
      rafId = requestAnimationFrame(applyTilt);
    }
  };

  const resetTilt = () => {
    tiltTargets.forEach((el) => {
      el.classList.remove("is-tilting");
      el.style.removeProperty("--tiltX");
      el.style.removeProperty("--tiltY");
    });
  };

  const handlePointerOut = (event) => {
    if (!event.relatedTarget || event.relatedTarget.nodeName === "HTML") {
      resetTilt();
    }
  };

  document.addEventListener("pointermove", handlePointer);
  window.addEventListener("resize", updateBounds);
  window.addEventListener("scroll", updateBounds, { passive: true });
  document.addEventListener("pointerout", handlePointerOut);
  updateBounds();

  parallaxCleanup = () => {
    document.removeEventListener("pointermove", handlePointer);
    window.removeEventListener("resize", updateBounds);
    window.removeEventListener("scroll", updateBounds, { passive: true });
    document.removeEventListener("pointerout", handlePointerOut);
    resetTilt();
    parallaxCleanup = null;
  };
}

function startOrbitAnimation() {
  if (orbitAnimationId || !orbitChips.length || motionQuery.matches) return;
  const baseTime = performance.now();
  const tick = (time) => {
    const delta = (time - baseTime) / 1000;
    orbitChips.forEach((chip, idx) => {
      chip.angle = chip.baseAngle + delta * chip.speed;
      const wobble = Math.sin(delta * 0.6 + idx) * 6;
      const x = (chip.radius + wobble) * Math.cos(chip.angle);
      const y = (chip.radius + wobble) * Math.sin(chip.angle);
      chip.element.style.setProperty("--orbit-x", `${x}px`);
      chip.element.style.setProperty("--orbit-y", `${y}px`);
    });
    orbitAnimationId = requestAnimationFrame(tick);
  };
  orbitAnimationId = requestAnimationFrame(tick);
}

function stopOrbitAnimation() {
  if (orbitAnimationId) {
    cancelAnimationFrame(orbitAnimationId);
    orbitAnimationId = null;
  }
}
