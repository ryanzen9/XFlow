<p align="center">
  <img src="logo.png" alt="XFlow" width="160" />
</p>

<p align="center">
  <a href="README.md">简体中文</a> · <strong>English</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-0.1.0-525252?style=flat-square&labelColor=0a0a0a" alt="Version 0.1.0" />
  <img src="https://img.shields.io/badge/Manifest-V3-525252?style=flat-square&labelColor=0a0a0a" alt="Manifest V3" />
  <img src="https://img.shields.io/badge/React-19-525252?style=flat-square&labelColor=0a0a0a" alt="React 19" />
  <img src="https://img.shields.io/badge/TypeScript-5-525252?style=flat-square&labelColor=0a0a0a" alt="TypeScript 5" />
  <img src="https://img.shields.io/badge/Bun-1.3-525252?style=flat-square&labelColor=0a0a0a" alt="Bun 1.3" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-4-525252?style=flat-square&labelColor=0a0a0a" alt="Tailwind CSS 4" />
</p>

<p align="center">
  A policy-driven content filter for X / Twitter.<br />
  XFlow does not remove posts or shift the feed. It quietly veils matched content and leaves reveal control with the reader.
</p>

<p align="center">
  <a href="https://ryanzen9.github.io/XFlow/">Project website</a> · <a href="https://ryanzen9.github.io/XFlow/privacy-en.html">Privacy policy</a>
</p>

> The current version is not yet available in the Chrome Web Store. Install it in developer mode.

## Preview

<p align="center">
  <img src="docs/assets/strategy-editor.webp" alt="XFlow policy editor and local Blur Veil preview in the dark theme" width="100%" />
</p>

<table>
  <tr>
    <td width="72%"><img src="docs/assets/dashboard-activity.webp" alt="Activity heatmap, trend, and weekly review in the light theme" /></td>
    <td width="28%"><img src="docs/assets/veil-preview.webp" alt="Local Blur Veil preview with hit-rate and threshold controls in the dark theme" /></td>
  </tr>
  <tr>
    <td align="center"><sub>Local activity, 30-day history, and a 12-week trend</sub></td>
    <td align="center"><sub>A live Blur Veil preview that never calls a model</sub></td>
  </tr>
</table>

The screenshots come from an isolated Dashboard mock store. They contain no real credentials and make no provider requests.

## Why XFlow

|      | Capability                | Current behavior                                                                                                               |
| ---- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `01` | Policy engine             | Configure separate policy queues, prompts, Hit Rate thresholds, and P1 → Pn priorities for timelines and replies.              |
| `02` | Blur Veil                 | Preserve the original post geometry while using a progressive veil, hover context, and click or keyboard reveal.               |
| `03` | Multi-provider Jev        | Explicitly select OpenRouter, Vercel AI Gateway, or TypeSafe, with no silent provider fallback.                                |
| `04` | Local-first activity      | Track deduplicated filter events locally with today/all-time counts, a heatmap, trend, weekly review, history, and page badge. |
| `05` | Versioned S3 sync         | Optionally sync config and activity; config follows versions, events merge by stable ID, and tombstones protect cleared data.  |
| `06` | Local credential boundary | Keep provider keys and S3 credentials in extension-local storage, outside Content Scripts, editable JSON, and S3 documents.    |
| `07` | Token-driven UI           | Share one token system across Popup and Dashboard with high-contrast Light / Dark themes and reduced-motion support.           |

## How it works

```text
X / Twitter DOM
      │
      ▼
Content Script ── normalized text ──► Background Service Worker
      │                                      │
      │                                      ├─ policy orchestration
      │                                      └─ selected Jev provider
      │                                                   │
      ◄──────── probability + matched policy ─────────────┘
      │
      ▼
Blur Veil state machine ── Hover / Reveal / Re-obscure
      │
      └─ Filtered event ──► Activity / Badge / optional S3 merge
```

The Content Script only discovers posts, extracts the minimum required text and metadata, renders the veil, and reports events that actually entered the filtered state. External requests, credentials, migrations, activity deduplication, and synchronization remain in the background Service Worker. See the [architecture guide](docs/architecture.md) for the complete boundary.

## Quick start

Requirements:

- [Bun](https://bun.sh/) 1.3.13 or a compatible release
- Chrome, Edge, or another Manifest V3 Chromium browser
- An API key for at least one supported provider

```bash
git clone https://github.com/ryanzen9/XFlow.git
cd XFlow
bun install
bun run check
```

`bun run check` runs formatting checks, linting, TypeScript, Bun tests, and the production build. Output is written to `dist/`.

Then:

1. Open `chrome://extensions` and enable **Developer mode**.
2. Select **Load unpacked** and choose the project's `dist/` directory.
3. Open the XFlow Dashboard, save at least one credential under **API Keys**, and select that provider.
4. Open or refresh `https://x.com/home`.

After rebuilding, reload the extension from the extensions page and refresh any open X tabs.

## Providers

| Provider          | Model               | Adapter API                     |
| ----------------- | ------------------- | ------------------------------- |
| OpenRouter        | `typesafe/jev-1.13` | `@openrouter/sdk` Decisions API |
| Vercel AI Gateway | `typesafe-ai/jev`   | AI SDK `experimental_evaluate`  |
| TypeSafe          | `jev-latest`        | `@typesafe-ai/sdk` System One   |

The active provider is always an explicit user choice. XFlow does not silently forward content to another provider after a failure, avoiding unexpected data routing or cost changes.

## Policies and interaction

- Timelines and replies have independent policy queues, each ordered from P1.
- The first policy whose probability reaches its own threshold wins; lower-priority results are considered only after higher-priority misses.
- Dashboard Hit Rate is the minimum match probability needed to veil a post. Adjust it with a number, slider, or Low (80%), Medium (70%), and Strict (50%) presets. Existing settings remain compatible with the legacy `sensitivity` field.
- Saving a policy first reveals existing veils smoothly, then re-evaluates affected content with the new configuration. This may create new API requests.
- Hover templates can reference the policy name, hit rate, threshold, model nickname, model ID, and surface.
- Switch Hover styles between Default, Text emphasis, and High contrast, or keep editing custom CSS.
- Custom CSS is restricted to documented veil selectors and visual properties; arbitrary page CSS is never injected into X.

See the [Blur Veil design specification](docs/blur-veil-design.md) for interaction and motion constraints.

## Activity, badge, and retention

- The Popup shows today's and all-time filter totals. The toolbar badge counts unique content only for the current page lifecycle in the current tab and stays hidden at zero.
- The Dashboard provides a 12-week heatmap, seven-day trend, current calendar-week review, and 30 days of filter history.
- An event is marked incorrect only after **Not supposed to be filtered** is explicitly selected. A temporary reveal is not automatically treated as a mistake.
- Detailed history is compacted after 30 days. Event identity is folded into compact per-device counts after 12 weeks, retaining all-time totals while bounding storage.
- Clearing activity writes a `clearedAt` tombstone so an older device or remote object cannot restore deleted records.

## S3 synchronization

S3 uses a path-style URL: `{endpoint}/{bucket}/{objectKey}`. XFlow requests optional host access when an endpoint is first saved. Once enabled, it synchronizes after config writes, at browser startup, and every 15 minutes.

- A newer local config, or a missing remote object, pushes the local document.
- A newer remote config is pulled and applied.
- Activity merges by stable content ID in either direction. Archived counts use the per-device maximum, and status advances monotonically through `Filtered → Revealed → Marked Incorrect`.

The bucket must allow GET, PUT, and CORS preflight requests from the extension origin.

## Privacy and permissions

- Only text extracted from enabled X surfaces is sent to the currently selected provider.
- Provider API keys and S3 credentials live in `chrome.storage.local` without additional encryption.
- Content Scripts can only read a secret-free settings mirror in `chrome.storage.session`.
- Editable configuration and remote S3 documents never include provider API keys or S3 credentials.
- Activity stores only a content ID, short text preview, author, filter time, matched policy, and required state. It does not store HTML, DOM, cookies, sessions, media files, or browsing paths.
- Fixed host permissions cover only X / Twitter and the three providers. An S3 endpoint receives optional access through an explicit user action.

Review [`manifest.json`](manifest.json) and your selected provider's data policy before installing. Never submit real credentials in issues, logs, tests, or screenshots.

## Development

The repository uses Bun throughout:

```bash
bun run format          # write Oxfmt formatting
bun run format:check    # check formatting
bun run lint            # Oxlint; warnings fail the command
bun run lint:fix        # fix supported lint rules
bun run typecheck       # TypeScript checks
bun test                # Bun unit tests
bun run build           # generate dist/
bun run check           # complete quality gate
bun run preview:dashboard
bun run preview:site
bun run preview:tokens
```

The Dashboard preview uses an isolated localStorage mock. It does not read installed extension data or call a model. The token index is served at `http://127.0.0.1:43993/` and exposes resolved values in both Light and Dark themes.

See the [project website guide](docs/project-page.md) for local preview and GitHub Pages deployment details.

## Roadmap

- [ ] Layered content-decision caching and duplicate-classification avoidance
- [ ] Extension UI internationalization
- [ ] Chrome Web Store release

## Documentation

- [Architecture, trust boundaries, and persistence](docs/architecture.md)
- [Blur Veil interaction and motion](docs/blur-veil-design.md)
- [Design-token layers and themes](docs/design-tokens.md)
- [Visual and interaction principles](design.md)
- [中文 README](README.md)

## Known limitations and license

- X / Twitter DOM changes can break content extraction and require selector and fixture updates.
- No open-source license has been added. Public visibility does not grant permission to copy, modify, or redistribute this project.
