# Not Legal Advice — Product Requirements Document

## Overview

**Not Legal Advice** is a Chrome browser extension that automatically detects when a user is on a page containing a company's privacy policy, terms of service, or data consent form (e.g., signup pages) and provides a clear, at-a-glance assessment of how invasive the company's practices are toward personal data.

The extension uses a hybrid analysis approach — lightweight heuristics to detect policy content on the page, and an LLM to perform deep, nuanced analysis of the actual policy text. No accounts or backend servers are required; the user provides their own API key and all processing happens client-side or direct-to-API.

---

## Problem Statement

Users routinely agree to privacy policies and terms of service without reading them. These documents are intentionally long, dense, and written in legal language designed to obscure concerning practices. There is no practical way for an average user to understand what they are agreeing to before clicking "I Agree."

**Core insight:** Users don't need to read the full policy — they need to know the three to five things that actually matter before they hand over their data.

---

## Target Audience

Privacy-conscious consumers who want simple, actionable information about a company's data practices without needing legal or technical expertise. These users:

- Are wary of handing over personal data but don't have time to read policies
- Want a quick "is this safe?" signal before signing up for a service
- Value transparency and want to make informed decisions
- Are comfortable installing a browser extension but not necessarily technical

---

## Goals

### MVP Goals
1. Automatically detect pages that contain privacy policies, terms of service, or data consent forms
2. Analyze the detected policy using an LLM and produce a clear, simple privacy rating
3. Surface the top red flags and notable clauses in plain language
4. Present results in a non-intrusive, glanceable popup UI
5. Work entirely client-side with no account or backend required

### Non-Goals (MVP)
- Cross-browser support (Firefox, Safari, Edge)
- Community-shared ratings or crowdsourced data
- Historical tracking of policy changes over time
- Blocking or preventing form submission
- Mobile browser support

---

## Features

### F1: Policy Detection (Heuristics)

The extension runs lightweight, client-side heuristics on every page to determine whether it contains policy-relevant content.

**Detection signals:**
- URL pattern matching (e.g., `/privacy`, `/terms`, `/tos`, `/legal`, `/policy`, `/data-policy`)
- Page title and heading analysis (e.g., "Privacy Policy", "Terms of Service", "Cookie Policy")
- Signup/registration form detection — forms requesting personal data (email, name, phone, address) paired with consent checkboxes or links to policies
- Presence of legal boilerplate keywords in page body text
- Links to policy pages within form contexts

**Behavior:**
- Runs on every page load with minimal performance impact
- When policy content is detected, the extension icon updates to indicate a policy is present (e.g., badge indicator)
- Does NOT automatically call the LLM — waits for user interaction to keep costs at zero for detection
- Detection confidence score determines badge state: high confidence shows an alert badge, low confidence shows a subtle indicator

### F2: Policy Analysis (LLM)

When the user clicks the extension icon on a detected page, the extension extracts the policy text and sends it to an LLM for analysis.

**Analysis output:**
- **Privacy Rating:** A simple letter grade (A through F) representing overall invasiveness
- **Summary:** 2-3 sentence plain-language summary of the policy
- **Red Flags:** Bulleted list of the most concerning clauses, each with:
  - A plain-language explanation of what it means
  - A severity indicator (high / medium / low)
  - The original quoted text from the policy
- **Key Data Practices:** What data is collected, how it's used, who it's shared with, and how long it's retained
- **Your Rights:** What control the user has (deletion, opt-out, data export)

**Analysis categories scored:**
1. Data collection scope (what and how much)
2. Third-party data sharing and selling
3. Data retention duration
4. User control and deletion rights
5. Tracking and profiling practices
6. Legal jurisdiction and arbitration clauses

### F3: Extension Popup UI

The primary interface is a popup triggered by clicking the extension icon.

**States:**
1. **Idle** — No policy detected on current page. Shows brief explanation of what the extension does.
2. **Detected** — Policy content found. Shows a prompt to analyze with estimated token cost.
3. **Analyzing** — Loading state while LLM processes the policy.
4. **Results** — Displays the privacy rating, summary, red flags, and details.
5. **Error** — API key missing, invalid, rate limited, or network error. Clear messaging with action to resolve.

**UI principles:**
- The rating (letter grade) should be the largest, most prominent element
- Red flags should be scannable — users should get the gist in under 10 seconds
- Use color coding: green (safe), yellow (caution), red (danger) for severity
- Expandable sections for users who want more detail
- Minimal chrome, clean typography, no clutter

### F4: Settings Page

Accessible via the popup or extension options page.

**Settings:**
- API key input (stored locally in `chrome.storage.local`, never transmitted except to the LLM API)
- LLM provider selection (Claude as default, with option for OpenAI)
- Model selection (allow user to choose cheaper/faster models)
- Auto-analyze toggle (optionally skip the manual click and analyze automatically on detection — off by default to manage costs)
- Detection sensitivity (low / medium / high) — controls how aggressively the heuristic triggers

### F5: Cost Transparency

Since users pay for their own API usage, the extension should be transparent about costs.

- Show estimated token count before analysis
- Show actual tokens used and approximate cost after analysis
- Running total of tokens used in the current session (optional, in settings)

---

## Technical Architecture

### Platform
- Chrome Extension (Manifest V3)
- Content scripts for page analysis and text extraction
- Service worker for background orchestration
- Popup UI built with vanilla JS/HTML/CSS or lightweight framework (Preact or Svelte)

### Detection Pipeline
```
Page Load
  → Content script injects
  → Run heuristic checks (URL, headings, forms, keywords)
  → Compute detection confidence score
  → If score > threshold → update extension badge
  → Store detected policy text in memory (not persisted)
```

### Analysis Pipeline
```
User clicks extension icon
  → Popup opens, shows detected policy info
  → User clicks "Analyze"
  → Content script extracts full policy text
  → Text is chunked if necessary (for token limits)
  → API call to LLM with structured prompt
  → Parse structured response (JSON)
  → Render results in popup
  → Cache results for this URL in session storage
```

### Data Flow
- All policy text stays local or goes directly to the user's chosen LLM API
- No intermediary servers, no telemetry, no data collection by the extension itself
- API keys stored in `chrome.storage.local` (encrypted at rest by Chrome)
- Analysis results cached per-URL in `chrome.storage.session` to avoid redundant API calls

### LLM Integration
- Primary: Anthropic Claude API (Messages API)
- Secondary: OpenAI Chat Completions API
- Structured output via system prompt requesting JSON response
- Prompt engineered to return consistent rating schema

---

## Privacy & Security Considerations

Given the irony of a privacy tool that could itself be invasive, this section is critical.

1. **Zero data collection** — The extension collects no user data, sends no telemetry, and has no analytics
2. **API key security** — Keys stored only in `chrome.storage.local`, never logged or exposed
3. **Minimal permissions** — Request only the Chrome permissions strictly necessary (activeTab, storage)
4. **No persistent storage of policy text** — Policy text is held in memory only during analysis, then discarded
5. **Transparent network requests** — The only outbound requests are to the user-configured LLM API
6. **Open source** — The extension code should be fully open source so users can audit it

---

## Success Metrics (Post-MVP)

- Detection accuracy: >90% true positive rate on pages containing privacy policies
- Detection false positive rate: <5% on general web pages
- User comprehension: Users can identify the top risk in a policy within 10 seconds of viewing results
- Analysis accuracy: LLM ratings align with expert legal review in >80% of cases (tested against a benchmark set)

---

## Future Considerations (Post-MVP)

- **Firefox and Safari support** via WebExtensions API
- **Community ratings cache** — Shared, anonymized analysis results so common policies (Google, Meta, etc.) don't require individual API calls
- **Policy change detection** — Alert users when a previously analyzed policy has changed
- **Comparison mode** — Compare two services' policies side by side
- **Export/share** — Let users export or share a policy summary
- **Pre-built policy database** — Ship with cached analyses of the top 100 most common services to provide value with zero API cost

---

## Open Questions

1. Should the extension attempt to follow links to external policy pages (e.g., a signup form links to `/privacy-policy`), or only analyze what's on the current page?
2. What is the maximum policy length we should support before truncation or chunking?
3. Should we show a "privacy score" comparison to well-known services (e.g., "This policy is more invasive than Gmail but less than TikTok")?
4. How should we handle policies in languages other than English?
