# English store listing · XFlow 0.1.0

## Name

XFlow

## Short description

Filter distracting X posts and replies with your own rules and Jev provider. Reveal veiled content anytime.

## Detailed description

XFlow helps you read X / Twitter with intention. It evaluates visible posts in the Home timeline and replies against filtering strategies you create. When a post matches, XFlow covers it with a veil that you can reveal.

Choose a Jev provider from OpenRouter, Vercel AI Gateway, or TypeSafe and supply your own API key. For a filtering decision, XFlow sends the post ID and text plus applicable strategy names and criteria to the selected provider. Provider use may incur third-party charges. Failed requests are not automatically forwarded to another provider.

Use the Popup to control Home and reply filtering, then open the Dashboard to edit strategies, preview veil styles, review Activity, and manage your provider key. Activity is stored locally. You can clear log details or clear Activity data from the Dashboard.

Optional S3 sync lets you use an endpoint you configure to sync filtering configuration and Activity across devices. It runs only after you configure the endpoint, grant access, and enable sync. The sync document excludes provider API keys and S3 credentials; it can include strategy text, post previews, authors, URLs, and Activity status. You can leave S3 sync off.

XFlow is an independent project. It is not affiliated with, endorsed by, or sponsored by X Corp., OpenRouter, Vercel, or TypeSafe. Their names identify compatible services only.

Privacy policy: https://ryanzen9.github.io/XFlow/privacy-policy/

## Single purpose · Privacy practices

XFlow evaluates visible X / Twitter posts in the Home timeline and replies against user-created filtering strategies through the user's selected Jev provider, then displays a revealable veil over matching content.

## What's new in 0.1.0

Initial Chrome Web Store release: configurable Home and reply filtering, revealable veils, strategy editor with a local preview, Activity dashboard, three selectable Jev providers, and optional user-configured S3 sync. Requires Chrome 123 or newer and the user's own provider API key for filtering decisions; provider charges may apply.

## Editorial checks

- Short description: 107 characters, below the Chrome Web Store 132-character limit.
- The copy describes only existing behavior; the local preview is identified as a simulation.
- The provider key and potential third-party charges are explicit.
- The independent-project disclaimer covers X Corp. and all three provider brands.
