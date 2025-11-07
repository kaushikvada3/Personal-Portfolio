export const profile = {
  name: "Kaushik Vada",
  title: "Electrical Engineering · RTL & VLSI",
  contact: {
    email: "kaushikvada3@gmail.com",
    phone: "+1 (858) 305-8647",
    location: "San Diego · Riverside, CA",
    linkedin: "https://www.linkedin.com/in/kaushikv198",
  },
  education: {
    school: "University of California, Riverside",
    degree:
      "B.S. Electrical Engineering · Regents Distinguished Scholar (Aug 2023 – May 2027)",
    gpa: "3.93 / 4.00",
    coursework: [
      "Intro to VLSI",
      "Data Structures & Algorithms",
      "Computer Architecture",
      "Machine Organization",
      "Digital Logic Design",
      "Signals & Systems",
      "Circuit Analysis",
      "Intro to Communication Systems",
    ],
  },
  summary:
    "Student engineer focused on fluid RTL design pipelines, FPGA prototyping, and constraint-driven silicon implementation. Exploring the entire RTL-to-gates journey to make compute feel as natural as thought.",
  skills: {
    rtl: [
      "SystemVerilog",
      "Verilog",
      "FSM & datapath design",
      "Assertions",
      "Self-checking benches",
    ],
    fpga: ["Xilinx Vivado", "Simulation", "Synthesis", "Timing closure"],
    eda: ["Synopsys Design Compiler (learning)", "PrimeTime STA fundamentals"],
    programming: ["C/C++", "Python", "Linux toolchain"],
    protocols: ["UART", "APB"],
  },
  experience: [
    {
      company: "Intel Corporation",
      role: "RTL Design Intern",
      location: "San Diego, CA",
      timeline: "Jun 2025 – Present",
      focus: "Latency-sensitive SoC datapath RTL and verification",
      bullets: [
        "Designed synthesizable SystemVerilog modules for compute datapaths, tuned for low-latency and power efficiency.",
        "Implemented self-checking verification benches and executed simulation, lint, synthesis, and STA for sign-off readiness.",
        "Closed functional/timing coverage with architecture + verification teams, resolving CDC and corner-case scenarios in industry EDA flows.",
      ],
    },
    {
      company: "VSCLab · UC Riverside",
      role: "Undergraduate Researcher",
      location: "Riverside, CA",
      timeline: "Sep 2025 – Present",
      focus: "Open-source RISC-V RTL + Synopsys constraint learning",
      bullets: [
        "Co-designing a custom RISC-V CPU core and practicing complete RTL-to-gate sign-off inside Synopsys flows.",
        "Learning constraint-driven synthesis, SDC authoring, and early optimization strategies for balanced PPA.",
        "Reviewing timing/power reports with mentors to reason about pipeline depth, clock gating, and cell selection trade-offs.",
      ],
    },
  ],
  projects: [
    {
      name: "Military-Grade Field Vision Processing System",
      timeline: "Jun 2025 – Present",
      description:
        "Real-time FPGA vision stack combining a custom RISC-V processing core with sensor-specific pipelines for autonomous navigation and defense scenarios.",
      highlights: [
        "Leveraged FPGA parallelism for low-latency perception and RISC-V firmware for decision logic.",
        "Architected secure, reconfigurable modules tailored for mission adaptability.",
      ],
    },
    {
      name: "Smart Power Monitoring & Control System",
      timeline: "Nov 2024 – Present",
      description:
        "PCB-based energy monitor with embedded C/C++ firmware, wireless telemetry, and an iOS companion app.",
      highlights: [
        "Integrated voltage/current sensors with microcontroller firmware for accurate telemetry.",
        "Built early iOS visualizations over Bluetooth/Wi-Fi and validated HW accuracy with scopes + multimeters.",
      ],
    },
  ],
  metrics: [
    { label: "RTL Modules Verified", value: "34" },
    { label: "FPGA Hours Logged", value: "210+" },
    { label: "GPA", value: "3.93" },
    { label: "Latency Target", value: "4.2ns" },
  ],
};

export default profile;
