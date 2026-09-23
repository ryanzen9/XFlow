import { ArrowRight } from "lucide-react";
import { MotionConfig } from "framer-motion";
import { PrivacyPolicy } from "./pages/PrivacyPolicy";
import { RefractedBeams } from "./components/RefractedBeams";
import { ShimmerButton } from "./components/ShimmerButton";
import { SplitTextReveal } from "./components/SplitTextReveal";

export type SitePage = "home" | "privacy-zh" | "privacy-en";

export default function SiteApp({ page }: { page: SitePage }) {
  return (
    <MotionConfig reducedMotion="user">
      {page === "home" ? <HomePage /> : <PolicyPage language={page === "privacy-zh" ? "zh" : "en"} />}
    </MotionConfig>
  );
}

function PolicyPage({ language }: { language: "zh" | "en" }) {
  return (
    <div className="site-shell site-shell--policy">
      <RefractedBeams />
      <header className="site-header site-header--policy">
        <a className="wordmark" href="./" aria-label={language === "zh" ? "XFlow 首页" : "XFlow home"}>
          XFLOW<span className="wordmark__separator">/</span>
          <span className="wordmark__descriptor">JEV FILTERING</span>
        </a>
      </header>
      <PrivacyPolicy language={language} />
    </div>
  );
}

function HomePage() {
  return (
    <div className="site-shell site-shell--home">
      <RefractedBeams />
      <header className="site-header">
        <a className="wordmark" href="./" aria-label="XFlow 首页">
          XFLOW<span className="wordmark__separator">/</span>
          <span className="wordmark__descriptor">JEV FILTERING</span>
        </a>
      </header>

      <main className="landing">
        <section className="hero-copy" aria-labelledby="page-title">
          <p className="eyebrow">X / 策略过滤扩展</p>
          <h1 id="page-title">
            <SplitTextReveal text="让噪声退场，" />
            <br />
            <SplitTextReveal text="把选择留给你。" />
          </h1>
          <p className="hero-summary">
            XFlow 使用 Jev 按你的规则过滤 X 帖子与评论。命中内容仍留在页面中，以可揭示的遮罩呈现；Provider
            凭据保存在本机。
          </p>
          <div className="hero-actions">
            <ShimmerButton href="https://github.com/ryanzen9/XFlow" target="_blank" rel="noreferrer">
              查看 GitHub 源码
            </ShimmerButton>
            <a className="policy-action" href="./privacy.html">
              隐私政策 <ArrowRight className="policy-action__icon" aria-hidden="true" focusable="false" />
            </a>
          </div>
        </section>
      </main>
    </div>
  );
}
