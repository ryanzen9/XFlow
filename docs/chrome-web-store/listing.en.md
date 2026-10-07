# English store listing · XFlow 0.1.1

## Name

XFlow

## Short description

Jev For your X: Filter ads and other unwanted content in X timelines and replies with custom policies.

## Detailed description

XFlow (Jev For your X) helps you filter ads, promotions, and other unwanted content in X / Twitter Home timelines and replies. Its default strategies target promotions and spam; you can customize the rules, thresholds, and priority for each area. Matching posts can be shown again whenever you choose.

Choose a Jev provider from OpenRouter, Vercel AI Gateway, or TypeSafe and supply your own API key. For a filtering decision, XFlow sends the post ID and text plus applicable strategy names and criteria to the selected provider. Provider use may incur third-party charges. Failed requests are not automatically forwarded to another provider.

Use the Popup to control Home and reply filtering, then open the Dashboard to edit strategies, preview how filtered posts appear, review Activity, and manage your provider key. Activity is stored locally and can optionally be synced to your S3 endpoint. You can clear log details or clear Activity data from the Dashboard; these controls do not erase separate feedback rules.

Provider health checks run only when you request them and may incur provider usage. Local request diagnostics keep only provider, model, duration, counts and outcome for up to 30 days or 200 entries. They can be cleared separately and are not synced to S3.

Optional S3 sync lets you use an endpoint you configure to sync filtering configuration, Activity, and durable user-feedback rules across devices. It runs only after you configure the endpoint, grant access, and enable sync. The sync document excludes provider API keys, S3 credentials, and semantic embeddings; it can include strategy text, post previews, authors, URLs, Activity status, normalized post text, semantic tokens, post and author IDs, decisions, and device IDs. Feedback rules have no automatic expiration in 0.1.1. You can leave S3 sync off.

XFlow is an independent project. It is not affiliated with, endorsed by, or sponsored by X Corp., OpenRouter, Vercel, or TypeSafe. Their names identify compatible services only.

Privacy policy: https://ryanzen9.github.io/XFlow/privacy-en.html

## Single purpose · Privacy practices

XFlow filters ads, promotions, and other unwanted X / Twitter posts in Home timelines and replies using configurable strategies and the user's selected Jev provider. Users can show matching posts again.

## What's new in 0.1.1

Astryx Neutral interfaces with a compact Popup, a dedicated filtering overview, clearer icon actions and responsive strategy controls. API Keys now offers an explicit provider health check; the Log page shows local request diagnostics with a separate clear action. Diagnostics retain only metadata for up to 30 days or 200 entries and are not synced to S3. Health checks may incur provider usage. English and Chinese disclosures and current preview screenshots have been refreshed.

## Editorial checks

- Short description: 102 characters, below the Chrome Web Store 132-character limit.
- Ad filtering depends on the user's strategies; the copy does not promise to remove every ad.
- The copy describes only existing behavior; the local preview is identified as a simulation.
- The provider key and potential third-party charges are explicit.
- The independent-project disclaimer covers X Corp. and all three provider brands.
