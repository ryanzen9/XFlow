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

The three screenshots were uploaded for `0.1.0` but are not tracked in Git, following the repository rule against committed screenshots. During the PR #9 review follow-up, copies were preserved in the review worktree's ignored `output/store-assets/` directory. Screenshot 3 shows the earlier **Replay Veil** label and `XFlow / 0.1` footer; replace it with a current dark-mode capture before submitting `0.1.1`. The optional 1400 × 560 marquee tile is deliberately omitted. Screenshots are English-language UI captures; do not label them as Chinese screenshots in the Dashboard.

The UI was captured from the production build through `scripts/preview-dashboard.ts` with a local storage mock. A temporary preview-only change served the bundled logos; it is not part of the extension or this commit. Activity records, strategy text, and the nonworking `DEMO-KEY-NOT-VALID` value existed only in the temporary browser session. No account name, real post, real API key, S3 credential, or browser trace is present in these assets. The third screenshot explicitly shows the built-in **Local simulation**, not a live provider decision.

For future updates, inspect each image at full size and make sure the listing still describes the current app. Chrome's [Store listing guide](https://developer.chrome.com/docs/webstore/cws-dashboard-listing) specifies the icon, screenshot, and promotional tile fields; its [listing quality guide](https://developer.chrome.com/docs/webstore/best-listing) recommends screenshots of the current experience and a concise summary.
