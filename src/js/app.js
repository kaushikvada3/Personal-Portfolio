// Profile Data (Inlined for zero-dependency portability)
const profile = {
  name: "Kaushik Vada",
  title: "RTL & VLSI Engineer",
  summary: "Student engineer focused on fluid RTL design pipelines, FPGA prototyping, and constraint-driven silicon implementation.",

  projects: [
    {
      id: "two-level-cache",
      year: "2024",
      name: "Two-Level Cache Controller",
      desc: "Designed a parameterizable two-level cache memory hierarchy (L1/L2) in SystemVerilog, implementing the MESI coherence protocol to ensure data consistency across multicore simulations. Architected for low-latency concurrent access.",
      tags: ["SystemVerilog", "RTL", "Coherence", "Verification"],
      icon: "layers"
    },
    {
      id: "field-vision",
      year: "2025",
      name: "Field Vision Processing",
      desc: "Real-time FPGA vision stack combining a custom RISC-V processing core with sensor-specific pipelines. Architected secure, reconfigurable modules tailored for mission adaptability.",
      tags: ["FPGA", "RISC-V", "Vision", "Xilinx"],
      icon: "cpu"
    },
    {
      id: "smart-power",
      year: "2024",
      name: "Smart Power Monitor",
      desc: "PCB-based energy monitor with embedded C/C++ firmware, wireless telemetry, and an iOS companion app. Integrated voltage/current sensors for precise real-time tracking.",
      tags: ["Embedded", "IoT", "PCB Design"],
      icon: "activity"
    }
  ],

  experience: [
    {
      company: "Intel Corporation",
      role: "RTL Design Intern",
      time: "Jun 2025 - Present",
      location: "San Diego, CA",
      bullets: [
        "Designed synthesizable SystemVerilog modules for compute datapaths, tuned for low-latency and power efficiency.",
        "Implemented self-checking verification benches and executed simulation, lint, synthesis, and STA for sign-off readiness.",
        "Closed functional/timing coverage with architecture & verification teams."
      ]
    },
    {
      company: "VSCLab @ UC Riverside",
      role: "Undergraduate Researcher",
      time: "Sep 2025 - Present",
      location: "Riverside, CA",
      bullets: [
        "Co-designing a custom RISC-V CPU core and practicing complete RTL-to-gate sign-off inside Synopsys flows.",
        "Learning constraint-driven synthesis, SDC authoring, and early optimization strategies for balanced PPA.",
        "Reviewing timing/power reports to optimize pipeline depth."
      ]
    }
  ]
};

// Initialize Lenis
const lenis = new Lenis({
  duration: 1.2,
  easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t))
});

function raf(time) {
  lenis.raf(time);
  requestAnimationFrame(raf);
}

requestAnimationFrame(raf);

// Initialize Feather Icons
if (window.feather) feather.replace();

// Cursor Customization
const cursorDot = document.querySelector('.cursor-dot');
const cursorOutline = document.querySelector('.cursor-outline');

if (cursorDot && cursorOutline) {
  window.addEventListener('mousemove', (e) => {
    const posX = e.clientX;
    const posY = e.clientY;

    cursorDot.style.left = `${posX}px`;
    cursorDot.style.top = `${posY}px`;

    cursorOutline.animate({
      left: `${posX}px`,
      top: `${posY}px`
    }, { duration: 500, fill: "forwards" });
  });
}

// Render Content
function renderProjects() {
  const list = document.getElementById('project-list');
  if (!list) return;

  list.innerHTML = '';

  profile.projects.forEach((p) => {
    const item = document.createElement('div');
    item.classList.add('project-item');
    item.innerHTML = `
            <div class="project-info">
                <span class="project-year">${p.year}</span>
                <h3 class="project-title">${p.name}</h3>
                <p class="project-desc">${p.desc}</p>
                <div class="tags">
                    ${p.tags.map(t => `<span class="tag">${t}</span>`).join('')}
                </div>
            </div>
            <div class="project-visual">
                <div class="project-visual-inner">
                    <i data-feather="${p.icon}"></i>
                </div>
            </div>
        `;
    list.appendChild(item);
  });
}

function renderExperience() {
  const list = document.getElementById('exp-list');
  if (!list) return;

  list.innerHTML = '';

  profile.experience.forEach((e) => {
    const item = document.createElement('div');
    item.classList.add('exp-item');
    item.innerHTML = `
            <div class="exp-header">
                <h4 class="exp-role">${e.role}</h4>
                <div class="exp-company">
                    <span>${e.company}</span>
                    <span>${e.time}</span>
                </div>
            </div>
            <ul class="exp-bullets">
                ${e.bullets.map(b => `<li>${b}</li>`).join('')}
            </ul>
        `;
    list.appendChild(item);
  });
}

// init
renderProjects();
renderExperience();
if (window.feather) feather.replace(); // Re-run for dynamic content

// GSAP Animations
if (window.gsap && window.ScrollTrigger) {
  gsap.registerPlugin(ScrollTrigger);

  // Hero Anims
  const tl = gsap.timeline();
  tl.to(".hero-title", { opacity: 1, y: 0, duration: 1, ease: "power4.out", delay: 0.2 })
    .to(".hero-desc", { opacity: 1, y: 0, duration: 1, ease: "power4.out" }, "-=0.5");

  // Section Titles Parallax
  gsap.utils.toArray('.section-title').forEach(title => {
    gsap.to(title, {
      scrollTrigger: {
        trigger: title,
        start: "top 80%",
        toggleClass: "is-visible"
      }
    });
  });

  // Project Reveals
  gsap.utils.toArray('.project-item').forEach(item => {
    gsap.to(item, {
      scrollTrigger: {
        trigger: item,
        start: "top 75%",
        toggleClass: "active"
      }
    });
  });
}
