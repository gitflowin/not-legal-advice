import { detectPolicy } from '@/lib/detect'
import { getSettings } from '@/lib/storage'

export default defineContentScript({
    matches: ['<all_urls>'],
    runAt: 'document_idle',

    async main() {
        const settings = await getSettings()
        const result = detectPolicy(settings.detectionSensitivity)

        if (result.detected) {
            // Notify the background service worker about the detection
            await chrome.runtime.sendMessage({
                type: 'POLICY_DETECTED',
                detection: result,
            })
        }
    },
})
