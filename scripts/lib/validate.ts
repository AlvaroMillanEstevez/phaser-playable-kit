import {
  FAMILY_TOKENS,
  GOOGLE_EXIT_API_URL,
  getNetworkSpec,
  type BuildNetworkId,
  type NetworkFamily,
} from '../../src/core/networks/specs.ts';

export type Severity = 'error' | 'warning';

export interface Finding {
  readonly severity: Severity;
  readonly rule: string;
  readonly message: string;
}

export interface ValidateOptions {
  /** Store URLs of the playable: they appear in the code as `mraid.open` arguments. */
  readonly storeUrls: readonly string[];
}

/**
 * URLs that appear in Phaser as plain strings and are never requested: XML namespaces
 * for SVG and Phaser's console banner and default game URL.
 */
export const INERT_URLS = [
  'http://www.w3.org/2000/svg',
  'http://www.w3.org/1999/xhtml',
  'https://phaser.io',
] as const;

const URL_PATTERN = /\bhttps?:\/\/[^\s"'`<>()\\]+/g;

const count = (source: string, pattern: RegExp): number => source.match(pattern)?.length ?? 0;

const word = (token: string): RegExp =>
  new RegExp(`\\b${token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'g');

/** Markup only: scripts and styles removed, so code cannot trigger markup rules. */
function markupOf(html: string): string {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, (tag) =>
      tag.replace(/>[\s\S]*<\/script>/i, '></script>'),
    )
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '<style></style>');
}

/**
 * Static checks on a built playable: external URLs, network APIs, iframes, storage and
 * whether the CTA code matches the network. Errors fail the build; warnings are
 * reported only.
 */
export function validateBuild(
  html: string,
  network: BuildNetworkId,
  options: ValidateOptions,
): Finding[] {
  const spec = getNetworkSpec(network);
  const findings: Finding[] = [];
  const error = (rule: string, message: string): void => {
    findings.push({ severity: 'error', rule, message });
  };
  const warning = (rule: string, message: string): void => {
    findings.push({ severity: 'warning', rule, message });
  };
  const markup = markupOf(html);

  // External URLs.
  const allowed = (url: string): boolean =>
    INERT_URLS.some((inert) => url === inert || url.startsWith(`${inert}/`)) ||
    options.storeUrls.some((store) => url.startsWith(store)) ||
    (network === 'google' && url === GOOGLE_EXIT_API_URL);
  const external = [...new Set(html.match(URL_PATTERN) ?? [])].filter((url) => !allowed(url));
  for (const url of external) error('external-url', `external URL ${url}`);
  if (count(markup, /\b(?:src|href)\s*=\s*["']?\/\//gi) > 0) {
    error('external-url', 'protocol-relative src or href');
  }

  // Everything must be inlined.
  const fileRefs = [
    ...markup.matchAll(/<(?:script|link|img)\b[^>]*\b(?:src|href)\s*=\s*["']?([^"'\s>]+)/gi),
  ]
    .map((match) => match[1] ?? '')
    .filter((ref) => !ref.startsWith('data:') && ref !== GOOGLE_EXIT_API_URL);
  for (const ref of fileRefs) error('not-inlined', `reference to a separate file: ${ref}`);
  if (count(markup, /<script\b[^>]*\bsrc\s*=\s*["']?[^"'>]*mraid\.js/gi) > 0) {
    error('mraid-script', 'mraid.js script tag (the SDK injects MRAID; Meta and Moloco forbid it)');
  }

  // Network APIs.
  if (count(html, /\bfetch\s*\(/g) > 0) error('fetch', 'fetch() call');
  for (const api of ['WebSocket', 'EventSource', 'sendBeacon']) {
    if (count(html, word(api)) > 0) error('network-api', `${api} reference`);
  }
  const forbidden = spec.forbiddenTokens ?? [];
  const xhr = count(html, word('XMLHttpRequest'));
  if (xhr > 0 && !forbidden.includes('XMLHttpRequest')) {
    warning(
      'xhr',
      `XMLHttpRequest referenced ${xhr} time(s) (Phaser's loader; unused for inlined assets)`,
    );
  }

  // Iframes.
  if (count(html, /<iframe\b/gi) + count(html, /createElement\(\s*[`'"]iframe/gi) > 0) {
    error('iframe', 'iframe');
  }

  // Storage and identifiers.
  if (count(html, /\bdocument\.cookie\b/g) > 0) error('cookie', 'document.cookie');
  for (const api of ['localStorage', 'sessionStorage', 'indexedDB']) {
    const uses = count(html, word(api));
    if (uses > 0 && !forbidden.includes(api)) {
      warning('storage', `${api} referenced ${uses} time(s) (Phaser feature detection)`);
    }
  }

  // Tokens this network forbids.
  for (const token of forbidden) {
    const uses = count(html, word(token));
    if (uses > 0)
      error('forbidden-token', `${token} appears ${uses} time(s); ${spec.name} forbids it`);
  }

  // CTA must match the network, and no other network's API may be bundled.
  for (const token of FAMILY_TOKENS[spec.family]) {
    if (count(html, word(token)) === 0) {
      error('cta', `missing "${token}" needed by ${spec.name}'s CTA`);
    }
  }
  const others = (Object.keys(FAMILY_TOKENS) as NetworkFamily[]).filter((f) => f !== spec.family);
  for (const family of others) {
    const [marker] = FAMILY_TOKENS[family];
    if (marker && marker !== 'exit' && count(html, word(marker)) > 0) {
      error('cta', `contains "${marker}", which belongs to another network's CTA`);
    }
  }

  // Google markup rules.
  if (network === 'google') {
    if (!html.includes(GOOGLE_EXIT_API_URL))
      error('google-exitapi', 'exitapi.js missing in <head>');
    if (count(markup, /<meta\s+name=["']ad\.(?:orientation|size)["']/gi) === 0) {
      error('google-orientation', 'ad.orientation meta tag missing');
    }
    if (count(markup, /<[a-z][^<>]*\/>/gi) > 0) error('self-closing', 'self-closing tag in markup');
  }

  return findings;
}
