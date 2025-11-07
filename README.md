# Kaushik Vada · Resume Portfolio

Fully client-side resume site highlighting Kaushik’s education, experience, projects, and skills. Everything is data-driven so editing one file updates the whole page.

## Stack & Highlights

- Pure HTML/CSS/JS (ES modules) for zero-build hosting.
- Anime.js + SplitType for the hero intro, Lenis for smooth scrolling, and Feather icons for consistent glyphs.
- Resume data lives in `src/data/profile.js`, driving metrics, experience cards, project summaries, and the skill orbit visualization.
- Responsive layout with keyboard-friendly navigation and semantic sectioning.

## Getting Started

1. Open `index.html` in a browser or run `python -m http.server 4173` and visit `http://localhost:4173/`.
2. Update resume content via `src/data/profile.js`.
3. Adjust styling in `src/styles/main.css` and behavior in `src/js/app.js` as needed.

## Ideas to Extend

- Add printable styling or PDF export.
- Hook the data file to a CMS/JSON feed for auto-updates.
- Introduce light/dark theme toggles or localized content.
