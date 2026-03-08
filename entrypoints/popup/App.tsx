import { useEffect, useState } from 'preact/hooks'
import type { PopupState, DetectionResult, Settings } from '@/lib/types'
import { analyzePolicy } from '@/lib/analyze'
import {
    cacheAnalysis,
    getCachedAnalysis,
    getSettings,
    saveSettings,
} from '@/lib/storage'
import styles from './App.module.css'

export function App() {
    const [state, setState] = useState<PopupState>({ status: 'idle' })
    const [showSettings, setShowSettings] = useState(false)
    const [settings, setSettings] = useState<Settings | null>(null)

    useEffect(() => {
        getSettings().then(setSettings)
        loadDetection()
    }, [])

    async function loadDetection() {
        try {
            const [tab] = await chrome.tabs.query({
                active: true,
                currentWindow: true,
            })

            if (!tab?.id || !tab.url) return

            // Check cache first
            const cached = await getCachedAnalysis(tab.url)
            if (cached) {
                setState({ status: 'results', analysis: cached })
                return
            }

            // Ask background for detection result
            const response = await chrome.runtime.sendMessage({
                type: 'GET_DETECTION',
                tabId: tab.id,
            })

            if (response?.detected) {
                setState({
                    status: 'detected',
                    detection: response as DetectionResult,
                })
            }
        } catch {
            // Content script not injected or no detection — stay idle
        }
    }

    async function handleAnalyze() {
        if (state.status !== 'detected') return

        const policyText = state.detection.policyText
        if (!policyText) {
            setState({
                status: 'error',
                message: 'No policy text found on this page.',
            })
            return
        }

        setState({ status: 'analyzing' })

        try {
            const result = await analyzePolicy(policyText)

            const [tab] = await chrome.tabs.query({
                active: true,
                currentWindow: true,
            })
            if (tab?.url) {
                await cacheAnalysis(tab.url, result)
            }

            setState({ status: 'results', analysis: result })
        } catch (err) {
            setState({
                status: 'error',
                message: err instanceof Error ? err.message : 'Analysis failed',
            })
        }
    }

    const hasApiKey = Boolean(settings?.apiKey)

    return (
        <div class={styles.container}>
            <header class={styles.header}>
                <h1 class={styles.title}>Not Legal Advice</h1>
                <button
                    class={styles.settingsToggle}
                    onClick={() => setShowSettings(!showSettings)}
                    title="Settings"
                >
                    {showSettings ? 'Close' : 'Settings'}
                </button>
            </header>

            <main class={styles.main}>
                {showSettings && settings ? (
                    <SettingsView
                        settings={settings}
                        onUpdate={async (partial) => {
                            const updated = { ...settings, ...partial }
                            setSettings(updated)
                            await saveSettings(updated)
                        }}
                    />
                ) : !hasApiKey ? (
                    <SetupView onOpenSettings={() => setShowSettings(true)} />
                ) : (
                    <>
                        {state.status === 'idle' && <IdleView />}
                        {state.status === 'detected' && (
                            <DetectedView
                                detection={state.detection}
                                onAnalyze={handleAnalyze}
                            />
                        )}
                        {state.status === 'analyzing' && <AnalyzingView />}
                        {state.status === 'results' && (
                            <ResultsView analysis={state.analysis} />
                        )}
                        {state.status === 'error' && (
                            <ErrorView
                                message={state.message}
                                onOpenSettings={() => setShowSettings(true)}
                            />
                        )}
                    </>
                )}
            </main>
        </div>
    )
}

function IdleView() {
    return (
        <div class={styles.stateView}>
            <p class={styles.idleText}>
                No privacy policy or terms of service detected on this page.
            </p>
            <p class={styles.idleHint}>
                Visit a page with a privacy policy and this extension will alert
                you.
            </p>
        </div>
    )
}

function DetectedView({
    detection,
    onAnalyze,
}: {
    detection: DetectionResult
    onAnalyze: () => void
}) {
    const charCount = detection.policyText?.length ?? 0
    const estimatedTokens = Math.ceil(charCount / 4)

    return (
        <div class={styles.stateView}>
            <p class={styles.detectedText}>
                Policy content detected on this page.
            </p>
            <p class={styles.meta}>
                ~{estimatedTokens.toLocaleString()} tokens &middot; Confidence:{' '}
                {Math.round(detection.confidence * 100)}%
            </p>
            <button class={styles.analyzeButton} onClick={onAnalyze}>
                Analyze Policy
            </button>
        </div>
    )
}

function AnalyzingView() {
    return (
        <div class={styles.stateView}>
            <div class={styles.spinner} />
            <p>Analyzing policy...</p>
        </div>
    )
}

function ResultsView({
    analysis,
}: {
    analysis: import('@/lib/types').AnalysisResult
}) {
    const gradeColor =
        analysis.grade <= 'B'
            ? 'var(--color-safe)'
            : analysis.grade === 'C'
              ? 'var(--color-caution)'
              : 'var(--color-danger)'

    return (
        <div class={styles.results}>
            <div
                class={styles.gradeSection}
                style={{ borderColor: gradeColor }}
            >
                <span class={styles.grade} style={{ color: gradeColor }}>
                    {analysis.grade}
                </span>
            </div>

            <p class={styles.summary}>{analysis.summary}</p>

            {analysis.redFlags.length > 0 && (
                <section>
                    <h2 class={styles.sectionTitle}>Red Flags</h2>
                    <ul class={styles.redFlagList}>
                        {analysis.redFlags.map((flag, i) => (
                            <li key={i} class={styles.redFlag}>
                                <span
                                    class={styles.severityDot}
                                    style={{
                                        background: `var(--color-severity-${flag.severity})`,
                                    }}
                                />
                                <div>
                                    <p class={styles.flagSummary}>
                                        {flag.summary}
                                    </p>
                                    <blockquote class={styles.flagQuote}>
                                        {flag.quote}
                                    </blockquote>
                                </div>
                            </li>
                        ))}
                    </ul>
                </section>
            )}

            <details class={styles.expandable}>
                <summary>Key Data Practices</summary>
                <dl class={styles.detailList}>
                    <dt>Collected</dt>
                    <dd>
                        {analysis.dataPractices.collected.join(', ') ||
                            'Not specified'}
                    </dd>
                    <dt>Usage</dt>
                    <dd>
                        {analysis.dataPractices.usage.join(', ') ||
                            'Not specified'}
                    </dd>
                    <dt>Shared With</dt>
                    <dd>
                        {analysis.dataPractices.sharedWith.join(', ') ||
                            'Not specified'}
                    </dd>
                    <dt>Retention</dt>
                    <dd>{analysis.dataPractices.retention}</dd>
                </dl>
            </details>

            <details class={styles.expandable}>
                <summary>Your Rights</summary>
                <dl class={styles.detailList}>
                    <dt>Deletion</dt>
                    <dd>{analysis.userRights.deletion}</dd>
                    <dt>Opt-out</dt>
                    <dd>{analysis.userRights.optOut}</dd>
                    <dt>Data Export</dt>
                    <dd>{analysis.userRights.dataExport}</dd>
                </dl>
            </details>

            <p class={styles.meta}>
                Tokens used: {analysis.tokensUsed.toLocaleString()}
            </p>
        </div>
    )
}

function ErrorView({
    message,
    onOpenSettings,
}: {
    message: string
    onOpenSettings: () => void
}) {
    return (
        <div class={styles.stateView}>
            <p class={styles.errorText}>{message}</p>
            <button class={styles.analyzeButton} onClick={onOpenSettings}>
                Open Settings
            </button>
        </div>
    )
}

function SetupView({ onOpenSettings }: { onOpenSettings: () => void }) {
    return (
        <div class={styles.stateView}>
            <p class={styles.idleText}>Add your API key to get started</p>
            <p class={styles.idleHint}>
                This extension uses Claude or OpenAI to analyze privacy
                policies. Your key is stored locally and never shared.
            </p>
            <button class={styles.analyzeButton} onClick={onOpenSettings}>
                Add API Key
            </button>
        </div>
    )
}

const CLAUDE_MODELS = [
    { id: 'claude-sonnet-4-20250514', label: 'Claude Sonnet 4' },
    { id: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5 (cheaper)' },
]
const OPENAI_MODELS = [
    { id: 'gpt-4o', label: 'GPT-4o' },
    { id: 'gpt-4o-mini', label: 'GPT-4o Mini (cheaper)' },
]

function SettingsView({
    settings,
    onUpdate,
}: {
    settings: Settings
    onUpdate: (partial: Partial<Settings>) => void
}) {
    const models =
        settings.provider === 'claude' ? CLAUDE_MODELS : OPENAI_MODELS

    return (
        <div class={styles.settingsView}>
            <div class={styles.field}>
                <label class={styles.fieldLabel}>Provider</label>
                <select
                    class={styles.fieldSelect}
                    value={settings.provider}
                    onChange={(e) => {
                        const provider = (e.target as HTMLSelectElement)
                            .value as Settings['provider']
                        const model =
                            provider === 'claude'
                                ? CLAUDE_MODELS[0].id
                                : OPENAI_MODELS[0].id
                        onUpdate({ provider, model })
                    }}
                >
                    <option value="claude">Anthropic Claude</option>
                    <option value="openai">OpenAI</option>
                </select>
            </div>

            <div class={styles.field}>
                <label class={styles.fieldLabel}>API Key</label>
                <input
                    class={styles.fieldInput}
                    type="password"
                    placeholder={
                        settings.provider === 'claude' ? 'sk-ant-...' : 'sk-...'
                    }
                    value={settings.apiKey}
                    onInput={(e) =>
                        onUpdate({
                            apiKey: (e.target as HTMLInputElement).value,
                        })
                    }
                />
                <p class={styles.fieldHint}>
                    Stored locally. Only sent to the{' '}
                    {settings.provider === 'claude' ? 'Anthropic' : 'OpenAI'}{' '}
                    API.
                </p>
            </div>

            <div class={styles.field}>
                <label class={styles.fieldLabel}>Model</label>
                <select
                    class={styles.fieldSelect}
                    value={settings.model}
                    onChange={(e) =>
                        onUpdate({
                            model: (e.target as HTMLSelectElement).value,
                        })
                    }
                >
                    {models.map((m) => (
                        <option key={m.id} value={m.id}>
                            {m.label}
                        </option>
                    ))}
                </select>
            </div>
        </div>
    )
}
