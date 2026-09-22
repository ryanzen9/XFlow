import type { FormEvent } from "react";
import { PROVIDERS, type AppSettings } from "../../shared";
import { Toggle } from "./Toggle";
import { ActivityPanel } from "./ActivityPanel";
import {
  card,
  control,
  field,
  fieldHelp,
  fieldLabel,
  primaryButton,
  sectionDescription,
  sectionHeading,
  sectionIcon,
  sectionTitle,
  tag,
} from "../../ui/styles";
import { providerLabel, useI18n } from "../../ui/i18n";

interface Props {
  settings: AppSettings;
  busy: boolean;
  onChange: (patch: Partial<AppSettings>) => void;
  onToggle: (key: "enabled" | "commentsEnabled", checked: boolean) => void;
  onSave: () => void;
}

export function GeneralPanel({ settings, busy, onChange, onToggle, onSave }: Props) {
  const { locale, t } = useI18n();
  const submit = (event: FormEvent) => {
    event.preventDefault();
    onSave();
  };
  return (
    <div className="grid max-w-[980px] content-start gap-[22px]">
      <ActivityPanel />
      <section className={card}>
        <div className={sectionTitle}>
          <span className={sectionIcon} aria-hidden="true">
            ◎
          </span>
          <div>
            <h2 className={sectionHeading}>{t("general.scope")}</h2>
            <p className={sectionDescription}>{t("general.scopeDescription")}</p>
          </div>
          <span className={`${tag} ml-auto max-[600px]:hidden`}>{t("general.live")}</span>
        </div>
        <Toggle
          label={t("general.homeTimeline")}
          description={t("general.homeDescription")}
          checked={settings.enabled}
          disabled={busy}
          onChange={(checked) => onToggle("enabled", checked)}
        />
        <Toggle
          label={t("general.comments")}
          description={t("general.commentsDescription")}
          checked={settings.commentsEnabled}
          disabled={busy}
          onChange={(checked) => onToggle("commentsEnabled", checked)}
        />
        <p className="pt-4 text-xs text-muted">{t("general.pauseHelp")}</p>
      </section>
      <form onSubmit={submit}>
        <fieldset disabled={busy} className={card}>
          <div className={sectionTitle}>
            <span className={sectionIcon} aria-hidden="true">
              ↗
            </span>
            <div>
              <h2 className={sectionHeading}>{t("general.modelDisplay")}</h2>
              <p className={sectionDescription}>{t("general.modelDisplayDescription")}</p>
            </div>
          </div>
          <label className={field} htmlFor="model-nickname">
            <span className={fieldLabel}>{t("general.modelNickname")}</span>
            <input
              className={control}
              id="model-nickname"
              required
              maxLength={40}
              value={settings.modelNickname}
              onChange={(event) => onChange({ modelNickname: event.target.value })}
            />
            <small className={fieldHelp}>{t("general.modelNicknameHelp")}</small>
          </label>
          <div className="mt-[18px] flex flex-wrap items-center gap-3 border-t border-line py-3.5 text-xs text-muted">
            <span>{t("general.currentModel")}</span>
            <code className="font-mono text-ink">{PROVIDERS[settings.activeProvider].modelId}</code>
            <span>{providerLabel(settings.activeProvider, locale)}</span>
            <span className={tag}>Jev decision</span>
          </div>
          <div className="mt-2 flex justify-end">
            <button className={primaryButton} type="submit">
              {busy ? t("common.saving") : t("general.save")}
            </button>
          </div>
        </fieldset>
      </form>
    </div>
  );
}
