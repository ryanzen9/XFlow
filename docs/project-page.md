# Project page

The static project website introduces XFlow, links to the repository and privacy policy, and includes a lightweight Refracted Beams demonstration.

## Preview

Run the Bun preview server from the repository root:

```sh
bun run preview:site
```

Then open the local URL printed by Bun. The server reads directly from `site/`; no install, build, API key, or provider request is needed.

## Files

- `site/index.html` is the five-item landing page: one short label, one headline, one description, and two links.
- `site/privacy.html` and `site/privacy-en.html` publish the Chinese and English privacy policies. Compatibility pages retain the previous `/privacy-policy/` and `/privacy-policy/zh-CN/` routes.
- `site/assets/refracted-beams.js` draws the ambient canvas effect without third-party runtime packages. Its sparse diagonal beams follow the visual direction of [RewampUI's Refracted Beams](https://www.rewampui.com/components/refracted-beams), use the shared foreground token, and pause when the document is hidden or reduced motion is enabled.
- `src/styles/token.css` is copied into the published static artifact as `site/assets/tokens.css`, so the site uses the extension's shared color, type, spacing, radius, and motion roles without maintaining a second palette.
- The two landing-page links use the high-contrast paired action style shown on the [RewampUI home page](https://www.rewampui.com/), implemented as native anchors.
- `.github/workflows/deploy-pages.yml` publishes the contents of `site/` to GitHub Pages after a change lands on `main`.

## GitHub Pages

The expected URLs are:

- Website: <https://ryanzen9.github.io/XFlow/>
- Chinese privacy policy: <https://ryanzen9.github.io/XFlow/privacy.html>
- English privacy policy: <https://ryanzen9.github.io/XFlow/privacy-en.html>

The repository currently publishes its Pages source from the `codex/chrome-web-store-release` branch's `docs/` folder. After this change is merged, switch **Settings → Pages → Build and deployment → Source** to **GitHub Actions** to use the new workflow. Then pushes to `main` that change the site, shared design tokens, site build script, or deployment workflow publish the static files. The build job needs the Pages configuration permission, and the deployment job needs the repository's GitHub Pages environment and Pages / Actions permissions enabled.
