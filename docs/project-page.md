# Project page

The project website is authored in React and TypeScript under `src/site/`, alongside the extension's other source code. Bun server-renders the landing page and Chinese and English privacy policies into standalone HTML, then bundles the small client entry for page interactions. GitHub Pages publishes the generated `site-dist/` directory.

## Preview

Run the Bun preview server from the repository root:

```sh
bun run preview:site
```

The script builds the website before starting the local preview server. No API key or provider request is needed.

## Source and build

- `src/site/app.tsx` owns the home page and policy page shell. `src/site/pages/PrivacyPolicy.tsx` contains the full Chinese and English policies as React components.
- The home page follows Astryx's `centered-hero` page template and `TopNavCenteredNavigation` block: centered headline, short copy, paired actions, and one wide product image. Layout, Stack, Section, Grid, Text, Button, and Link components own spacing and interaction. The feature columns reflow automatically; the center navigation yields on narrow screens and privacy remains available in the footer.
- `src/site/site.css` loads the Astryx reset, component styles, editable Neutral theme, and token-backed Tailwind bridge. It is compiled by the local Tailwind CLI. The site keeps its dark presentation and has no ambient animation or WebGL canvas.
- `scripts/build-site.ts` renders all three pages with React DOM Server, bundles `src/site/client.tsx` with Bun, compiles the stylesheet, copies the current strategy-editor demonstration screenshot and Figtree fonts, and writes the old privacy route aliases. Assets use relative paths so the GitHub Pages `/XFlow/` project prefix is preserved. Fonts are self-hosted; loading the page makes no font CDN request.
- `scripts/preview-site.ts` serves the generated `site-dist/` output.
- `.github/workflows/deploy-pages.yml` installs the locked Bun dependencies, builds the React site, and uploads `site-dist/` to GitHub Pages.

The primary action opens the published Chrome Web Store listing; the secondary action opens the GitHub source. The installation note explains that a Provider API Key is needed and model services may charge fees. The wide strategy editor preview uses `docs/assets/strategy-editor.webp`, refreshed together with the [version preview assets](previews/README.md). It is a real production UI capture with synthetic content and no credentials. The legal pages retain full policy text, share the Neutral shell, and can be read without client-side JavaScript. A skip link lets keyboard users reach the main content directly.

`bun run build:site` checks that the generated Neutral theme matches its editable source before building. `bun run check` also builds the website, so site CSS and asset failures are covered by the normal handoff gate.

The root TypeScript configuration excludes ignored `workspace/` sub-checkouts, matching the Bun test boundary, so checking this checkout does not also type-check another checkout with its own dependency versions.

## GitHub Pages

The expected URLs are:

- Website: <https://ryanzen9.github.io/XFlow/>
- Chinese privacy policy: <https://ryanzen9.github.io/XFlow/privacy.html>
- English privacy policy: <https://ryanzen9.github.io/XFlow/privacy-en.html>

After merging, set **Settings → Pages → Build and deployment → Source** to **GitHub Actions**. The workflow publishes changes to the site, its shared tokens, the build script, locked dependencies, or deployment workflow. The build job needs the Pages configuration permission, and the deployment job needs the repository's GitHub Pages environment and Pages / Actions permissions enabled.
