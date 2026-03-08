import type { AnalysisResult, Grade, RedFlag } from './types'
import { getSettings } from './storage'

const SYSTEM_PROMPT = `You are a privacy policy analyst. Analyze the provided privacy policy or terms of service text and return a structured JSON assessment.

Return ONLY valid JSON with this exact schema:
{
  "grade": "A" | "B" | "C" | "D" | "F",
  "summary": "2-3 sentence plain-language summary",
  "redFlags": [
    {
      "summary": "Plain-language explanation of the concern",
      "severity": "low" | "medium" | "high",
      "quote": "Exact quote from the policy text"
    }
  ],
  "dataPractices": {
    "collected": ["list of data types collected"],
    "usage": ["how data is used"],
    "sharedWith": ["who data is shared with"],
    "retention": "how long data is kept"
  },
  "userRights": {
    "deletion": "what deletion rights exist",
    "optOut": "what opt-out options exist",
    "dataExport": "what data export options exist"
  }
}

Scoring guide:
- A: Minimal data collection, strong user rights, no third-party sharing
- B: Reasonable data collection, good user rights, limited sharing
- C: Moderate data collection, some user rights, notable sharing
- D: Extensive data collection, weak user rights, broad sharing
- F: Excessive/invasive collection, no meaningful rights, sells data or has severe clauses

Focus on what matters most to an average user. Be specific in red flags — quote the actual text.`

/** Analyze policy text using the configured LLM provider */
export async function analyzePolicy(
    policyText: string,
): Promise<AnalysisResult> {
    const settings = await getSettings()

    if (!settings.apiKey) {
        throw new Error(
            'API key not configured. Go to Settings to add your key.',
        )
    }

    if (settings.provider === 'claude') {
        return analyzeClaude(policyText, settings.apiKey, settings.model)
    }
    return analyzeOpenAI(policyText, settings.apiKey, settings.model)
}

async function analyzeClaude(
    policyText: string,
    apiKey: string,
    model: string,
): Promise<AnalysisResult> {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
            'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
            model,
            max_tokens: 4096,
            system: SYSTEM_PROMPT,
            messages: [
                {
                    role: 'user',
                    content: `Analyze this privacy policy / terms of service:\n\n${policyText}`,
                },
            ],
        }),
    })

    if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(
            (error as { error?: { message?: string } }).error?.message ??
                `Claude API error: ${response.status}`,
        )
    }

    const data = (await response.json()) as {
        content: Array<{ type: string; text: string }>
        usage: { input_tokens: number; output_tokens: number }
    }
    const text = data.content[0].text
    const parsed = parseAnalysisJSON(text)

    return {
        ...parsed,
        tokensUsed: data.usage.input_tokens + data.usage.output_tokens,
    }
}

async function analyzeOpenAI(
    policyText: string,
    apiKey: string,
    model: string,
): Promise<AnalysisResult> {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            model,
            response_format: { type: 'json_object' },
            messages: [
                { role: 'system', content: SYSTEM_PROMPT },
                {
                    role: 'user',
                    content: `Analyze this privacy policy / terms of service:\n\n${policyText}`,
                },
            ],
        }),
    })

    if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(
            (error as { error?: { message?: string } }).error?.message ??
                `OpenAI API error: ${response.status}`,
        )
    }

    const data = (await response.json()) as {
        choices: Array<{ message: { content: string } }>
        usage: { total_tokens: number }
    }
    const text = data.choices[0].message.content
    const parsed = parseAnalysisJSON(text)

    return {
        ...parsed,
        tokensUsed: data.usage.total_tokens,
    }
}

/** Parse and validate the LLM's JSON response */
function parseAnalysisJSON(text: string): Omit<AnalysisResult, 'tokensUsed'> {
    // Strip markdown code fences if present
    const cleaned = text
        .replace(/^```json?\s*\n?/m, '')
        .replace(/\n?```\s*$/m, '')
    const json = JSON.parse(cleaned)

    const validGrades: Grade[] = ['A', 'B', 'C', 'D', 'F']
    if (!validGrades.includes(json.grade)) {
        throw new Error(`Invalid grade: ${json.grade}`)
    }

    return {
        grade: json.grade,
        summary: String(json.summary ?? ''),
        redFlags: (json.redFlags ?? []).map(
            (f: Record<string, unknown>): RedFlag => ({
                summary: String(f.summary ?? ''),
                severity: ['low', 'medium', 'high'].includes(
                    f.severity as string,
                )
                    ? (f.severity as RedFlag['severity'])
                    : 'medium',
                quote: String(f.quote ?? ''),
            }),
        ),
        dataPractices: {
            collected: asStringArray(json.dataPractices?.collected),
            usage: asStringArray(json.dataPractices?.usage),
            sharedWith: asStringArray(json.dataPractices?.sharedWith),
            retention: String(json.dataPractices?.retention ?? 'Not specified'),
        },
        userRights: {
            deletion: String(json.userRights?.deletion ?? 'Not specified'),
            optOut: String(json.userRights?.optOut ?? 'Not specified'),
            dataExport: String(json.userRights?.dataExport ?? 'Not specified'),
        },
    }
}

function asStringArray(val: unknown): string[] {
    if (Array.isArray(val)) return val.map(String)
    return []
}
