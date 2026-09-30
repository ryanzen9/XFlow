# Stage 5 release ZIP QA · 2026-09-28

## Scope and artifact

The publisher confirmed that they manually tested the other stage 5 functional flows. This run focused on loading the exact release ZIP as an unpacked extension, inspecting Chrome errors and consoles, and scanning the packaged bytes. The publisher's functional result is recorded as a report from them, not as an independent result from this run.

| Item                      | Result                                                             |
| ------------------------- | ------------------------------------------------------------------ |
| Source commit             | `3a24eeb` (`codex/chrome-web-store-release`)                       |
| Archive                   | `output/release/xflow-0.1.0.zip`                                   |
| SHA-256                   | `d35b9f2165381ef97c3c5ae4e3271a2364a6ec5abd96c76304cb0d4fc5f17916` |
| Size / files              | 1,129,455 bytes / 18 files                                         |
| Browser used for this run | Google Chrome for Testing `151.0.7922.77` (arm64, macOS)           |
| Loaded extension ID       | `ncffgodckgopodkgifadjhpojgcmmfbe`                                 |

`bun run release:check` passed, including `bun run check` (198 tests, 647 assertions and production build), then packaged the release. `bun run release:verify` produced byte-identical artifacts from two clean builds. `shasum -a 256 -c` and `unzip -t` passed. The ZIP was extracted to an isolated temporary directory; Chrome loaded **that extracted directory** and displayed XFlow `0.1.0` as an enabled unpacked extension. This test ID is tied to the temporary path/profile and should not be treated as the future Web Store item ID.

## Chrome error and console checks

- Chrome's extension details reported `state: ENABLED`, `location: UNPACKED`, `manifestErrors: []` and `runtimeErrors: []` after the extension was reloaded and its pages were opened. The Service Worker appeared in the inspectable views after the pages activated it.
- Popup and Dashboard opened from the `chrome-extension://` origin. Both produced empty `agent-browser errors` and `console` arrays. After clearing the request log and reloading both pages, 12 extension-origin requests were recorded with no failed status or request failure.
- A temporary, synthetic `https://x.com/home` HTML response was used solely to load the Content Script in the isolated test browser. Its page error and console arrays were empty. This was not a live X account or a repeat of the publisher's functional test.
- No CSP violation, permission error, missing extension resource, or uncaught exception appeared in these observed Chrome records. The check covers the startup/pages exercised here; it is not a claim about every possible user interaction.

Chrome Stable `153.0.8010.53` ignored command-line `--load-extension` in this environment. The automated unpacked-load evidence above therefore comes from Chrome for Testing. The publisher separately reported completing the remaining manual stage 5 flows; this report does not imply that this run independently loaded the ZIP into Chrome Stable.

## Packaged-byte scan

The exact extracted 18-file tree passed the repository's `planRelease` checks with zero issues. These checks reject unexpected files, missing manifest/page references, remote page scripts or styles, `eval`, `new Function`, `importScripts`, development localhost origins, source-map references and `.map` files. A separate text scan found zero matches for AWS access key IDs, OpenRouter-style keys, long generic `sk-` tokens, GitHub tokens, private-key blocks, and assigned AWS/S3 secret variables. Pattern scans cannot prove that an arbitrary secret string is absent, but no defined credential pattern matched this archive.

The temporary browser profile, extracted files, synthetic fixture, and scan script are outside the repository. No browser trace, screenshot, test credential, or release ZIP is committed.
