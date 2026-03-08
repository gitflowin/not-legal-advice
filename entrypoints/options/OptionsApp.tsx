import { useEffect, useState } from "preact/hooks";
import type { Settings } from "@/lib/types";
import { getSettings, saveSettings } from "@/lib/storage";
import styles from "./OptionsApp.module.css";

const CLAUDE_MODELS = [
  { id: "claude-sonnet-4-20250514", label: "Claude Sonnet 4 (recommended)" },
  { id: "claude-haiku-4-5-20251001", label: "Claude Haiku 4.5 (faster, cheaper)" },
];

const OPENAI_MODELS = [
  { id: "gpt-4o", label: "GPT-4o (recommended)" },
  { id: "gpt-4o-mini", label: "GPT-4o Mini (faster, cheaper)" },
];

export function OptionsApp() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getSettings().then(setSettings);
  }, []);

  if (!settings) return null;

  const models = settings.provider === "claude" ? CLAUDE_MODELS : OPENAI_MODELS;

  async function handleSave() {
    if (!settings) return;
    await saveSettings(settings);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function update(partial: Partial<Settings>) {
    setSettings((prev) => (prev ? { ...prev, ...partial } : prev));
  }

  return (
    <div class={styles.container}>
      <h1 class={styles.title}>Settings</h1>

      <div class={styles.field}>
        <label class={styles.label}>LLM Provider</label>
        <select
          class={styles.select}
          value={settings.provider}
          onChange={(e) => {
            const provider = (e.target as HTMLSelectElement).value as Settings["provider"];
            const defaultModel = provider === "claude" ? CLAUDE_MODELS[0].id : OPENAI_MODELS[0].id;
            update({ provider, model: defaultModel });
          }}
        >
          <option value="claude">Anthropic Claude</option>
          <option value="openai">OpenAI</option>
        </select>
      </div>

      <div class={styles.field}>
        <label class={styles.label}>API Key</label>
        <input
          class={styles.input}
          type="password"
          placeholder={settings.provider === "claude" ? "sk-ant-..." : "sk-..."}
          value={settings.apiKey}
          onInput={(e) => update({ apiKey: (e.target as HTMLInputElement).value })}
        />
        <p class={styles.hint}>
          Stored locally. Never sent anywhere except the {settings.provider === "claude" ? "Anthropic" : "OpenAI"} API.
        </p>
      </div>

      <div class={styles.field}>
        <label class={styles.label}>Model</label>
        <select
          class={styles.select}
          value={settings.model}
          onChange={(e) => update({ model: (e.target as HTMLSelectElement).value })}
        >
          {models.map((m) => (
            <option key={m.id} value={m.id}>{m.label}</option>
          ))}
        </select>
      </div>

      <div class={styles.field}>
        <label class={styles.label}>Detection Sensitivity</label>
        <select
          class={styles.select}
          value={settings.detectionSensitivity}
          onChange={(e) =>
            update({
              detectionSensitivity: (e.target as HTMLSelectElement).value as Settings["detectionSensitivity"],
            })
          }
        >
          <option value="low">Low — only obvious policy pages</option>
          <option value="medium">Medium (recommended)</option>
          <option value="high">High — aggressive detection</option>
        </select>
      </div>

      <div class={styles.field}>
        <label class={styles.checkboxLabel}>
          <input
            type="checkbox"
            checked={settings.autoAnalyze}
            onChange={(e) => update({ autoAnalyze: (e.target as HTMLInputElement).checked })}
          />
          Auto-analyze on detection (uses API credits automatically)
        </label>
      </div>

      <button class={styles.saveButton} onClick={handleSave}>
        {saved ? "Saved!" : "Save Settings"}
      </button>
    </div>
  );
}
