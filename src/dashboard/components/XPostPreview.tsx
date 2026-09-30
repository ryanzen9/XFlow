import type { Ref } from "react";
import { Avatar } from "@astryxdesign/core/Avatar";
import { HStack } from "@astryxdesign/core/HStack";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/VStack";

/** X's foreign palette is intentional: judge the shared content veil in its real host context. */
export function XPostPreview({
  ref,
  theme,
  text,
  nowLabel,
}: {
  ref: Ref<HTMLElement>;
  theme: "light" | "dim" | "dark";
  text: string;
  nowLabel: string;
}) {
  const palette = {
    light: "border-[#d2dfe1] bg-[#ffffff] text-[#0f1419]",
    dim: "border-[#38444d] bg-[#15202b] text-[#f7f9f9]",
    dark: "border-[#333639] bg-[#000000] text-[#e7e9ea]",
  };
  return (
    <VStack
      as="article"
      ref={ref}
      gap={4}
      padding={5}
      className={`overflow-hidden rounded-lg border ${palette[theme]}`}
    >
      <HStack as="header" gap={3} hAlign="between">
        <HStack gap={2}>
          <Avatar name="Lin" size="sm" />
          <VStack gap={0.5}>
            <Text weight="semibold" color="inherit">
              Lin / 林
            </Text>
            <Text type="supporting" color="inherit" className="opacity-65">
              @lin_notes · {nowLabel}
            </Text>
          </VStack>
        </HStack>
        <Text color="inherit" aria-hidden="true">
          ···
        </Text>
      </HStack>
      <Text as="p" color="inherit" className="break-words whitespace-pre-wrap">
        {text}
      </Text>
      <HStack
        as="figure"
        hAlign="between"
        gap={3}
        padding={5}
        className="overflow-hidden rounded-lg bg-[#e8ebec] text-[#536471]"
      >
        <Text type="code" color="inherit" weight="bold">
          LESS NOISE.
          <br />
          MORE SIGNAL.
        </Text>
        <svg width="96" height="96" viewBox="0 0 96 96" aria-hidden="true">
          <circle cx="48" cy="48" r="46" fill="none" stroke="#b9c3c7" />
          <circle cx="48" cy="48" r="30" fill="none" stroke="#b9c3c7" />
        </svg>
      </HStack>
      <HStack as="footer" hAlign="between" className="opacity-60">
        <Text type="code" color="inherit">
          ♡ 24
        </Text>
        <Text type="code" color="inherit">
          ↻ 8
        </Text>
        <Text type="code" color="inherit">
          ↗ 128
        </Text>
      </HStack>
    </VStack>
  );
}
