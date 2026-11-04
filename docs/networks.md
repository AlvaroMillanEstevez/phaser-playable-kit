# Network requirements

This file records what each ad network requires, where that information came from
and which limit the kit enforces. **When sources disagree, the kit applies the
strictest limit** and notes it here.

Last verified: 2026-11-04. Network rules change often: re-check the official pages
before shipping a campaign.

Sizes are enforced in bytes with decimal megabytes (1 MB = 1,000,000 bytes), which
is stricter than the binary interpretation (1 MiB = 1,048,576 bytes).

| Network   | Status    | Output          | Enforced limit | CTA call                    | Adapter    |
| --------- | --------- | --------------- | -------------- | --------------------------- | ---------- |
| AppLovin  | supported | single HTML     | 5,000,000 B    | `mraid.open(url)`           | `applovin` |
| Unity Ads | supported | single HTML     | 4,999,999 B    | `mraid.open(url)`           | `unity`    |
| Google    | supported | ZIP (512 files) | 5,000,000 B    | `ExitApi.exit()`            | `google`   |
| Meta      | supported | single HTML     | 2,000,000 B    | `FbPlayableAd.onCTAClick()` | `meta`     |
| Moloco    | testing   | single HTML     | 4,999,999 B    | `FbPlayableAd.onCTAClick()` | `moloco`   |
| Liftoff   | testing   | single HTML     | 5,000,000 B    | `mraid.open(url)`           | `liftoff`  |
| Mintegral | planned   | ZIP             | 5,000,000 B    | `window.install()`          | —          |
| TikTok    | planned   | ZIP + config    | 3,000,000 B    | `window.openAppStore()`     | —          |

Rules shared by every network and enforced by the kit:

- No runtime network requests. All code and assets are inlined.
- No personal data, user or device identifiers. The runtime only emits anonymous
  in-ad events (`start`, `interaction`, `end`, `cta`) and never sends them anywhere.
- Audio stays muted until the first user interaction and stops while the ad is hidden.
- No store redirect without user interaction, and never on the player's first tap:
  the CTA is ignored until the game reports a gameplay interaction.
- No custom close button.

## AppLovin

Sources:

- [AppLovin – Creative best practices & guidelines](https://support.applovin.com/en/growth/promoting-your-apps/creatives/best-practices-and-guidelines) (official)
- [AppLovin ORTB – Creative types](https://support.axon.ai/en/max/demand-partners/demand-side-platforms/applovin-ortb-specification/creative-types) (official, older)

Requirements:

- One HTML file of at most 5 MB, resources embedded as base64. External resources and
  external network calls are prohibited.
- MRAID 2.0. Wait for the `ready` event (or `mraid.getState() !== 'loading'`) before
  calling any MRAID API or making layout decisions.
- Click-through with `mraid.open()`.
- Must work in portrait and landscape.
- Audio muted until first interaction; stop or mute when the ad closes or is hidden.
- First tap must not send users to the store; no auto-redirects.
- If WebGL is used, provide a fallback when the context fails or is lost.

Notes:

- The older ORTB page says `mraid.open` is only supported for click trackers. The newer
  guidelines page requires it for click-through, so the kit follows the newer page.
- The pages do not say whether to include a `<script src="mraid.js">` tag. The kit does
  not include it (the SDK webview injects MRAID); verify in the AppLovin playable preview
  tool before a real campaign.

## Unity Ads

Source: [Unity – Playable asset specifications](https://docs.unity.com/en-us/grow/acquire/creatives/playable/specifications) (official)

Requirements:

- A single `index.html`, **less than** 5 MB (the kit enforces 4,999,999 bytes). Every
  asset inlined as base64; no relative paths or remote URLs.
- No network requests at runtime. Analytics may be allowed but must not contain user or
  device identifiers. The playable must not fire its own attribution events.
- MRAID 3.0, full screen only. Do **not** include an MRAID script tag: the webview injects
  it. `expand`, `resize`, `sms`, `tel`, `calendar`, `storePicture` and custom close
  buttons are unsupported.
- Start only after `ready` **and** when `mraid.isViewable()` is true; listen to
  `viewableChange` to pause and resume. Do not start content on page load.
- Prefer Web Audio (respects the iOS mute switch). Stop audio when not viewable.
- `mraid.open` only, only from a player tap on a CTA, after gameplay interaction. No
  redirect on the first tap, no deceptive redirects. Detect Android from the user agent
  and treat everything else as iOS.
- One responsive build for portrait and landscape (single-orientation is deprecated).
- Keep interactive content out of the top and bottom bands used by Unity's UI.

## Google Ads (App campaigns)

Source: [Google Ads – About HTML5 for App campaigns](https://support.google.com/google-ads/answer/7584219?hl=en) (official)

Requirements:

- A `.zip` of at most 5 MB containing at most 512 files, UTF-8.
- In `<head>`:
  `<script type="text/javascript" src="https://tpc.googlesyndication.com/pagead/gadgets/html5/api/exitapi.js"></script>`
  and call `ExitApi.exit()` from the click handler. Without it Google adds its own
  install button.
- Orientation meta tag in `<head>`: `<meta name="ad.orientation" content="portrait">`
  (`landscape` or `portrait,landscape` also valid).
- DOCTYPE, `<html>`, `<body>` and explicit closing tags (no self-closing `<path />`).
- All references relative to files in the ZIP; the only external references allowed are
  Google-hosted libraries.
- Local storage methods cannot be used. Sound must not play before user interaction.

Notes:

- **The `exitapi.js` script is the only external URL the kit allows in any build**,
  because Google requires it. The static validator allowlists this exact URL for the
  `google` network only.
- The kit avoids `iframe` and `localStorage` for every network.

## Meta (Facebook / Instagram)

Sources:

- [Meta – Playable asset specifications](https://www.facebook.com/business/help/412951382532338) (official, returned HTTP 403 to automated fetch on 2026-11-04)
- [PlayCanvas – Facebook Playable Ads](https://developer.playcanvas.com/user-manual/publishing/playable-ads/fb-playable-ads) (secondary)
- [Playable Ads Maker – Meta specs](https://playableadsmaker.com/ad-networks/meta) (secondary)

Requirements (as reported by the secondary sources):

- Single HTML of at most 2 MB, or a ZIP of at most 5 MB whose `index.html` is also under
  2 MB (one source mentions a 100-file cap).
- CTA through `FbPlayableAd.onCTAClick()`. No `mraid.js`. No JavaScript redirects.
- No dynamic asset loading over the network.

Notes:

- The kit ships Meta as single HTML with the strictest 2,000,000-byte limit.
- `FbPlayableAd` only exists inside Meta's Playable Preview tool, so local tests use a mock.

## Moloco

Sources:

- [Moloco – Playable and Interactive End Card creative guide](https://help.moloco.com/hc/articles/24124525963799) (official, read via search summary; returned HTTP 403 to direct fetch)
- [Segwise – Playable ad specs by network](https://segwise.ai/blog/playable-ad-specs-by-network-2026) (secondary)

Requirements:

- Must **not** include `mraid.js`.
- Call `FbPlayableAd.onCTAClick()` with no parameters.
- Must **not** contain the `XMLHttpRequest` object.
- Single HTML under 5 MB (secondary source; the kit enforces 4,999,999 bytes).

Notes:

- Phaser's loader references `XMLHttpRequest`. See the validator output for the Moloco
  build; removing it is tracked in the roadmap (custom Phaser build).

## Liftoff

Sources:

- [Liftoff – Interactive Ad Integration](https://support.accelerate.liftoff.io/hc/en-us/articles/52724569196699-Interactive-Ad-Integration) (official, returned HTTP 403 to automated fetch)
- [Liftoff/Vungle – Dos and Don'ts of Adaptive Creative](https://support.vungle.com/hc/en-us/articles/360056663752-Dos-and-Don-ts-of-Adaptive-Creative) (official, returned HTTP 403)
- [Playable Ads Maker – Liftoff specs](https://playableadsmaker.com/ad-networks/liftoff) (secondary)

What could be confirmed (from search summaries of the official pages):

- Total size at most 5 MB.
- Wait for MRAID readiness before attaching click handlers; do not include a close button.
- Do not include a reference to `mraid.js` (Adaptive Creative injects MRAID).
- A "complete" event marks the end of the main experience (closest to `gameEnd`).

Notes:

- Sources disagree: one secondary source says Liftoff's DSP uses a `postMessage` bridge
  instead of MRAID. **Status stays "testing"** until verified against Liftoff's dashboard.
- Keep the top-left and top-right 50×50 px corners free of interactive UI (from the
  project's starting requirements table; not confirmed by an official page).

## Mintegral and TikTok (planned)

Not implemented in v0.1.0. Starting requirements to verify: Mintegral ZIP with all
assets base64, `window.install()` and `window.gameEnd()`, no loading screen or close
button of its own; TikTok/Pangle ZIP with `config.json`, `window.openAppStore()`,
3–5 MB (the kit will enforce 3 MB).
