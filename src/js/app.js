// Profile Data (Inlined for zero-dependency portability)
const profile = {
  name: "Kaushik Vada",
  title: "RTL & VLSI Engineer",
  summary: "Electrical Engineering student at UCR (GPA 3.93) specializing in VLSI, RTL design, and Computer Architecture. Experienced in SystemVerilog, FPGA prototyping, and ASIC verification flows.",

  projects: [
    {
      id: "two-level-cache",
      year: "Jan 2025",
      name: "Two-Level Cache RTL (L1/L2)",
      desc: "Designed a parameterizable, synthesizable two-level cache hierarchy (L1/L2) in Verilog to address the memory wall. Implemented 4-way (L1) and 8-way (L2) set-associative structures with Pseudo-LRU replacement and strict inclusion. Features a Write-back/Write-allocate policy and a custom FSM controller managing IDLE, CHECK_HIT, MISS_SELECT, and REFILL states. Verified using Synopsys VCS with directed tests for hit/miss paths and coherence.",
      tags: ["SystemVerilog", "RTL", "Synopsys VCS", "Verdi", "Computer Architecture"],
      icon: "layers"
    },
    {
      id: "risc-v-pipeline",
      year: "Jun 2025",
      name: "RISC-V Pipeline Modules",
      desc: "Implemented core RTL stages (Fetch, Decode, ALU) for a custom RISC-V soft-core processor on FPGA. Integrated into a larger Field-Vision Processing System for real-time applications. Validated functional correctness via Vivado simulation and waveform analysis.",
      tags: ["Verilog", "RISC-V", "Xilinx Vivado", "FPGA"],
      image: "assets/risc_v_pipeline.png",
      icon: "cpu"
    },
    {
      id: "bms",
      year: "Nov 2024",
      name: "Li-ion Battery Management System",
      desc: "Engineered a custom 10-cell Li-ion BMS PCB with integrated voltage, current, and temperature sensing. Developed embedded C/C++ firmware for real-time safety protection, fan control, and USB telemetry. Performed thermal CAD simulations to optimize enclosure airflow.",
      tags: ["Embedded C++", "PCB Design", "Thermal Simulation", "Hardware"],
      icon: "activity"
    }
  ],

  experience: [
    {
      company: "Digital Force Technologies (DFT)",
      role: "Hardware Design Intern",
      time: "Jun 2025 - Aug 2025",
      location: "San Diego, CA",
      bullets: [
        "Implemented core RTL modules for a custom RISC-V processor on FPGA, including Instruction Fetch, Instruction Decode, and ALU stages.",
        "Verified module correctness through simulation, waveform inspection, and iterative debugging in Xilinx Vivado.",
        "Collaborated with engineers integrating processor components into a larger embedded vision system.",
        "Gained exposure to synthesis and EDA workflows used in industry RTL development environments."
      ]
    },
    {
      company: "VSCLab @ UC Riverside",
      role: "Undergraduate Researcher",
      time: "Sep 2025 - Present",
      location: "Riverside, CA",
      bullets: [
        "Designing and implementing a custom open-source RISC-V CPU core, actively developing pipeline stages and verification infrastructure.",
        "Developing proficiency in Verilog and Synopsys RTL-to-gate flows through ongoing research work.",
        "Learning constraint-driven synthesis in Synopsys Design Compiler, including writing and refining SDC timing constraints."
      ]
    }
  ]
};

// Initialize Lenis with smoother settings
const lenis = new Lenis({
  duration: 1.8, // Increased opacity/smoothness
  easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
  smoothWheel: true,
  wheelMultiplier: 1.2, // Slightly more responsive
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

    // Determine visual content: Image or Icon
    let visualContent = '';
    if (p.image) {
      visualContent = `
                <div class="project-visual-inner" style="background: none; padding: 0;">
                    <img src="${p.image}" alt="${p.name}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 12px; opacity: 0.9;">
                </div>
            `;
    } else {
      visualContent = `
                <div class="project-visual-inner">
                    <i data-feather="${p.icon}"></i>
                </div>
            `;
    }

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
                ${visualContent}
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
