// Profile Data
const profile = {
  name: "Kaushik Vada",
  title: "RTL & VLSI Engineer",
  summary: "Electrical Engineering student at UCR (GPA 3.93) specializing in VLSI, RTL design, and Computer Architecture. Experienced in SystemVerilog, FPGA prototyping, and ASIC verification flows.",
  contacts: {
    email: "kaushikvada3@gmail.com",
    phone: "858-305-8647",
    linkedin: "https://www.linkedin.com/in/kaushikv198",
    github: "https://github.com/kaushikvada3",
    resume: "assets/Kaushik_Vada_Resume.pdf"
  },
  skills: {
    languages: "Verilog, SystemVerilog, C/C++, Python, TCL, MATLAB, LaTeX",
    tools: "Synopsys Design Compiler, Synopsys VCS, Xilinx Vivado, Verdi, LTspice, Cadence Virtuoso",
    concepts: "RTL Design, Static Timing Analysis, Computer Architecture, Caches, RISC-V Architecture, Logic Synthesis",
    protocols: "UART, APB, Valid/Ready Handshake",
    os: "Unix/Linux, Windows"
  },
  education: {
    school: "University of California, Riverside",
    degree: "B.S. Electrical Engineering · Regents Distinguished Scholar",
    date: "Aug 2023 - May 2027",
    details: [
      "GPA: 3.93/4.00",
      "Relevant Coursework: Introduction to VLSI, Data Structures and Algorithms, Design and Architecture of Computer Systems, Machine Organization and Assembly Language, Digital Logic Design."
    ]
  },
  projects: [
    {
      id: "two-level-cache",
      year: "Verilog · Caches · Jan 2025 - Present",
      name: "Two-Level Cache RTL (L1/L2)",
      desc: "Designed a parameterizable two-level cache memory hierarchy (L1/L2) in SystemVerilog, implementing the MESI coherence protocol to ensure data consistency across multicore simulations. Architected for low-latency concurrent access.",
      bullets: [
        "Implemented configurable Verilog RTL for L1/L2 caches (parameterized sets, ways, and line sizes) with LRU replacement and write-back/write-allocate policies.",
        "Designed tag/data/valid arrays and a lightweight memory interface to emulate main-memory latency and hierarchy-level handshakes.",
        "Developed directed verification tests in Synopsys VCS to stress hit/miss paths, replacement behavior, and write-back/write-allocate flows.",
        "Debugged behavior using Verdi by instrumenting hit/miss counters, tracing tag/LRU updates, and inspecting waveforms across cache configurations.",
        "Analyzed timing and throughput trade-offs through parameter sweeps under varying associativities and line sizes."
      ]
    },
    {
      id: "risc-v-pipeline",
      year: "Verilog · FPGA · Jun 2025 - Present",
      name: "RISC-V Pipeline Modules",
      desc: "Implemented core RTL stages for a custom RISC-V soft-core processor on FPGA. Validated correctness via Vivado simulation and waveform analysis.",
      bullets: [
        "Implemented core RTL modules for a custom RISC-V processor on FPGA, including Instruction Fetch, Instruction Decode, and ALU stages.",
        "Simulated, debugged, and waveform-analyzed pipeline behavior using Xilinx Vivado.",
        "Collaborated with teammates integrating pipeline modules into a larger embedded vision system."
      ]
    },
    {
      id: "bms",
      year: "Embedded · BMS · Nov 2024 - Present",
      name: "Battery Management System",
      desc: "PCB-based energy monitor with embedded C/C++ firmware, wireless telemetry, and an iOS companion app.",
      bullets: [
        "Designing a custom PCB-based 10-cell Li-ion BMS with voltage, current, and temperature sensing for safe pack operation.",
        "Performing CAD modeling and thermal simulations to evaluate airflow, heat dissipation, and enclosure design for reliable cooling.",
        "Developing embedded C/C++ firmware for data acquisition, fan control, USB communication, and real-time safety protection.",
        "Validating hardware performance using oscilloscopes, multimeters, and thermistors to ensure accurate sensing and thermal response."
      ]
    }
  ],

  experience: [
    {
      company: "VSCLab @ UC Riverside",
      role: "Undergraduate Researcher",
      location: "Riverside, CA",
      time: "Sep 2025 - Present",
      bullets: [
        "Co-designing a custom RISC-V CPU core and practicing complete RTL-to-gate sign-off inside Synopsys flows.",
        "Learning constraint-driven synthesis, SDC authoring, and early optimization strategies for balanced PPA.",
        "Reviewing timing/power reports to optimize pipeline depth."
      ]
    },
    {
      company: "Digital Force Technologies",
      role: "Hardware Design Intern",
      location: "San Diego, CA",
      time: "Jun 2025 - Aug 2025",
      bullets: [
        "Implemented core RTL modules for a custom RISC-V processor on FPGA, including Instruction Fetch, Instruction Decode, and ALU stages.",
        "Verified module correctness through simulation, waveform inspection, and iterative debugging.",
        "Collaborated with engineers integrating processor components into a larger embedded vision system.",
        "Gained exposure to synthesis and EDA workflows used in industry RTL development environments."
      ]
    }
  ]
};

// Initialize Lenis with smoother settings
const lenis = new Lenis({
  duration: 1.2,
  easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
  direction: 'vertical',
  gestureDirection: 'vertical',
  smooth: true,
  mouseMultiplier: 1,
  smoothTouch: false,
  touchMultiplier: 2,
});

function raf(time) {
  lenis.raf(time);
  requestAnimationFrame(raf);
}

// GSAP ScrollTrigger integration with Lenis
lenis.on('scroll', ScrollTrigger.update);
gsap.ticker.add((time) => {
  lenis.raf(time * 1000);
});
gsap.ticker.lagSmoothing(0);

requestAnimationFrame(raf);

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

// Render Functions for Crystal Glass Aesthetic
function renderProjects() {
  const list = document.getElementById('project-list');
  if (!list) return;

  list.innerHTML = '';

  profile.projects.forEach((p) => {
    const item = document.createElement('div');
    item.className = 'liquidGlass-wrapper project-card-glass';

    // Create the inner content
    const bulletsHtml = p.bullets.map(b => `<li>${b}</li>`).join('');

    item.innerHTML = `
      <div class="liquidGlass-text">
        <div class="project-card-content">
          <span class="project-tech">${p.year}</span>
          <h3>${p.name}</h3>
          <ul>
            ${bulletsHtml}
          </ul>
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
    item.className = 'liquidGlass-wrapper exp-item-glass';

    const bulletsHtml = e.bullets.map(b => `<li>${b}</li>`).join('');

    item.innerHTML = `
      <div class="liquidGlass-text">
        <div class="exp-item-content">
          <h4>${e.role}</h4>
          <div class="exp-company">${e.company} · ${e.location}</div>
          <div class="exp-date">${e.time}</div>
          <ul>
            ${bulletsHtml}
          </ul>
        </div>
      </div>
    `;
    list.appendChild(item);
  });
}

function renderSkills() {
  const grid = document.querySelector('.skills-grid');
  if (!grid) return;

  grid.innerHTML = '';

  // Map friendly names for keys
  const titles = {
    languages: "Programming Languages",
    tools: "Tools",
    concepts: "Concepts",
    protocols: "Protocols",
    os: "OS/Environment"
  };

  for (const [key, value] of Object.entries(profile.skills)) {
    const item = document.createElement('div');
    item.className = 'liquidGlass-wrapper skills-card-glass';

    item.innerHTML = `
        <div class="liquidGlass-text">
          <div class="skills-card-content">
            <h3>${titles[key] || key}</h3>
            <p>${value}</p>
          </div>
        </div>
      `;
    grid.appendChild(item);
  }
}

function renderEducation() {
  const list = document.getElementById('education-list');
  if (!list) return;

  list.innerHTML = '';

  const e = profile.education;
  const item = document.createElement('div');
  item.className = 'liquidGlass-wrapper exp-item-glass';

  const detailsHtml = e.details.map(d => `<li>${d}</li>`).join('');

  item.innerHTML = `
      <div class="liquidGlass-text">
        <div class="exp-item-content">
          <h4>${e.school}</h4>
          <div class="exp-company">${e.degree}</div>
          <div class="exp-date">${e.date}</div>
          <ul>
            ${detailsHtml}
          </ul>
        </div>
      </div>
    `;
  list.appendChild(item);
}


// Liquid Glass Hover Effects
function initHoverEffects() {
  document.querySelectorAll('.liquidGlass-wrapper').forEach(glass => {
    glass.addEventListener('mouseenter', () => {
      gsap.to(glass, {
        scale: 1.02,
        duration: 0.4,
        ease: "power2.out"
      });
    });

    glass.addEventListener('mouseleave', () => {
      gsap.to(glass, {
        scale: 1,
        duration: 0.4,
        ease: "power2.out"
      });
    });
  });
}

// Init Content
document.addEventListener("DOMContentLoaded", () => {

  // Load Displacement Map for Crystal Glass Filter
  const glassImage = document.getElementById('glass-map-image');
  if (glassImage) {
    // Use local asset for reliability
    glassImage.setAttribute('href', 'assets/glass-map.png');
  }

  // Ensure Lenis is running
  requestAnimationFrame(raf);

  // Render all content
  renderProjects();
  renderExperience();
  renderSkills();
  renderEducation();

  initHoverEffects();

  if (window.feather) feather.replace();

  // GSAP Animations - SIMPLIFIED
  if (window.gsap && window.ScrollTrigger) {
    gsap.registerPlugin(ScrollTrigger);

    // Parallax for gradient orbs
    gsap.to(".orb-1", {
      scrollTrigger: {
        trigger: ".hero",
        start: "top top",
        end: "bottom top",
        scrub: 1
      },
      y: 200,
      scale: 1.2
    });
  }

  // Remove loading class
  document.body.classList.remove('is-loading');
});
