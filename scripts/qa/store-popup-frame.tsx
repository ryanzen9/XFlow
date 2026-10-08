import { Card } from "@astryxdesign/core/Card";
import { Heading } from "@astryxdesign/core/Heading";
import { HStack } from "@astryxdesign/core/HStack";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/VStack";
import { Theme } from "@astryxdesign/core/theme";
import { renderToStaticMarkup } from "react-dom/server";
import { neutralTheme } from "../../src/themes/neutral/neutral";

/** Browser-rendered store artwork; the iframe contains the real production Popup. */
export function storePopupFrame(version: string) {
  return renderToStaticMarkup(
    <Theme theme={neutralTheme} mode="dark">
      <HStack
        as="main"
        width={1280}
        height={800}
        gap={6}
        padding={6}
        hAlign="center"
        vAlign="center"
        className="bg-surface"
      >
        <VStack gap={6} width={420}>
          <Text type="supporting" color="secondary">
            XFlow · {version}
          </Text>
          <Heading level={1}>A quieter timeline.</Heading>
          <Text as="p" color="secondary">
            Your activity, at a glance.
          </Text>
          <Text type="supporting" color="secondary">
            Sample data · Local preview
          </Text>
        </VStack>
        <Card padding={0} className="overflow-hidden">
          {/* oxlint-disable-next-line react/iframe-missing-sandbox -- Trusted local-only Popup needs scripts and localStorage; its URL is fixed. */}
          <iframe src="/popup.html" title="XFlow Popup" width={320} height={400} className="border-0" />
        </Card>
      </HStack>
    </Theme>,
  );
}
