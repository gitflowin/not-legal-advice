import type { DetectionResult } from "@/lib/types";

/** Per-tab detection state, kept in memory only */
const tabDetections = new Map<number, DetectionResult>();

export default defineBackground(() => {
  // Listen for detection results from content scripts
  chrome.runtime.onMessage.addListener((message, sender) => {
    if (message.type === "POLICY_DETECTED" && sender.tab?.id != null) {
      const detection = message.detection as DetectionResult;
      tabDetections.set(sender.tab.id, detection);

      // Update badge to indicate policy detected
      const badgeText = detection.confidence >= 0.7 ? "!" : "?";
      const badgeColor = detection.confidence >= 0.7 ? "#ef4444" : "#eab308";

      chrome.action.setBadgeText({ text: badgeText, tabId: sender.tab.id });
      chrome.action.setBadgeBackgroundColor({
        color: badgeColor,
        tabId: sender.tab.id,
      });
    }

    if (message.type === "GET_DETECTION" && sender.tab?.id != null) {
      return tabDetections.get(sender.tab.id) ?? null;
    }
  });

  // Clean up when tabs close
  chrome.tabs.onRemoved.addListener((tabId) => {
    tabDetections.delete(tabId);
  });
});
