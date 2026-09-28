# Chrome Web Store listing kit · XFlow 0.1.0

This directory contains the store copy and upload-ready artwork for PR #9, stage 3. The English listing is the primary draft; `listing.zh-CN.md` carries the equivalent Simplified Chinese copy. Final language, regions, and visibility are tracked as stage 0 decisions in [`../pull-request/9.md`](../pull-request/9.md).

## Copy into Developer Dashboard

| Dashboard area                                        | Source                                             |
| ----------------------------------------------------- | -------------------------------------------------- |
| Store listing · English                               | [`listing.en.md`](listing.en.md)                   |
| Store listing · Simplified Chinese                    | [`listing.zh-CN.md`](listing.zh-CN.md)             |
| Privacy practices, permissions, reviewer instructions | [`dashboard-fields.md`](dashboard-fields.md)       |
| Privacy policy URL                                    | `https://ryanzen9.github.io/XFlow/privacy-policy/` |
| Support URL                                           | `https://github.com/ryanzen9/XFlow/issues`         |

The description is written for version `0.1.0`. Recheck all copy against the final ZIP before submitting the item, especially if the version, providers, permissions, or S3 behavior changes.

The exact release ZIP's unpacked-load, console, and packaged-byte scan results are recorded in [`stage-5-qa.md`](stage-5-qa.md).

## Upload-ready artwork

| Order / field          | File                                                                   | Dimensions     | What it shows                                              |
| ---------------------- | ---------------------------------------------------------------------- | -------------- | ---------------------------------------------------------- |
| Store icon             | [`assets/store-icon-128.png`](assets/store-icon-128.png)               | 128 × 128 PNG  | The same XFlow mark used by the extension                  |
| Screenshot 1           | [`assets/01-popup.png`](assets/01-popup.png)                           | 1280 × 800 PNG | Actual dark-mode Popup in a monochrome presentation frame  |
| Screenshot 2           | [`assets/02-activity-dashboard.png`](assets/02-activity-dashboard.png) | 1280 × 800 PNG | Actual dark-mode Activity trend and weekly review          |
| Screenshot 3           | [`assets/03-strategy-and-veil.png`](assets/03-strategy-and-veil.png)   | 1280 × 800 PNG | Actual dark-mode strategy editor and local veil simulation |
| Small promotional tile | [`assets/small-promo-440x280.png`](assets/small-promo-440x280.png)     | 440 × 280 PNG  | Text-light monochrome brand art                            |

The optional 1400 × 560 marquee tile is deliberately omitted. It is not needed for the initial listing. Screenshots are English-language UI captures. A localized Chinese screenshot set can be added later; do not label these English screenshots as Chinese screenshots in the Dashboard.

The UI was captured from the production build through `scripts/preview-dashboard.ts` with a local storage mock. A temporary preview-only change served the bundled logos; it is not part of the extension or this commit. Activity records, strategy text, and the nonworking `DEMO-KEY-NOT-VALID` value existed only in the temporary browser session. No account name, real post, real API key, S3 credential, or browser trace is present in these assets. The third screenshot explicitly shows the built-in **Local simulation**, not a live provider decision.

Before uploading, inspect each image at full size and make sure the listing still describes the current app. Chrome's [Store listing guide](https://developer.chrome.com/docs/webstore/cws-dashboard-listing) specifies the icon, screenshot, and promotional tile fields; its [listing quality guide](https://developer.chrome.com/docs/webstore/best-listing) recommends screenshots of the current experience and a concise summary.
