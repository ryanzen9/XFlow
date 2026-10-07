import { StatusDot, type StatusDotProps } from "@astryxdesign/core/StatusDot";
import { useEffect, useEffectEvent, type ReactNode } from "react";
import { Banner } from "@astryxdesign/core/Banner";
import { Heading } from "@astryxdesign/core/Heading";
import { HStack } from "@astryxdesign/core/HStack";
import { LayerProvider } from "@astryxdesign/core/Layer";
import { Text } from "@astryxdesign/core/Text";
import { useToast } from "@astryxdesign/core/Toast";
import { VStack } from "@astryxdesign/core/VStack";
import type { Theme } from "../../shared";
import { AstryxLocale } from "../../ui/AstryxLocale";
import { AppearanceControls } from "../../ui/AppearanceControls";

export function DashboardLocale({ children }: { children: ReactNode }) {
  return (
    <AstryxLocale>
      <LayerProvider>{children}</LayerProvider>
    </AstryxLocale>
  );
}

/** Always pair the non-colour status label with the dot. */
export function Status({ label, variant = "neutral" }: Pick<StatusDotProps, "label" | "variant">) {
  return (
    <HStack as="span" gap={2} className="shrink-0">
      <StatusDot label={label} variant={variant} aria-hidden="true" />
      <Text type="supporting">{label}</Text>
    </HStack>
  );
}

export function SectionIntro({
  title,
  description,
  id,
  level = 2,
}: {
  title: string;
  description?: string;
  id?: string;
  level?: 2 | 3;
}) {
  return (
    <VStack gap={1} className="min-w-0">
      <Heading level={level} id={id}>
        {title}
      </Heading>
      {description && (
        <Text as="p" color="secondary">
          {description}
        </Text>
      )}
    </VStack>
  );
}

export function Panel({
  title,
  description,
  id,
  children,
}: {
  title: string;
  description?: string;
  id?: string;
  children: ReactNode;
}) {
  return (
    <VStack as="section" gap={4} padding={0} aria-labelledby={id}>
      <SectionIntro title={title} description={description} id={id} />
      {children}
    </VStack>
  );
}

export function Actions({ children }: { children: ReactNode }) {
  return (
    <HStack gap={2} hAlign="end" wrap="wrap">
      {children}
    </HStack>
  );
}

type Feedback = { message: string; error?: boolean };

/** Mount outside keyed page content so navigation cannot replay retained feedback. */
export function StatusToast({ message, error = false }: Feedback) {
  const toast = useToast();
  const notify = useEffectEvent(toast);
  useEffect(() => {
    if (!message || error) return;
    return notify({ body: message, uniqueID: "xflow-feedback" });
  }, [message, error]);
  return null;
}

export function StatusError({ message, error = false }: Feedback) {
  if (!message || !error) return null;
  return <Banner status="error" title={message} role="alert" container="section" />;
}

export function StatusMessage(props: Feedback) {
  return (
    <>
      <StatusToast {...props} />
      <StatusError {...props} />
    </>
  );
}

export function LabeledValue({ label, children }: { label: string; children: ReactNode }) {
  return (
    <VStack gap={1}>
      <Text type="supporting">{label}</Text>
      <Text className="wrap-anywhere">{children}</Text>
    </VStack>
  );
}

export function DashboardPreferences({
  theme,
  busy,
  onThemeChange,
}: {
  theme?: Theme;
  busy: boolean;
  onThemeChange: (theme: Theme) => void;
}) {
  return <AppearanceControls theme={theme} busy={busy} onThemeChange={onThemeChange} />;
}
