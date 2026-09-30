# Chrome Web Store listing kit · XFlow 0.1.0

This directory contains the store copy, icon, and promotional artwork prepared for PR #9, stage 3. The English listing is the primary draft; `listing.zh-CN.md` carries the equivalent Simplified Chinese copy. Final language, regions, and visibility are tracked as stage 0 decisions in [`../pull-request/9.md`](../pull-request/9.md).

## Copy into Developer Dashboard

| Dashboard area                                        | Source                                          |
| ----------------------------------------------------- | ----------------------------------------------- |
| Store listing · English                               | [`listing.en.md`](listing.en.md)                |
| Store listing · Simplified Chinese                    | [`listing.zh-CN.md`](listing.zh-CN.md)          |
| Privacy practices, permissions, reviewer instructions | [`dashboard-fields.md`](dashboard-fields.md)    |
| Privacy policy URL                                    | `https://ryanzen9.github.io/XFlow/privacy.html` |
| Support URL                                           | `https://github.com/ryanzen9/XFlow/issues`      |

The description is written for version `0.1.0`. The public listing currently shows only the short bilingual overview, so the detailed copy here remains a proposed Dashboard update. Recheck all copy against the released package before submitting a metadata change, especially if the version, providers, permissions, or S3 behavior changes.

The exact release ZIP's unpacked-load, console, and packaged-byte scan results are recorded in [`stage-5-qa.md`](stage-5-qa.md).

## Store artwork

| Order / field          | File                                                               | Dimensions     | What it shows                                              |
| ---------------------- | ------------------------------------------------------------------ | -------------- | ---------------------------------------------------------- |
| Store icon             | [`assets/store-icon-128.png`](assets/store-icon-128.png)           | 128 × 128 PNG  | The same XFlow mark used by the extension                  |
| Screenshot 1           | `01-popup.png`                                                     | 1280 × 800 PNG | Actual dark-mode Popup in a monochrome presentation frame  |
| Screenshot 2           | `02-activity-dashboard.png`                                        | 1280 × 800 PNG | Actual dark-mode Activity trend and weekly review          |
| Screenshot 3           | `03-strategy-and-veil.png`                                         | 1280 × 800 PNG | Actual dark-mode strategy editor and local veil simulation |
| Small promotional tile | [`assets/small-promo-440x280.png`](assets/small-promo-440x280.png) | 440 × 280 PNG  | Text-light monochrome brand art                            |

The three screenshots were uploaded to the Chrome Web Store but are not tracked in Git, following the repository rule against committed screenshots. During the PR #9 review follow-up, copies were preserved in the review worktree's ignored `output/store-assets/` directory. The optional 1400 × 560 marquee tile is deliberately omitted. Screenshots are English-language UI captures; do not label them as Chinese screenshots in the Dashboard.

The UI was captured from the production build through `scripts/preview-dashboard.ts` with a local storage mock. A temporary preview-only change served the bundled logos; it is not part of the extension or this commit. Activity records, strategy text, and the nonworking `DEMO-KEY-NOT-VALID` value existed only in the temporary browser session. No account name, real post, real API key, S3 credential, or browser trace is present in these assets. The third screenshot explicitly shows the built-in **Local simulation**, not a live provider decision.

For future updates, inspect each image at full size and make sure the listing still describes the current app. Chrome's [Store listing guide](https://developer.chrome.com/docs/webstore/cws-dashboard-listing) specifies the icon, screenshot, and promotional tile fields; its [listing quality guide](https://developer.chrome.com/docs/webstore/best-listing) recommends screenshots of the current experience and a concise summary.
