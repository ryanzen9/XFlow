# Chrome Web Store listing kit · XFlow 0.1.1

This directory contains the store copy, icon, and promotional artwork for the `0.1.1` update. The English and Simplified Chinese listings carry equivalent copy. The initial `0.1.0` release and its public listing are recorded in [`../pull-request/9.md`](../pull-request/9.md).

## Copy into Developer Dashboard

| Dashboard area                                        | Source                                          |
| ----------------------------------------------------- | ----------------------------------------------- |
| Store listing · English                               | [`listing.en.md`](listing.en.md)                |
| Store listing · Simplified Chinese                    | [`listing.zh-CN.md`](listing.zh-CN.md)          |
| Privacy practices, permissions, reviewer instructions | [`dashboard-fields.md`](dashboard-fields.md)    |
| Privacy policy URL                                    | `https://ryanzen9.github.io/XFlow/privacy.html` |
| Support URL                                           | `https://github.com/ryanzen9/XFlow/issues`      |

The descriptions are written for version `0.1.1`. Their short summaries match `_locales/en/messages.json` and `_locales/zh_CN/messages.json` in the new package. Editing these files does not change the already published `0.1.0` item; copy the listing text into the Developer Dashboard and confirm it is public after review. Recheck all copy against the released package whenever the version, providers, permissions, or S3 behavior changes.

The `0.1.0` release ZIP's checks are recorded in [`stage-5-qa.md`](stage-5-qa.md). The exact `0.1.1` package's reproducibility, unpacked-load, console, resource, and packaged-byte checks are recorded in [`qa-0.1.1.md`](qa-0.1.1.md). Repeat these checks if the ZIP changes before submission.

## Store artwork

| Order / field          | File                                                               | Dimensions     | What it shows                                                |
| ---------------------- | ------------------------------------------------------------------ | -------------- | ------------------------------------------------------------ |
| Store icon             | [`assets/store-icon-128.png`](assets/store-icon-128.png)           | 128 × 128 PNG  | The same XFlow mark used by the extension                    |
| Screenshot 1           | `01-popup.png`                                                     | 1280 × 800 PNG | Actual dark-mode Popup in a monochrome presentation frame    |
| Screenshot 2           | `02-activity-dashboard.png`                                        | 1280 × 800 PNG | Actual dark-mode Activity trend and weekly review            |
| Screenshot 3           | `03-strategy-and-veil.png`                                         | 1280 × 800 PNG | Actual dark-mode strategy editor and local filtering preview |
| Small promotional tile | [`assets/small-promo-440x280.png`](assets/small-promo-440x280.png) | 440 × 280 PNG  | Text-light monochrome brand art                              |

The current three English screenshots were refreshed on 2026-10-07 after merging `main` (`129ad07`) into PR #15. Generate them with `bun run preview:assets`; upload the numbered files from ignored `output/previews/0.1.1/store/` in the order above. `xflow-0.1.1-store-previews.zip` in its parent directory contains those three PNGs, the existing icon and small promotional tile, a README and the capture manifest. The optional 1400 × 560 marquee tile is omitted. Use these English screenshots for the English or global screenshot fields.

The [version preview index](../previews/README.md) includes the refreshed documentation images, both Popup themes, API Keys and the new Jev request-log view. Its [0.1.1 manifest](../previews/0.1.1.json) records dimensions, language, theme, source/main commits, capture time and SHA-256. The earlier 0.1.0 screenshots and the 2026-09-30 package QA remain historical evidence; the current images replace their old Replay Veil label and footer. Artwork refresh does not verify or publish a new extension ZIP.

The UI is captured from the production build through `scripts/preview-dashboard.ts` with an isolated storage mock. The Popup frame is rendered in the browser with Astryx and embeds the real 320 × 400 Popup. All authors, activity, strategy text and request diagnostics are synthetic. The capture fixtures contain no provider or S3 credentials and never call a provider. The strategy result is a local simulation; sample request-log successes are not evidence of a live provider check.

For future updates, inspect each image at full size and make sure the listing still describes the current app. Chrome's [Store listing guide](https://developer.chrome.com/docs/webstore/cws-dashboard-listing) specifies the icon, screenshot, and promotional tile fields; its [listing quality guide](https://developer.chrome.com/docs/webstore/best-listing) recommends screenshots of the current experience and a concise summary.
