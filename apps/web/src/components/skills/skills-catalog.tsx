"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type InputProp = {
  type: string;
  description?: string;
};

type InputSchema = {
  type: "object";
  properties?: Record<string, InputProp>;
  required?: string[];
};

type SkillInfo = {
  name: string;
  description: string;
  inputSchema: InputSchema;
};

type SettingsState = {
  serperApiKeyConfigured: boolean;
  resendApiKeyConfigured: boolean;
  apifyTokenConfigured: boolean;
};

/** Map skill name → which API key it needs (for status display) */
const SKILL_API_KEY_NEEDS: Record<string, { label: string; settingsKey: keyof SettingsState }> = {
  web_search: { label: "SERPER_API_KEY", settingsKey: "serperApiKeyConfigured" },
  send_email: { label: "RESEND_API_KEY", settingsKey: "resendApiKeyConfigured" },
  run_apify: { label: "APIFY_TOKEN", settingsKey: "apifyTokenConfigured" },
};

function SkillCard({ skill, settings }: { skill: SkillInfo; settings: SettingsState | null }) {
  const apiKeyNeeds = SKILL_API_KEY_NEEDS[skill.name];
  const apiKeyConfigured = apiKeyNeeds !== undefined && settings !== null
    ? settings[apiKeyNeeds.settingsKey]
    : null;

  const props = Object.entries(skill.inputSchema.properties ?? {});
  const required = new Set(skill.inputSchema.required ?? []);

  return (
    <div className="surface-card p-5 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="font-semibold font-mono text-sm">{skill.name}</h2>
          <p className="text-sm text-muted-foreground mt-0.5">{skill.description}</p>
        </div>
        {apiKeyNeeds !== undefined && (
          <div className="shrink-0">
            {apiKeyConfigured === true ? (
              <span className="inline-flex items-center gap-1 text-xs text-green-700 bg-green-50 border border-green-200 rounded-full px-2 py-0.5">
                <span>✓</span> {apiKeyNeeds.label}
              </span>
            ) : apiKeyConfigured === false ? (
              <Link
                href="/admin/settings"
                className="inline-flex items-center gap-1 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5 hover:bg-amber-100 transition-colors"
              >
                <span>⚠</span> {apiKeyNeeds.label} — configure
              </Link>
            ) : (
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-muted/50 border rounded-full px-2 py-0.5">
                {apiKeyNeeds.label}
              </span>
            )}
          </div>
        )}
      </div>

      {props.length > 0 && (
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="text-left text-muted-foreground border-b">
              <th className="pb-1 pr-3 font-medium">Parameter</th>
              <th className="pb-1 pr-3 font-medium">Type</th>
              <th className="pb-1 font-medium">Description</th>
            </tr>
          </thead>
          <tbody>
            {props.map(([name, prop]) => (
              <tr key={name} className="border-b border-border/40">
                <td className="py-1 pr-3 font-mono">
                  {name}
                  {required.has(name) && (
                    <span className="ml-1 text-red-500">*</span>
                  )}
                </td>
                <td className="py-1 pr-3 text-muted-foreground">{prop.type}</td>
                <td className="py-1 text-muted-foreground">{prop.description ?? ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {!apiKeyNeeds && (
        <p className="text-xs text-muted-foreground">No API key required.</p>
      )}
    </div>
  );
}

export function SkillsCatalog() {
  const [skills, setSkills] = useState<SkillInfo[]>([]);
  const [settings, setSettings] = useState<SettingsState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [skillsRes, settingsRes] = await Promise.all([
          fetch("/api/skills", { cache: "no-store" }),
          fetch("/api/settings", { cache: "no-store" }),
        ]);

        if (!skillsRes.ok) throw new Error("Failed to load skills");
        if (!settingsRes.ok) throw new Error("Failed to load settings");

        const skillsData = (await skillsRes.json()) as SkillInfo[];
        const settingsData = (await settingsRes.json()) as SettingsState;

        setSkills(skillsData);
        setSettings(settingsData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    }
    load().catch(() => undefined);
  }, []);

  if (loading) {
    return <div className="text-sm text-muted-foreground">Loading skills...</div>;
  }

  if (error) {
    return <div className="text-sm text-red-700">Error: {error}</div>;
  }

  const skillsNeedingKeys = skills.filter((s) => SKILL_API_KEY_NEEDS[s.name] !== undefined);
  const configuredCount = skillsNeedingKeys.filter(
    (s) => {
      const k = SKILL_API_KEY_NEEDS[s.name];
      return k !== undefined && settings !== null && settings[k.settingsKey];
    },
  ).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span>{skills.length} skills registered</span>
        <span>·</span>
        <span>
          {configuredCount}/{skillsNeedingKeys.length} tool API keys configured
        </span>
        {configuredCount < skillsNeedingKeys.length && (
          <>
            <span>·</span>
            <Link href="/admin/settings" className="underline text-primary">
              Configure missing keys →
            </Link>
          </>
        )}
      </div>

      <div className="space-y-3">
        {skills.map((skill) => (
          <SkillCard key={skill.name} skill={skill} settings={settings} />
        ))}
      </div>
    </div>
  );
}
