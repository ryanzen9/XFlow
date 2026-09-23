# Project page

The project website is authored in React and TypeScript under `site/src/`. Bun server-renders the landing page and Chinese and English privacy policies into standalone HTML, then bundles the small client entry for page interactions. GitHub Pages publishes the generated `site-dist/` directory.

## Preview

Run the Bun preview server from the repository root:

```sh
bun run preview:site
```

The script builds the website before starting the local preview server. No API key or provider request is needed.

## Source and build

- `site/src/app.tsx` owns the home page and policy page shell. `site/src/pages/PrivacyPolicy.tsx` contains the full Chinese and English policies as React components.
- `site/src/components/` contains the React Refracted Beams canvas, Split Text Reveal headline, and Shimmer Button. Motion follows the shared duration and easing tokens, and respects reduced-motion settings.
- `site/src/site.css` styles the site using the shared design tokens from `src/styles/token.css`; the three lilac beam values follow the RewampUI Refracted Beams reference.
- `scripts/build-site.ts` renders all three pages with React DOM Server, bundles `site/src/client.tsx` with Bun, copies the shared tokens and stylesheet, and writes the old privacy route aliases.
- `scripts/preview-site.ts` serves the generated `site-dist/` output.
- `.github/workflows/deploy-pages.yml` installs the locked Bun dependencies, builds the React site, and uploads `site-dist/` to GitHub Pages.

The landing page keeps five visual groups: the wordmark, the hero copy, the GitHub action, the privacy link, and the ambient beam background. The legal pages retain full policy text and can be read without client-side JavaScript.

## GitHub Pages

The expected URLs are:

- Website: <https://ryanzen9.github.io/XFlow/>
- Chinese privacy policy: <https://ryanzen9.github.io/XFlow/privacy.html>
- English privacy policy: <https://ryanzen9.github.io/XFlow/privacy-en.html>

After merging, set **Settings → Pages → Build and deployment → Source** to **GitHub Actions**. The workflow publishes changes to the site, its shared tokens, the build script, locked dependencies, or deployment workflow. The build job needs the Pages configuration permission, and the deployment job needs the repository's GitHub Pages environment and Pages / Actions permissions enabled.
