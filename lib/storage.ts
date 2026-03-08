import type { Settings, AnalysisResult } from './types'

const DEFAULT_SETTINGS: Settings = {
    apiKey: '',
    provider: 'claude',
    model: 'claude-sonnet-4-20250514',
    autoAnalyze: false,
    detectionSensitivity: 'medium',
}

/** Load user settings from chrome.storage.local */
export async function getSettings(): Promise<Settings> {
    const stored = await chrome.storage.local.get('settings')
    return { ...DEFAULT_SETTINGS, ...stored.settings }
}

/** Save user settings to chrome.storage.local */
export async function saveSettings(settings: Partial<Settings>): Promise<void> {
    const current = await getSettings()
    await chrome.storage.local.set({ settings: { ...current, ...settings } })
}

/** Cache an analysis result for a URL in session storage */
export async function cacheAnalysis(
    url: string,
    result: AnalysisResult,
): Promise<void> {
    await chrome.storage.session.set({ [`analysis:${url}`]: result })
}

/** Retrieve a cached analysis result for a URL */
export async function getCachedAnalysis(
    url: string,
): Promise<AnalysisResult | null> {
    const stored = await chrome.storage.session.get(`analysis:${url}`)
    return stored[`analysis:${url}`] ?? null
}
