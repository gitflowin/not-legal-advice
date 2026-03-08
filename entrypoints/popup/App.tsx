import { useEffect, useState } from 'preact/hooks'
import type { PopupState, DetectionResult } from '@/lib/types'
import { analyzePolicy } from '@/lib/analyze'
import { cacheAnalysis, getCachedAnalysis } from '@/lib/storage'
import styles from './App.module.css'

export function App() {
    const [state, setState] = useState<PopupState>({ status: 'idle' })

    useEffect(() => {
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

    return (
        <div class={styles.container}>
            <header class={styles.header}>
                <h1 class={styles.title}>Not Legal Advice</h1>
            </header>

            <main class={styles.main}>
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
                    <ErrorView message={state.message} />
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

function ErrorView({ message }: { message: string }) {
    return (
        <div class={styles.stateView}>
            <p class={styles.errorText}>{message}</p>
            <button
                class={styles.analyzeButton}
                onClick={() => chrome.runtime.openOptionsPage()}
            >
                Open Settings
            </button>
        </div>
    )
}
