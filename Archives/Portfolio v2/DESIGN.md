```markdown
# System Specification: Silicon & Cinematic Evolution

## 1. Overview & Creative North Star
**The Creative North Star: "The Macro-Silicon Laboratory"**

This design system is a high-fidelity evolution of hardware engineering aesthetics. It rejects the "flat web" in favor of a cinematic, multi-layered experience that mimics the physical and logical depth of modern chip architecture. We are moving away from traditional UI metaphors and toward a "Liquid Glass" environment—where refractive surfaces, high-specular highlights, and Verilog logic flows coexist.

To break the "template" look, we utilize **Intentional Asymmetry**. Layouts should feel like a PCB trace: purposeful but non-linear. Large-scale Newsreader typography provides an editorial, humanistic contrast to the cold, precise execution of "hacker-terminal" monospace details.

---

## 2. Colors & Atmospheric Lighting
Our palette is rooted in the "Deep Lab" aesthetic—a high-contrast dark mode punctuated by the ionized glow of noble gases.

### The Palette
- **Background (`#0c0e12`):** The "Substrate." A near-black depth that serves as the silicon base.
- **Plasma Blue (`primary`: `#6dddff`):** Used for primary actions and active logic states.
- **Phosphor Green (`secondary`: `#2ff801`):** Reserved for "System Ready" states, successful compilations, and high-energy data visualizations.
- **Liquid Glass Highlights (`tertiary`: `#edf8ff`):** Used for specular glints on the edges of glass containers.

### The Rules of Engagement
- **The "No-Line" Rule:** Standard 1px solid borders are strictly prohibited for sectioning. Boundaries must be defined by shifts in the `surface-container` tiers or via "Verilog Borders" (decorative monospace code strings).
- **Surface Hierarchy & Nesting:** Treat the UI as a physical stack.
    - **Base Layer:** `surface`
    - **Mid-Plate:** `surface-container-low` (10% opacity backdrop blur)
    - **Control Surface:** `surface-container-high` (25% opacity backdrop blur)
- **The "Glass & Gradient" Rule:** Main CTAs must use a linear gradient from `primary` to `primary-container` at a 135-degree angle to simulate light passing through a refractive medium.

---

## 3. Typography: The Editorial Engineer
We pair the high-fashion authority of a serif with the utilitarian precision of a terminal.

- **Display & Headlines (Newsreader):** Use `display-lg` for massive, cinematic statements. This brings a "Scientific Journal" prestige to the hardware engineering space.
- **Technical Detail & Code (Space Grotesk / Monospace):** Use `body-sm` and `label-md` for technical specs. All Verilog snippets and hardware addresses must use a monospace font to maintain the "hacker-terminal" feel.
- **Hierarchy through Scale:** Create drama by jumping from `display-lg` (3.5rem) directly to `label-sm` (0.6875rem) for metadata. This "Scale Shock" removes the mid-range "generic web" feel.

---

## 4. Elevation & Depth: The Multi-Layered Substrate
We do not use shadows to lift elements; we use **Refraction and Tonal Layering**.

- **The Layering Principle:** Depth is achieved by "stacking" the `surface-container` tiers. A `surface-container-highest` card should sit atop a `surface-container-low` section. 
- **Liquid Glass (Backdrop Blur):** All floating panels must utilize a `backdrop-filter: blur(20px) saturate(150%)`. This allows the "Plasma Blue" glows and background Verilog snippets to distort beautifully beneath the surface.
- **Ambient Specular Glints:** Instead of a drop shadow, apply a 0.5px "Ghost Border" using `outline-variant` at 15% opacity on the top and left edges only. This simulates a laboratory overhead light hitting the edge of a glass pane.
- **3D Motion Focus:** As the user scrolls, background layers (Verilog traces) should move at 20% of the speed of foreground elements (Parallax), creating a "Motherboard Depth" effect.

---

## 5. Components & Logic Gates

### Buttons: The "Power Cell"
- **Primary:** A "Plasma Blue" (`primary`) glass container with a high-specular top-light. No solid fills; use a 40% translucent gradient.
- **Secondary:** "Phosphor Green" (`secondary`) text with a `label-md` monospace font, encased in a "Ghost Border."
- **States:** Hovering a button should trigger a "Current Flow" effect—increasing the `backdrop-blur` and increasing the `surface-tint` opacity.

### Decorative Elements: Verilog Borders
Instead of lines, use decorative strings of Verilog code (e.g., `always @(posedge clk)`) as dividers. These should be rendered in `on-surface-variant` at 30% opacity, using the `label-sm` scale.

### Cards & Containers
- **Forbid Dividers:** Use `spacing-8` (2.75rem) to separate content sections.
- **Nesting:** All cards must use `roundedness-sm` (0.125rem) to mimic the sharp, precise corners of microchips.

### Input Fields: The "Console"
- Text inputs should be "Bottom-Line Only" using the `primary-dim` color. 
- The cursor should be a "Phosphor Green" block, mimicking a legacy terminal.

---

## 6. Do’s and Don’ts

### Do:
- **Use "Macro" Scale:** Don't be afraid to let a single chip diagram or headline take up 80% of the viewport.
- **Embrace Refraction:** Use the `tertiary` color to create subtle light-leaks in the corners of the UI.
- **Asymmetric Balance:** Place a massive `display-lg` title on the left and a tiny, dense block of monospace Verilog metadata on the far right.

### Don't:
- **Don't use "Web Grids":** Avoid the standard 12-column centered layout. Push elements to the edges to create a "Technical Blueprint" feel.
- **No Solid Shadows:** Never use `rgba(0,0,0,0.5)`. If you need lift, use a tinted blur of `surface-container-highest`.
- **No Rounded Bubbles:** This system is built on "Silicon & Cinematic Scale." Avoid `roundedness-full` unless it is for a status indicator light. Stick to `sm` and `md` corners.

### Accessibility Note:
While we embrace translucency, the "Laboratory Cleanroom" feel requires high legibility. Ensure all `on-surface` text sitting atop "Liquid Glass" containers maintains a contrast ratio of at least 4.5:1 against the *blurred* background. Use `surface-bright` for text overlays if the background becomes too complex.```