# XFlow 0.1.1 release ZIP QA · 2026-09-30

## Exact package

| Item                  | Result                                                             |
| --------------------- | ------------------------------------------------------------------ |
| Source commit         | `cd58cb1` (`codex/pr-9-review-followup`)                           |
| Archive               | `output/release/xflow-0.1.1.zip`                                   |
| SHA-256               | `8aa3172518e202685b7a3814356f99ba84b825d88242427716ec64ed6e1b5174` |
| Size / entries        | 1,131,611 bytes / 18 files                                         |
| Isolated browser      | Chromium 151 (agent-browser on macOS)                              |
| Temporary unpacked ID | `dcnakejeiccciaeiabjkccgemepolmmh`                                 |

`bun run release:check` passed with 209 tests and the production package assertions. `bun run release:verify` produced byte-identical ZIP, checksum, and file list across two clean builds. `shasum -a 256 -c` and `unzip -t` passed. The ZIP was extracted to an isolated temporary directory; the browser loaded **that extracted directory**, not the source tree. This temporary extension ID is path-specific and is not the Chrome Web Store item ID.

## Browser startup and resources

- Chrome reported `version: 0.1.1`, `state: ENABLED`, `location: UNPACKED`, `manifestErrors: []`, and `runtimeErrors: []`.
- Popup and Dashboard rendered from the `chrome-extension://` origin. Their observed page `errors` and `console` arrays were empty.
- Ten extension-origin requests were recorded while opening those pages, with no failed status or request failure.
- No CSP violation, permission error, missing resource, or uncaught exception appeared in these startup checks.

This was a package and startup check. It did not repeat the publisher's live X account, provider, S3, or full interaction tests. The earlier [`0.1.0` stage 5 report](stage-5-qa.md) is historical evidence for a different ZIP.

## Packaged-byte scan

The release gate rejected remote executable references, dynamic execution, localhost origins, source maps, unexpected files, invalid locale messages, and malformed icons. A separate scan of 12 packaged text files found no AWS access key ID, OpenRouter-style key, long generic `sk-` token, GitHub token, private-key block, or assigned AWS/S3 secret value. Pattern scans cannot prove that every possible credential form is absent.

Before submitting the Store update, replace the third `0.1.0` screenshot, which shows the old **Replay Veil** label, and confirm the Dashboard metadata matches the `0.1.1` package. The temporary browser profile and extracted files were removed after this check; no trace, screenshot, test credential, or ZIP was committed.
