---
layout: default
title: XFlow Privacy Policy
permalink: /privacy-policy/
---

# XFlow Privacy Policy

**Effective date: September 23, 2026**  
**Applies to: XFlow browser extension 0.1.0**  
**Publisher: Ryan Zeng**

[简体中文版](https://ryanzen9.github.io/XFlow/privacy-policy/zh-CN/)

XFlow helps you evaluate and veil content in X / Twitter timelines and replies using rules you create. This policy explains what the extension processes, where data goes, and how to delete it. The XFlow project does not operate a developer server that receives post content, filter activity, or credentials. The extension connects directly to the third-party services you choose.

## Data processed and why

| Data                                                                            | Purpose and location                                                                                                                                                                                                                                                                                   |
| ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| IDs and text of visible posts on X / Twitter                                    | Used to evaluate posts against enabled filtering strategies when you enable the relevant surface and configure a Provider Key. The extension processes supported X / Twitter pages, not your browsing history on other sites.                                                                          |
| Strategy names, criteria, and related settings                                  | Used to form evaluation requests and present results; settings are stored locally in the browser.                                                                                                                                                                                                      |
| Filter activity                                                                 | Recorded only after content is actually veiled. It may include a content ID, a text preview of up to 500 characters, author, X post URL, surface, media type, filter time, device identifier, matched strategy, and reveal or incorrect status. Activity and totals are stored locally in the browser. |
| Provider API Key                                                                | Stored in the extension's `chrome.storage.local` and used to authenticate requests to your selected Provider.                                                                                                                                                                                          |
| S3 Endpoint, Bucket, Object Key, access credentials, and optional Session Token | Stored in `chrome.storage.local` only if you configure S3 sync; used to sign and send requests to the Endpoint you specify.                                                                                                                                                                            |
| Interface language, theme, and other settings                                   | Used to provide the extension and its interface. Interface language stays local and is not part of the S3 sync document.                                                                                                                                                                               |

XFlow does not read X login cookies or sessions or store page HTML, DOM, media files, or a complete browsing path. The current version has no ads, developer telemetry, or developer analytics service.

## Who receives data

**Your selected Jev Provider.** The extension sends post IDs and text, applicable strategy names and criteria, and that Provider's API Key only to the currently selected OpenRouter, Vercel AI Gateway, or TypeSafe service. The request is used to return a filtering decision. A failed request is not automatically forwarded to another Provider. The Provider and any upstream model services it uses process requests under their own terms and privacy policies. Before choosing one, review the [OpenRouter Privacy Policy](https://openrouter.ai/privacy/), [Vercel Privacy Notice](https://vercel.com/legal/privacy-notice) and [AI Product Terms](https://vercel.com/legal/ai-product-terms), or [TypeSafe Privacy Policy](https://typesafe.ai/legal/privacy-policy). Provider use may incur third-party charges.

**Your configured S3 Endpoint (optional).** The extension sends or reads a sync document only after you configure a connection, grant access to that Endpoint, and enable sync on the Data page. The document includes filter configuration (including strategies and prompts), activity records, and statistics. It can therefore contain post previews, authors, and X post URLs. It excludes Provider API Keys, S3 access credentials, and Session Tokens. Signed request headers give that Endpoint the Access Key ID and optional Session Token. The Secret Access Key is used locally to create the signature and is not sent directly. The extension syncs when enabled and attempts sync after configuration changes, at browser startup, and about every 15 minutes. Storage, backup, and retention at the S3 service depend on the service and account you choose.

Apart from these necessary transfers, the XFlow project does not sell this data, use it for advertising, or provide it to other recipients. Information you voluntarily put in a public issue or support exchange is handled by the relevant platform; do not submit keys or sensitive post content.

## Retention and deletion

- Activity details are kept for about 30 days; then text previews, authors, URLs, and strategy details are removed. Content identities used for deduplication remain for up to about 12 weeks before being folded into per-device lifetime counts. The extension applies these limits when activity data is read or updated. They do not delete data held by third parties.
- Use **Clear logs** on the Dashboard's Log page to remove authors, text previews, original links, and matched strategies immediately. Content identifiers, daily statistics, and all-time totals remain. If S3 sync is enabled, the extension attempts to sync this cleared state.
- Use **Clear Activity Data** on the Dashboard's General page to remove local activity details and totals. If S3 sync is enabled, the extension attempts to propagate the cleared state to the remote document so older records do not return on a later sync. Updating the remote copy requires a successful connection.
- Clear each local Provider Key on the API Keys page. Clearing a key locally does not revoke it at the Provider; you can revoke it in that Provider's console.
- Disable automatic S3 sync on the Data page. Disabling sync does not erase local S3 connection settings or an object already written to S3. To remove the remote copy, delete the object in your S3 service and check its versions and backups.
- Uninstalling the extension lets the browser remove local extension data. Data already processed or stored by a Provider or S3 service must be managed separately under that service's policy and account controls.

## Security and permissions

Connections to Providers and S3 Endpoints in normal use use HTTPS. Provider Keys and S3 credentials are not exposed to Content Scripts on X pages and are not included in editable configuration JSON or new S3 sync documents. They receive **no additional encryption at rest** in `chrome.storage.local`; someone with access to your browser profile may be able to obtain this local data. Protect your browser profile, Provider accounts, and S3 credentials.

X / Twitter page access lets the extension read posts to evaluate and display revealable veils. Provider host access supports your selected evaluation service. You grant access to an S3 host separately when saving its Endpoint. The `storage` permission stores the local data described above; `alarms` supports scheduled sync after you enable S3.

## Chrome Web Store Limited Use

XFlow's use of information obtained from the browser and Chrome extension APIs complies with the [Limited Use requirements of the Chrome Web Store User Data Policy](https://developer.chrome.com/docs/webstore/program-policies/limited-use). It processes only data needed for the user-facing filtering, activity, and user-selected sync features described above; transfers data only to provide those features; and does not sell data or use it for personalized or targeted advertising. XFlow developers cannot read local extension data by default. A person may review data you specifically provide for support, or as otherwise permitted for legal or security reasons under the policy.

## Changes and contact

If data practices change materially, the project will update this policy and notify users in the extension interface or release notes. The effective date at the top identifies this version.

For privacy, deletion, or policy questions, email [ry4nzeng@gmail.com](mailto:ry4nzeng@gmail.com) or contact the project maintainers through [XFlow GitHub Issues](https://github.com/ryanzen9/XFlow/issues). Do not post keys or sensitive content in public issues.
