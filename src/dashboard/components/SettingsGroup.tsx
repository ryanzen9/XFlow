import type { ReactNode } from "react";
import { Heading } from "@astryxdesign/core/Heading";
import { HStack } from "@astryxdesign/core/HStack";
import { Section } from "@astryxdesign/core/Section";
import { StackItem } from "@astryxdesign/core/Stack";
import { VStack } from "@astryxdesign/core/VStack";
import { useMediaQuery } from "@astryxdesign/core/hooks";

/** Settings Panels pattern: 200px section lead, capped fields; stacked below xl. */
export function SettingsGroup({ title, children, id }: { title: string; children: ReactNode; id: string }) {
  const isWide = useMediaQuery("(min-width: 1280px)");
  const heading = (
    <Heading level={2} id={id}>
      {title}
    </Heading>
  );
  return (
    <Section variant="transparent" padding={6} role="region" aria-labelledby={id}>
      {isWide ? (
        <HStack gap={8} vAlign="start">
          <VStack width={200} className="shrink-0">
            {heading}
          </VStack>
          <StackItem size="fill">
            <VStack gap={4}>{children}</VStack>
          </StackItem>
        </HStack>
      ) : (
        <VStack gap={4}>
          {heading}
          {children}
        </VStack>
      )}
    </Section>
  );
}
