# Not Legal Advice — Project Context

## What is this project?
A Chrome browser extension that detects privacy policies/ToS on web pages and analyzes them using an LLM, giving users a simple privacy rating and red flag summary.

## Current Status
- **Phase:** Planning — PRD complete, no code yet
- **PRD location:** `/PRD.md`
- **Next step:** Tech stack decisions and project scaffolding

## Key Decisions Made
- **Browser:** Chrome only (Manifest V3) for MVP
- **Analysis:** Hybrid — heuristics for detection, LLM for deep analysis
- **Architecture:** No accounts, no backend — user provides their own API key, fully client-side
- **Audience:** Privacy-conscious consumers — simple, clear UI
- **LLM providers:** Claude API (primary), OpenAI (secondary option)

## Open Questions (from PRD)
1. Should the extension follow links to external policy pages or only analyze the current page?
2. Max policy length before truncation/chunking?
3. Show comparative scores against well-known services?
4. Non-English policy support?
