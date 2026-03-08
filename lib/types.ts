/** Letter grade A through F */
export type Grade = 'A' | 'B' | 'C' | 'D' | 'F'

/** Severity level for red flags */
export type Severity = 'low' | 'medium' | 'high'

/** A single red flag identified in the policy */
export interface RedFlag {
    summary: string
    severity: Severity
    quote: string
}

/** Data practices section of the analysis */
export interface DataPractices {
    collected: string[]
    usage: string[]
    sharedWith: string[]
    retention: string
}

/** User rights section of the analysis */
export interface UserRights {
    deletion: string
    optOut: string
    dataExport: string
}

/** Full analysis result returned by the LLM */
export interface AnalysisResult {
    grade: Grade
    summary: string
    redFlags: RedFlag[]
    dataPractices: DataPractices
    userRights: UserRights
    tokensUsed: number
}

/** Detection result from heuristic analysis */
export interface DetectionResult {
    detected: boolean
    confidence: number
    policyText?: string
    policyUrl?: string
    signals: string[]
}

/** Popup UI state */
export type PopupState =
    | { status: 'idle' }
    | { status: 'detected'; detection: DetectionResult }
    | { status: 'analyzing' }
    | { status: 'results'; analysis: AnalysisResult }
    | { status: 'error'; message: string }

/** User settings stored in chrome.storage.local */
export interface Settings {
    apiKey: string
    provider: 'claude' | 'openai'
    model: string
    autoAnalyze: boolean
    detectionSensitivity: 'low' | 'medium' | 'high'
}
