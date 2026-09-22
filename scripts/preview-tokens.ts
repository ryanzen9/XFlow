// Local token gallery. Not part of the extension build: run it when the token
// system, type roles or theme values change, and review light + dark.
const tokenCss = await Bun.file(new URL("../src/styles/token.css", import.meta.url)).text();

const colorGroups: Array<{ title: string; tokens: string[] }> = [
  {
    title: "Surfaces",
    tokens: ["--bg-canvas", "--bg-surface", "--bg-raised", "--bg-inset", "--bg-selected", "--bg-inverse"],
  },
  { title: "Text", tokens: ["--fg-1", "--fg-2", "--fg-3", "--fg-4", "--fg-5", "--fg-inverse"] },
  { title: "Borders", tokens: ["--bd-subtle", "--bd-default", "--bd-strong", "--bd-focus"] },
  { title: "Action", tokens: ["--action-bg", "--action-bg-hover", "--action-bg-active", "--action-fg"] },
  {
    title: "State",
    tokens: ["--live", "--live-soft", "--warn-text", "--warn-soft", "--danger-text", "--danger-soft", "--danger-solid"],
  },
];

const typeRoles: Array<{ token: string; label: string; specimen: string; family?: string }> = [
  { token: "--type-hero", label: "hero · 48–80px · 0.95 · +0.02em", specimen: "Signal filter" },
  { token: "--type-readout", label: "readout · 46px · 0.95 · +0.025em · tabular", specimen: "1,284" },
  { token: "--type-display", label: "display · 34px · 1.02 · +0.035em", specimen: "Filtered today" },
  { token: "--type-title", label: "title · 26px · 1.1 · +0.04em", specimen: "Policy editor" },
  { token: "--type-heading", label: "heading · 19px · 1.25 · +0.055em", specimen: "Hover expression" },
  {
    token: "--type-body",
    label: "body · 16px · 1.6 · untracked",
    specimen: "配置保存在当前浏览器，预览不会产生 API 消耗。",
  },
  { token: "--type-ui", label: "ui · 13px · 1.45 · +0.08em", specimen: "Saved to local workspace" },
  { token: "--type-label", label: "label · 11px · 1.4 · +0.1em", specimen: "Providers" },
  { token: "--type-meta", label: "meta · 10px · 1.35 · +0.11em", specimen: "Timeline · comments" },
  { token: "--type-caption", label: "caption · 9px · 1.3 · +0.12em", specimen: "Last synced 2m ago" },
  {
    token: "--type-code",
    label: "code · 11px · 1.75 · +0.02em",
    specimen: '{"schemaVersion":1}',
    family: "var(--family-mono)",
  },
];

const spaceTokens = [
  "--space-0-5",
  "--space-1",
  "--space-2",
  "--space-3",
  "--space-4",
  "--space-6",
  "--space-8",
  "--space-12",
  "--space-16",
  "--space-24",
];
const cornerTokens = [
  "--corner-none",
  "--corner-xs",
  "--corner-sm",
  "--corner-md",
  "--corner-lg",
  "--corner-xl",
  "--corner-pill",
];
const layoutTokens = [
  "--layout-page-max",
  "--layout-content-max",
  "--layout-rail",
  "--layout-rail-wide",
  "--layout-gutter",
  "--layout-header",
  "--layout-popup-width",
  "--hit-target",
  "--focus-ring-width",
  "--focus-ring-offset",
];
const motionTokens: Array<[string, string]> = [
  ["--motion-snappy", "snappy · fast out, slight overshoot"],
  ["--motion-smooth", "smooth · expo out, long tail"],
  ["--motion-swift", "swift · back out, big overshoot"],
];

const page = `<!doctype html>
<html lang="zh-CN" data-theme="dark">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>XFlow · Design Tokens</title>
<style>${tokenCss}</style>
<style>
  * { box-sizing: border-box; }
  body {
    margin: 0;
    background-color: var(--bg-canvas);
    background-image: var(--pattern-margin-rule);
    color: var(--fg-1);
    font-family: var(--family-body);
    font-size: var(--size-body);
    line-height: var(--line-body);
    -webkit-font-smoothing: antialiased;
  }
  .bar {
    position: sticky; top: 0; z-index: 2;
    display: flex; flex-wrap: wrap; align-items: flex-end; justify-content: space-between; gap: var(--space-6);
    padding: var(--space-6) var(--layout-gutter);
    background-color: var(--bg-canvas);
    border-bottom: var(--rule-width) var(--rule-style) var(--bd-subtle);
  }
  .bar p { margin: 0 0 var(--space-2); font-family: var(--family-mono); font-size: var(--size-meta); letter-spacing: var(--track-meta); text-transform: uppercase; color: var(--fg-3); }
  .bar h1 { margin: 0; font-size: var(--size-display); line-height: var(--line-display); letter-spacing: var(--track-display); font-weight: var(--weight-bold); text-transform: uppercase; }
  .bar h1 small { display: block; margin-top: var(--space-1); font-family: var(--family-mono); font-size: var(--size-caption); letter-spacing: var(--track-caption); font-weight: var(--weight-regular); color: var(--fg-3); }
  .switcher { display: flex; border: var(--rule-width) var(--rule-style) var(--bd-strong); }
  .switcher button {
    appearance: none; border: 0; border-left: var(--rule-width) var(--rule-style) var(--bd-strong);
    background: var(--bg-surface); color: var(--fg-3); cursor: pointer;
    padding: var(--space-2) var(--space-4);
    font-family: var(--family-mono); font-size: var(--size-caption); letter-spacing: var(--track-caption); text-transform: uppercase;
    transition: var(--transition-surface), var(--transition-color);
  }
  .switcher button:first-child { border-left: 0; }
  .switcher button[aria-pressed="true"] { background: var(--action-bg); color: var(--action-fg); }
  .switcher button:focus-visible { outline: var(--focus-ring); outline-offset: 2px; }
  main { padding: 0 var(--layout-gutter) var(--space-24); }
  section { display: grid; gap: var(--space-6); padding: var(--space-12) 0; border-bottom: var(--rule-width) var(--rule-style) var(--bd-subtle); }
  section > header { display: flex; align-items: baseline; gap: var(--space-4); }
  section > header h2 { margin: 0; font-family: var(--family-mono); font-size: var(--size-label); letter-spacing: var(--track-label); text-transform: uppercase; font-weight: var(--weight-semibold); }
  section > header span { font-family: var(--family-mono); font-size: var(--size-caption); letter-spacing: var(--track-caption); text-transform: uppercase; color: var(--fg-4); }
  @media (min-width: 60rem) { section { grid-template-columns: 15rem minmax(0, 1fr); } }
  .swatches { display: grid; gap: var(--space-4); grid-template-columns: repeat(auto-fill, minmax(13rem, 1fr)); }
  .swatch { border: var(--rule-width) var(--rule-style) var(--bd-subtle); background: var(--bg-surface); }
  .swatch .chip { height: 3.5rem; border-bottom: var(--rule-width) var(--rule-style) var(--bd-subtle); }
  .swatch dl { margin: 0; padding: var(--space-2) var(--space-3) var(--space-3); display: grid; gap: 2px; }
  .swatch dt { font-family: var(--family-mono); font-size: var(--size-caption); letter-spacing: var(--track-caption); text-transform: uppercase; }
  .swatch dd { margin: 0; font-family: var(--family-mono); font-size: var(--size-caption); color: var(--fg-3); }
  .group + .group { margin-top: var(--space-6); }
  .group > h3 { margin: 0 0 var(--space-3); font-family: var(--family-mono); font-size: var(--size-caption); letter-spacing: var(--track-caption); text-transform: uppercase; color: var(--fg-3); }
  .specimen { display: grid; gap: var(--space-1); padding: var(--space-4) 0; border-bottom: var(--rule-width) var(--rule-style) var(--bd-subtle); }
  .specimen:last-child { border-bottom: 0; }
  .specimen em { font-family: var(--family-mono); font-size: var(--size-caption); letter-spacing: var(--track-caption); text-transform: uppercase; color: var(--fg-4); font-style: normal; }
  .bars, .corners, .layouts { display: grid; gap: var(--space-3); }
  .bar-row { display: grid; grid-template-columns: 8rem 1fr; align-items: center; gap: var(--space-4); font-family: var(--family-mono); font-size: var(--size-caption); letter-spacing: var(--track-caption); color: var(--fg-3); }
  .bar-row i { display: block; height: 0.7rem; background: var(--action-bg); }
  .corners { grid-template-columns: repeat(auto-fill, minmax(6rem, 1fr)); }
  .corner { display: grid; gap: var(--space-2); justify-items: center; padding: var(--space-3); font-family: var(--family-mono); font-size: var(--size-caption); color: var(--fg-3); }
  .corner i { display: block; width: 3.25rem; height: 3.25rem; border: var(--rule-width) var(--rule-style) var(--bd-strong); background: var(--bg-surface); }
  .layouts div { display: flex; justify-content: space-between; gap: var(--space-4); padding: var(--space-2) 0; border-bottom: var(--rule-width) var(--rule-style) var(--bd-subtle); font-family: var(--family-mono); font-size: var(--size-caption); letter-spacing: var(--track-caption); }
  .layouts dt { color: var(--fg-3); }
  .layouts dd { margin: 0; }
  .motion { display: grid; gap: var(--space-5); }
  .motion-row { display: grid; grid-template-columns: 12rem minmax(0, 1fr) auto; align-items: center; gap: var(--space-4); }
  .motion-row em { font-family: var(--family-mono); font-size: var(--size-caption); letter-spacing: var(--track-caption); text-transform: uppercase; color: var(--fg-3); font-style: normal; }
  .track { position: relative; height: 2.25rem; border: var(--rule-width) var(--rule-style) var(--bd-subtle); background: var(--bg-inset); }
  .track i { position: absolute; top: 0; left: 0; width: 2.25rem; height: 100%; background: var(--action-bg); }
  .motion-row button {
    appearance: none; border: var(--rule-width) var(--rule-style) var(--bd-strong); background: var(--bg-surface); color: var(--fg-1);
    padding: var(--space-2) var(--space-3); cursor: pointer;
    font-family: var(--family-mono); font-size: var(--size-caption); letter-spacing: var(--track-caption); text-transform: uppercase;
  }
  .motion-row button:focus-visible { outline: var(--focus-ring); outline-offset: 2px; }
  .reduce { margin: 0; font-family: var(--family-mono); font-size: var(--size-caption); letter-spacing: var(--track-caption); color: var(--fg-4); }
</style>
</head>
<body>
  <header class="bar">
    <div>
      <p>XFlow / design language</p>
      <h1>Token index<small>Industrial minimalism · terminal native · editorial typography · high-contrast monochrome</small></h1>
    </div>
    <div class="switcher" role="group" aria-label="主题">
      <button type="button" data-set="light" aria-pressed="false">Light</button>
      <button type="button" data-set="dark" aria-pressed="true">Dark</button>
      <button type="button" data-set="system" aria-pressed="false">System</button>
    </div>
  </header>
  <main>
    <section>
      <header><h2>01 / Colour</h2><span>neutral 92–96% · semantic 3–6% · accent 0–2%</span></header>
      <div data-colours></div>
    </section>
    <section>
      <header><h2>02 / Typography</h2><span>D-DIN · uppercase · tracked 0.96–1.6px</span></header>
      <div data-type></div>
    </section>
    <section>
      <header><h2>03 / Space</h2><span>4px grid</span></header>
      <div class="bars" data-space></div>
    </section>
    <section>
      <header><h2>04 / Corner</h2><span>small radii only · capped at 8px</span></header>
      <div class="corners" data-corners></div>
    </section>
    <section>
      <header><h2>05 / Motion</h2><span>snappy · smooth · swift</span></header>
      <div>
        <div class="motion" data-motion></div>
        <p class="reduce">All three collapse to 1ms under prefers-reduced-motion.</p>
      </div>
    </section>
    <section>
      <header><h2>06 / Layout</h2><span>measured, not guessed</span></header>
      <dl class="layouts" data-layouts></dl>
    </section>
  </main>
  <script>
    const colourGroups = ${JSON.stringify(colorGroups)};
    const typeRoles = ${JSON.stringify(typeRoles)};
    const spaceTokens = ${JSON.stringify(spaceTokens)};
    const cornerTokens = ${JSON.stringify(cornerTokens)};
    const layoutTokens = ${JSON.stringify(layoutTokens)};
    const motionTokens = ${JSON.stringify(motionTokens)};

    const root = document.documentElement;
    const probe = document.createElement("span");
    probe.style.cssText = "position:absolute;visibility:hidden;pointer-events:none";
    document.body.append(probe);

    const toHex = (value) => {
      const match = value.match(/^rgba?\\(([^)]+)\\)$/);
      if (!match) return value;
      const parts = match[1].split(/[,\\s/]+/).filter(Boolean).map(Number);
      const [r, g, b] = parts;
      const alpha = parts.length > 3 ? parts[3] : 1;
      const hex = "#" + [r, g, b].map((channel) => channel.toString(16).padStart(2, "0")).join("");
      return (alpha < 1 ? hex + " · " + Math.round(alpha * 100) + "%" : hex).toUpperCase();
    };

    /** Custom properties hold token *sources*, so resolve them by using them. */
    const resolveColour = (property) => {
      probe.style.cssText = "position:absolute;visibility:hidden;pointer-events:none;background-color:var(" + property + ")";
      return getComputedStyle(probe).backgroundColor;
    };

    const buildColours = () => {
      const host = document.querySelector("[data-colours]");
      host.innerHTML = "";
      for (const group of colourGroups) {
        const wrap = document.createElement("div");
        wrap.className = "group";
        wrap.innerHTML = "<h3>" + group.title + "</h3>";
        const grid = document.createElement("div");
        grid.className = "swatches";
        for (const token of group.tokens) {
          const card = document.createElement("div");
          card.className = "swatch";
          const chip = document.createElement("div");
          chip.className = "chip";
          chip.style.background = "var(" + token + ")";
          const list = document.createElement("dl");
          const dt = document.createElement("dt");
          dt.textContent = token.replace("--", "");
          const dd = document.createElement("dd");
          dd.textContent = toHex(resolveColour(token));
          list.append(dt, dd);
          card.append(chip, list);
          grid.append(card);
        }
        wrap.append(grid);
        host.append(wrap);
      }
    };

    const buildType = () => {
      const host = document.querySelector("[data-type]");
      host.innerHTML = "";
      for (const role of typeRoles) {
        const row = document.createElement("div");
        row.className = "specimen";
        const sample = document.createElement("span");
        sample.style.cssText =
          "font-size:var(" + role.token + "-size);line-height:var(" + role.token + "-line);" +
          "letter-spacing:var(" + role.token + "-track);font-weight:var(" + role.token + "-weight);" +
          "text-transform:var(" + role.token + "-case);font-family:" + (role.family || "var(--family-display)");
        sample.textContent = role.specimen;
        const meta = document.createElement("em");
        meta.textContent = role.label;
        row.append(sample, meta);
        host.append(row);
      }
    };

    const buildBars = (selector, tokens, apply) => {
      const host = document.querySelector(selector);
      host.innerHTML = "";
      for (const token of tokens) {
        const row = document.createElement("div");
        row.className = "bar-row";
        const name = document.createElement("span");
        name.textContent = token.replace("--", "");
        const value = document.createElement("span");
        value.style.cssText = "display:flex;align-items:center;gap:0.75rem";
        const bar = document.createElement("i");
        apply(bar, token, value);
        value.append(bar);
        row.append(name, value);
        host.append(row);
      }
    };

    const buildLayouts = () => {
      const host = document.querySelector("[data-layouts]");
      host.innerHTML = "";
      for (const token of layoutTokens) {
        const row = document.createElement("div");
        const dt = document.createElement("dt");
        dt.textContent = token.replace("--", "");
        const dd = document.createElement("dd");
        dd.textContent = getComputedStyle(root).getPropertyValue(token).trim();
        row.append(dt, dd);
        host.append(row);
      }
    };

    const buildMotion = () => {
      const host = document.querySelector("[data-motion]");
      host.innerHTML = "";
      for (const [token, label] of motionTokens) {
        const row = document.createElement("div");
        row.className = "motion-row";
        const name = document.createElement("em");
        name.textContent = label;
        const track = document.createElement("div");
        track.className = "track";
        const block = document.createElement("i");
        track.append(block);
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = "Replay";
        const play = () => {
          block.style.transition = "none";
          block.style.transform = "translateX(0)";
          void block.offsetWidth;
          block.style.transition = "transform var(" + token + ")";
          block.style.transform = "translateX(" + (track.clientWidth - block.clientWidth) + "px)";
        };
        button.addEventListener("click", play);
        row.append(name, track, button);
        host.append(row);
      }
    };

    const paint = () => {
      buildColours();
      buildLayouts();
    };

    document.querySelectorAll("[data-set]").forEach((button) => {
      button.addEventListener("click", () => {
        const mode = button.dataset.set;
        if (mode === "system") delete root.dataset.theme;
        else root.dataset.theme = mode;
        document.querySelectorAll("[data-set]").forEach((peer) => {
          peer.setAttribute("aria-pressed", String(peer === button));
        });
        paint();
      });
    });

    for (const token of cornerTokens) {
      const cell = document.createElement("div");
      cell.className = "corner";
      const shape = document.createElement("i");
      shape.style.borderRadius = "var(" + token + ")";
      const name = document.createElement("span");
      name.textContent = token.replace("--", "");
      cell.append(shape, name);
      document.querySelector("[data-corners]").append(cell);
    }

    buildBars("[data-space]", spaceTokens, (bar, token, value) => {
      bar.style.width = "var(" + token + ")";
      const label = document.createElement("span");
      label.textContent = getComputedStyle(root).getPropertyValue(token).trim();
      value.append(label);
    });

    buildType();
    buildMotion();
    paint();
  </script>
</body>
</html>
`;

const server = Bun.serve({
  hostname: "127.0.0.1",
  port: Number(Bun.env.TOKEN_PREVIEW_PORT || 43993),
  fetch() {
    return new Response(page, { headers: { "Content-Type": "text/html; charset=utf-8" } });
  },
});
console.log(`Token gallery: ${server.url}`);
