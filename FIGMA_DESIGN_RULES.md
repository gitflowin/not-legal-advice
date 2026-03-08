# Not Legal Advice — Design System Rules (Figma-to-Code)

> These rules guide Figma design integration for the "Not Legal Advice" Chrome extension.
> The project is in planning phase — these conventions should be followed as code is scaffolded.

---

## 1. Project Overview

- **Type:** Chrome Extension (Manifest V3)
- **UI surfaces:** Popup (main), Options/Settings page
- **Audience:** Non-technical, privacy-conscious consumers
- **UI framework (recommended from PRD):** Preact or Svelte (lightweight), or vanilla JS/HTML/CSS
- **Styling:** CSS custom properties for tokens, scoped styles (no global CSS leaks into host pages)

---

## 2. Design Tokens

Since no code exists yet, tokens should be defined as CSS custom properties in a central file.

### Planned location
```
src/
  styles/
    tokens.css        ← all design tokens
    global.css         ← base/reset styles for popup & options page
```

### Color Tokens

The UI uses a **traffic-light severity system** (from PRD):

```css
/* src/styles/tokens.css */

:root {
  /* Rating colors — maps to A-F letter grades */
  --color-safe: #22c55e;         /* green — grades A, B */
  --color-caution: #eab308;      /* yellow — grade C */
  --color-danger: #ef4444;        /* red — grades D, F */

  /* Severity indicators for red flags */
  --color-severity-low: #22c55e;
  --color-severity-medium: #eab308;
  --color-severity-high: #ef4444;

  /* Neutral palette */
  --color-bg: #ffffff;
  --color-bg-secondary: #f8fafc;
  --color-text-primary: #0f172a;
  --color-text-secondary: #64748b;
  --color-border: #e2e8f0;

  /* Interactive */
  --color-primary: #6366f1;       /* indigo — primary action */
  --color-primary-hover: #4f46e5;
}
```

### Typography Tokens

```css
:root {
  --font-family: system-ui, -apple-system, sans-serif;
  --font-size-xs: 0.75rem;   /* 12px — cost/meta info */
  --font-size-sm: 0.875rem;  /* 14px — body text */
  --font-size-base: 1rem;    /* 16px — default */
  --font-size-lg: 1.25rem;   /* 20px — section headers */
  --font-size-xl: 1.5rem;    /* 24px — summary header */
  --font-size-rating: 3rem;  /* 48px — letter grade (largest element per PRD) */

  --font-weight-normal: 400;
  --font-weight-medium: 500;
  --font-weight-bold: 700;

  --line-height-tight: 1.25;
  --line-height-normal: 1.5;
}
```

### Spacing Tokens

```css
:root {
  --space-1: 0.25rem;   /* 4px */
  --space-2: 0.5rem;    /* 8px */
  --space-3: 0.75rem;   /* 12px */
  --space-4: 1rem;      /* 16px */
  --space-5: 1.5rem;    /* 24px */
  --space-6: 2rem;      /* 32px */

  --radius-sm: 0.25rem;
  --radius-md: 0.5rem;
  --radius-lg: 0.75rem;
}
```

### Mapping Figma tokens

When implementing Figma designs:
- Map Figma color styles to `--color-*` custom properties
- Map Figma text styles to `--font-size-*` and `--font-weight-*` combinations
- Map Figma spacing/padding to `--space-*` tokens
- Do NOT use raw hex values or pixel sizes — always use token variables

---

## 3. Component Architecture

### Planned structure

```
src/
  components/           ← reusable UI components
    RatingBadge/        ← the large letter grade (A-F)
    RedFlagItem/        ← individual red flag with severity
    SeverityIndicator/  ← colored dot/pill for severity level
    ExpandableSection/  ← collapsible detail sections
    Button/
    LoadingSpinner/
    ErrorMessage/
    CostDisplay/        ← token count and cost estimate
  popup/                ← popup entry point
    popup.html
    popup.js
    popup.css
  options/              ← settings page
    options.html
    options.js
    options.css
  content/              ← content scripts (no UI components)
  background/           ← service worker
  styles/               ← shared tokens and base styles
```

### Component patterns

- Each component gets its own directory with co-located styles
- Components should be framework-agnostic if using vanilla JS, or single-file components if using Svelte
- Styles are scoped to the component (CSS custom properties + BEM naming or Shadow DOM)

---

## 4. Popup UI States

The popup has **5 states** (from PRD). Figma designs should cover all:

| State | Description | Key elements |
|-------|-------------|--------------|
| **Idle** | No policy detected | Explanation text, extension branding |
| **Detected** | Policy found, awaiting user action | "Analyze" button, estimated token cost |
| **Analyzing** | LLM processing | Loading spinner, progress indication |
| **Results** | Analysis complete | Letter grade (large), summary, red flags, expandable details |
| **Error** | API/network issue | Error message, action to resolve |

### Results state layout priority (from PRD)

1. **Letter grade** — largest, most prominent element (`--font-size-rating`)
2. **Summary** — 2-3 sentence plain language
3. **Red flags** — scannable list with severity colors
4. **Expandable sections** — Key Data Practices, Your Rights

---

## 5. Styling Approach

### Methodology
- **CSS custom properties** for all tokens (no preprocessor needed for extension scope)
- **BEM naming** for class names: `.rating-badge`, `.rating-badge__grade`, `.rating-badge--danger`
- **Scoped styles** — popup and options pages are isolated Chrome extension contexts; content scripts must use Shadow DOM if injecting UI into host pages

### Responsive considerations
- Popup has a **fixed width** (~400px, standard Chrome extension popup)
- **Not responsive** in the traditional sense — no breakpoints needed for MVP
- Popup max height: ~600px with internal scrolling for long results

### Global styles
- Minimal reset (box-sizing, margin/padding reset) in `global.css`
- Base typography applied to popup/options root elements
- No Tailwind or utility framework — keep the bundle small for extension constraints

---

## 6. Icon System

### Planned location
```
src/
  assets/
    icons/
      icon-16.png      ← extension icon (toolbar)
      icon-32.png
      icon-48.png
      icon-128.png     ← Chrome Web Store listing
    badge/
      alert.svg         ← high-confidence detection badge overlay
      subtle.svg        ← low-confidence detection indicator
```

### Usage
- Extension toolbar icons: referenced in `manifest.json`
- In-popup icons: inline SVG preferred for small icons (severity dots, expand arrows)
- No icon font library — keep dependencies minimal

---

## 7. Asset Management

- All assets bundled within the extension (no CDN, no external URLs)
- Images in `src/assets/`, copied to build output
- SVG preferred over raster for UI icons
- Extension icons must be provided at 16, 32, 48, and 128px sizes

---

## 8. Figma-to-Code Mapping Rules

When translating Figma designs to code for this project:

### Do
- Use CSS custom properties from `tokens.css` for all colors, spacing, and typography
- Match the 5 popup states exactly as designed
- Ensure the letter grade rating is the dominant visual element
- Use semantic HTML (`<main>`, `<section>`, `<details>`, `<ul>`)
- Keep the bundle size minimal — no heavy frameworks or libraries
- Test at the fixed popup dimensions (~400px wide)

### Don't
- Don't use absolute positioning from Figma layouts — convert to flexbox/grid
- Don't use Figma's exact pixel values — map to the nearest token
- Don't add external font imports — use `system-ui` stack
- Don't introduce Tailwind, styled-components, or CSS-in-JS
- Don't create responsive breakpoints — the popup is fixed-width
- Don't add animations unless explicitly in the design (keep it fast and light)

### Color mapping from Figma

| Figma intent | CSS token |
|--------------|-----------|
| Safe / good / grade A-B | `--color-safe` |
| Caution / moderate / grade C | `--color-caution` |
| Danger / bad / grade D-F | `--color-danger` |
| Primary action | `--color-primary` |
| Body text | `--color-text-primary` |
| Secondary text | `--color-text-secondary` |
| Backgrounds | `--color-bg` or `--color-bg-secondary` |
| Borders/dividers | `--color-border` |
