import type { DetectionResult } from "./types";

/** URL path patterns that indicate policy pages */
const POLICY_URL_PATTERNS = [
  /\/privac/i,
  /\/terms/i,
  /\/tos\b/i,
  /\/legal/i,
  /\/policy/i,
  /\/data[_-]?policy/i,
  /\/cookie/i,
  /\/eula/i,
  /\/gdpr/i,
];

/** Heading text patterns that indicate policy content */
const POLICY_HEADING_PATTERNS = [
  /privacy\s+policy/i,
  /terms\s+of\s+(service|use)/i,
  /cookie\s+policy/i,
  /data\s+(processing|protection)/i,
  /end\s+user\s+licen/i,
  /acceptable\s+use/i,
];

/** Keywords in body text that suggest legal/policy content */
const POLICY_KEYWORDS = [
  "personal data",
  "personally identifiable",
  "data controller",
  "data processor",
  "third party",
  "cookies",
  "opt out",
  "opt-out",
  "right to delete",
  "data retention",
  "we collect",
  "we may collect",
  "information we collect",
  "sharing your information",
  "your consent",
  "applicable law",
  "governing law",
  "arbitration",
  "class action waiver",
];

/** Sensitivity thresholds: how many signals needed to trigger detection */
const THRESHOLDS = {
  low: 0.7,
  medium: 0.4,
  high: 0.2,
} as const;

/**
 * Run heuristic detection on the current page.
 * Returns a DetectionResult with confidence score and matched signals.
 */
export function detectPolicy(
  sensitivity: "low" | "medium" | "high" = "medium",
): DetectionResult {
  const signals: string[] = [];
  let score = 0;

  // Check URL patterns
  const url = window.location.pathname + window.location.search;
  for (const pattern of POLICY_URL_PATTERNS) {
    if (pattern.test(url)) {
      signals.push(`URL matches: ${pattern.source}`);
      score += 0.35;
      break;
    }
  }

  // Check page title
  const title = document.title;
  for (const pattern of POLICY_HEADING_PATTERNS) {
    if (pattern.test(title)) {
      signals.push(`Title matches: "${title}"`);
      score += 0.25;
      break;
    }
  }

  // Check headings (h1-h3)
  const headings = document.querySelectorAll("h1, h2, h3");
  for (const heading of headings) {
    const text = heading.textContent ?? "";
    for (const pattern of POLICY_HEADING_PATTERNS) {
      if (pattern.test(text)) {
        signals.push(`Heading matches: "${text.trim().slice(0, 60)}"`);
        score += 0.25;
        break;
      }
    }
    if (signals.length > 0 && score >= 0.5) break;
  }

  // Check body text for keyword density
  const bodyText = document.body?.innerText ?? "";
  let keywordHits = 0;
  for (const keyword of POLICY_KEYWORDS) {
    if (bodyText.toLowerCase().includes(keyword)) {
      keywordHits++;
    }
  }
  if (keywordHits >= 5) {
    signals.push(`${keywordHits} policy keywords found in body text`);
    score += 0.3;
  } else if (keywordHits >= 3) {
    signals.push(`${keywordHits} policy keywords found in body text`);
    score += 0.15;
  }

  // Check for links to policy pages (signup form context)
  const policyLinks = findPolicyLinks();
  if (policyLinks.length > 0) {
    signals.push(
      `Found ${policyLinks.length} policy link(s): ${policyLinks[0]}`,
    );
    score += 0.15;
  }

  const confidence = Math.min(score, 1);
  const threshold = THRESHOLDS[sensitivity];

  return {
    detected: confidence >= threshold,
    confidence,
    policyText:
      confidence >= threshold ? extractPolicyText(bodyText) : undefined,
    policyUrl: policyLinks[0],
    signals,
  };
}

/** Find links that point to policy pages */
function findPolicyLinks(): string[] {
  const links = document.querySelectorAll("a[href]");
  const policyUrls: string[] = [];

  for (const link of links) {
    const href = (link as HTMLAnchorElement).href;
    for (const pattern of POLICY_URL_PATTERNS) {
      if (pattern.test(href)) {
        policyUrls.push(href);
        break;
      }
    }
  }

  return [...new Set(policyUrls)];
}

/** Extract the main policy text from the page, stripping nav/footer noise */
function extractPolicyText(fullText: string): string {
  // For MVP, return the full body text trimmed.
  // Future: use readability-like extraction to isolate main content.
  return fullText.trim().slice(0, 200_000);
}
