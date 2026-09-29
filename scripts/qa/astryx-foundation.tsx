import { Button } from "@astryxdesign/core/Button";
import { Heading } from "@astryxdesign/core/Heading";
import { Text } from "@astryxdesign/core/Text";
import { TextInput } from "@astryxdesign/core/TextInput";
import { VStack } from "@astryxdesign/core/VStack";
import { useState, useSyncExternalStore } from "react";
import { AstryxThemeRoot } from "../../src/ui/AstryxThemeRoot";
import { applyTheme } from "../../src/ui/theme";
import { getThemeMode, subscribeThemeMode } from "../../src/ui/theme-mode";

export function FoundationPreview() {
  const [value, setValue] = useState("");
  const [submitted, setSubmitted] = useState("");
  const mode = useSyncExternalStore(subscribeThemeMode, getThemeMode, () => "light" as const);

  return (
    <AstryxThemeRoot>
      <VStack as="main" gap={4} padding={6} maxWidth={640}>
        <Heading level={1}>Astryx foundation</Heading>
        <Text type="supporting" as="p">
          Neutral theme · {mode} mode · Figtree
        </Text>
        <TextInput label="Preview value" value={value} onChange={setValue} />
        <Button label="Apply value" variant="primary" onClick={() => setSubmitted(value)} />
        <Button
          label={`Switch to ${mode === "light" ? "dark" : "light"} mode`}
          onClick={() => applyTheme(mode === "light" ? "dark" : "light")}
        />
        <Text as="p">Applied value: {submitted || "—"}</Text>
      </VStack>
    </AstryxThemeRoot>
  );
}
