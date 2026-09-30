import { AspectRatio } from "@astryxdesign/core/AspectRatio";
import { Button } from "@astryxdesign/core/Button";
import { Grid } from "@astryxdesign/core/Grid";
import { Icon } from "@astryxdesign/core/Icon";
import { Layout, LayoutContent, VStack, HStack } from "@astryxdesign/core/Layout";
import { Link } from "@astryxdesign/core/Link";
import { Section } from "@astryxdesign/core/Section";
import { Text, Heading } from "@astryxdesign/core/Text";
import { TopNav, TopNavHeading, TopNavItem } from "@astryxdesign/core/TopNav";
import { Theme } from "@astryxdesign/core/theme";
import { ArrowRight } from "lucide-react";
import { neutralTheme } from "../themes/neutral/neutral";
import { PrivacyPolicy } from "./pages/PrivacyPolicy";

export type SitePage = "home" | "privacy-zh" | "privacy-en";

const sourceUrl = "https://github.com/ryanzen9/XFlow";
const storeUrl = "https://chromewebstore.google.com/detail/xflow/jelihbmknilmpbgjjjcmcbchmjloghnj";

export default function SiteApp({ page }: { page: SitePage }) {
  const isEnglish = page === "privacy-en";

  return (
    <Theme theme={neutralTheme} mode="dark">
      <VStack minHeight="100svh" className="bg-body">
        <a href="#main-content" className="sr-only focus:not-sr-only focus:bg-surface focus:p-4 focus:text-primary">
          {isEnglish ? "Skip to content" : "跳转到正文"}
        </a>
        <SiteHeader page={page} />
        {page === "home" ? <HomePage /> : <PrivacyPolicy language={isEnglish ? "en" : "zh"} />}
        <SiteFooter isEnglish={isEnglish} />
      </VStack>
    </Theme>
  );
}

function SiteHeader({ page }: { page: SitePage }) {
  const isEnglish = page === "privacy-en";

  return (
    <VStack as="header" paddingInline={4} className="border-b border-border md:px-10">
      <VStack width="100%" maxWidth={1200} className="mx-auto">
        <TopNav
          label={isEnglish ? "Main navigation" : "主导航"}
          heading={<TopNavHeading heading="XFlow" headingHref="./" />}
          centerContent={
            <HStack className="hidden md:flex">
              <TopNavItem label={isEnglish ? "How it works" : "工作方式"} href="./#how-it-works" />
              <TopNavItem
                label={isEnglish ? "Privacy" : "隐私政策"}
                href={isEnglish ? "./privacy-en.html" : "./privacy.html"}
                isSelected={page !== "home"}
              />
            </HStack>
          }
          endContent={<Button label="GitHub" href={sourceUrl} variant="ghost" />}
        />
      </VStack>
    </VStack>
  );
}

// Centered Hero: one centered copy column above one wide filtering illustration.
// The frame caps at 1200px; copy caps at 720px. Actions wrap and the feature
// grid becomes a single column when its 280px regions no longer fit.
function HomePage() {
  return (
    <Layout
      height="auto"
      contentWidth={1200}
      content={
        <LayoutContent padding={4} isScrollable={false}>
          <VStack as="main" id="main-content" tabIndex={-1} gap={10} className="py-10 md:px-6 md:py-16">
            <VStack as="section" aria-labelledby="page-title" gap={8} hAlign="center">
              <VStack gap={5} hAlign="center" maxWidth={720}>
                <Text type="code" color="secondary" justify="center">
                  X / READ WITH INTENTION
                </Text>
                <Heading
                  level={1}
                  type="display-1"
                  weight="semibold"
                  justify="center"
                  textWrap="balance"
                  id="page-title"
                >
                  让噪声退场。
                </Heading>
                <Text as="p" type="large" color="secondary" justify="center" textWrap="balance">
                  用你的规则，找回值得读的时间线。
                </Text>
                <Text as="p" color="secondary" justify="center" textWrap="balance">
                  XFlow 基于 Jev 与自定义策略过滤 X 帖子与评论。
                  <br />
                  想看什么，由你决定；何时揭示，也由你决定。
                </Text>
              </VStack>
              <VStack gap={4} hAlign="center">
                <HStack gap={3} wrap="wrap" hAlign="center">
                  <Button
                    label="添加至 Chrome"
                    href={storeUrl}
                    variant="primary"
                    size="lg"
                    className="min-h-12 px-6"
                    endContent={<Icon icon={ArrowRight} size="sm" />}
                  />
                  <Button
                    label="查看 GitHub 源码"
                    href={sourceUrl}
                    variant="secondary"
                    size="lg"
                    className="min-h-12 px-6"
                  />
                </HStack>
                <Text type="supporting" justify="center" textWrap="balance">
                  安装后需配置 Provider API Key，模型服务可能产生费用。
                </Text>
              </VStack>
            </VStack>

            <VStack as="figure" gap={4}>
              <AspectRatio ratio={1672 / 941} fit="contain" className="overflow-hidden rounded-lg border border-border">
                <img
                  src="./assets/xflow-hero.webp"
                  width={1672}
                  height={941}
                  fetchPriority="high"
                  alt="低对比的模糊帖子背景上，几条细几何线条与开放矩形留出安静的阅读空间。"
                />
              </AspectRatio>
              <Text as="p" type="supporting" justify="center">
                让信息流更安静，把选择留给你。
              </Text>
            </VStack>

            <Section variant="transparent" padding={0} paddingInline={4} dividers={["top"]} paddingBlockStart={10}>
              <VStack as="section" id="how-it-works" aria-labelledby="features-title" gap={8}>
                <VStack gap={3}>
                  <Text type="code" color="secondary">
                    HOW IT WORKS
                  </Text>
                  <Heading level={2} id="features-title">
                    少一点干扰，多一点主动。
                  </Heading>
                </VStack>
                <Grid columns={{ minWidth: 280, max: 3 }} gap={8}>
                  <VStack gap={3}>
                    <Text type="code" color="secondary">
                      01 / YOUR RULES
                    </Text>
                    <Heading level={3}>定义你的过滤规则</Heading>
                    <Text as="p" color="secondary">
                      为时间线和评论区分别设置策略。用提示词、优先级和命中阈值，明确哪些内容应该退场。
                    </Text>
                  </VStack>
                  <VStack gap={3}>
                    <Text type="code" color="secondary">
                      02 / BLUR VEIL
                    </Text>
                    <Heading level={3}>遮住噪声，保留选择</Heading>
                    <Text as="p" color="secondary">
                      命中内容以模糊遮罩呈现，保留帖子位置。你可以随时点击或用键盘揭示，再次遮住也同样简单。
                    </Text>
                  </VStack>
                  <VStack gap={3}>
                    <Text type="code" color="secondary">
                      03 / LOCAL FIRST
                    </Text>
                    <Heading level={3}>本地保存，按需同步</Heading>
                    <Text as="p" color="secondary">
                      配置与 Activity 默认本地保存。待判断的帖子文本会发送到你选择的 Provider；S3 同步由你按需开启。
                    </Text>
                  </VStack>
                </Grid>
              </VStack>
            </Section>
          </VStack>
        </LayoutContent>
      }
    />
  );
}

function SiteFooter({ isEnglish }: { isEnglish: boolean }) {
  return (
    <Section padding={4} dividers={["top"]} variant="transparent" className="md:px-10">
      <HStack as="footer" maxWidth={1200} gap={4} hAlign="between" wrap="wrap" className="mx-auto">
        <Text type="supporting">XFlow / Read with intention.</Text>
        <HStack gap={6} wrap="wrap">
          <Link href={isEnglish ? "./privacy-en.html" : "./privacy.html"} color="secondary" isStandalone>
            {isEnglish ? "Privacy policy" : "隐私政策"}
          </Link>
          <Link href={sourceUrl} color="secondary" isStandalone>
            GitHub
          </Link>
        </HStack>
      </HStack>
    </Section>
  );
}
