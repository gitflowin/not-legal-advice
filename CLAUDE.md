# Not Legal Advice — Project Context

## What is this project?
A Chrome browser extension that detects privacy policies/ToS on web pages and analyzes them using an LLM, giving users a simple privacy rating and red flag summary.

## Current Status
- **Phase:** Scaffolded — core architecture in place, ready for feature development
- **PRD location:** `/PRD.md`
- **Design system rules:** `/FIGMA_DESIGN_RULES.md`

## Tech Stack
- **Framework:** Preact + TypeScript
- **Build:** WXT (Chrome Extension framework, Manifest V3)
- **Styling:** CSS Modules + CSS custom properties (tokens in `styles/tokens.css`)
- **Testing:** Vitest
- **LLM:** Anthropic Claude API (primary), OpenAI (secondary)

## Project Structure
```
entrypoints/
  popup/          — Main popup UI (Preact)
  options/        — Settings page (Preact)
  content.ts      — Content script (policy detection)
  background.ts   — Service worker (badge updates, tab state)
lib/
  types.ts        — Shared TypeScript types
  detect.ts       — Heuristic policy detection
  analyze.ts      — LLM analysis (Claude + OpenAI)
  storage.ts      — chrome.storage helpers
styles/
  tokens.css      — Design tokens (colors, spacing, typography)
  global.css      — Base styles
```

## Key Commands
- `npm run dev` — Start dev mode with HMR
- `npm run build` — Production build to `.output/chrome-mv3/`
- `npm run test` — Run tests with Vitest

## Key Decisions Made
- **Browser:** Chrome only (Manifest V3) for MVP
- **Analysis:** Hybrid — heuristics for detection, LLM for deep analysis
- **Architecture:** No accounts, no backend — user provides their own API key, fully client-side
- **Audience:** Privacy-conscious consumers — simple, clear UI
- **LLM providers:** Claude API (primary), OpenAI (secondary option)
- **UI:** Preact for reactivity at ~3KB, CSS Modules for style scoping
- **Build:** WXT handles manifest generation, content script injection, HMR
