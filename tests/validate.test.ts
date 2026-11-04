import { describe, expect, it } from 'vitest';
import { GOOGLE_EXIT_API_URL, type BuildNetworkId } from '../src/core/networks/specs.ts';
import { validateBuild } from '../scripts/lib/validate.ts';

const STORE = 'https://kokeskill.itch.io/nusa-warung-sort';
const options = { storeUrls: [STORE] };

const CODE: Record<'mraid' | 'google' | 'fb', string> = {
  mraid: `g.mraid.isViewable();g.mraid.addEventListener("viewableChange",f);g.mraid.open("${STORE}")`,
  google: 'g.ExitApi.exit()',
  fb: 'g.FbPlayableAd.onCTAClick()',
};

function page(code: string, head = ''): string {
  return `<!doctype html><html><head>${head}<meta charset="UTF-8"><script type="module">${code}</script></head><body></body></html>`;
}

const GOOGLE_HEAD = `<meta name="ad.orientation" content="portrait"><script type="text/javascript" src="${GOOGLE_EXIT_API_URL}"></script>`;

const rules = (html: string, network: BuildNetworkId) =>
  validateBuild(html, network, options).map((f) => `${f.severity}:${f.rule}`);

describe('validateBuild', () => {
  it('accepts a clean build for each network family', () => {
    expect(rules(page(CODE.mraid), 'unity')).toEqual([]);
    expect(rules(page(CODE.fb), 'meta')).toEqual([]);
    expect(rules(page(CODE.google, GOOGLE_HEAD), 'google')).toEqual([]);
  });

  it('allows store URLs and inert Phaser strings', () => {
    const code = `${CODE.fb};x="http://www.w3.org/2000/svg";y="https://phaser.io/v400"`;
    expect(rules(page(code), 'meta')).toEqual([]);
  });

  it('fails on external URLs', () => {
    expect(rules(page(`${CODE.fb};load("https://cdn.example.com/a.png")`), 'meta')).toContain(
      'error:external-url',
    );
  });

  it('only allows exitapi.js on Google', () => {
    expect(rules(page(CODE.fb, GOOGLE_HEAD), 'meta')).toContain('error:external-url');
  });

  it('fails on files that are not inlined', () => {
    const html = page(CODE.fb).replace('<body>', '<body><img src="items/durian.webp">');
    expect(rules(html, 'meta')).toContain('error:not-inlined');
  });

  it('fails on a mraid.js script tag', () => {
    const html = page(CODE.mraid).replace('<head>', '<head><script src="mraid.js"></script>');
    expect(rules(html, 'applovin')).toContain('error:mraid-script');
  });

  it('fails on fetch, WebSocket, sendBeacon and iframes', () => {
    expect(rules(page(`${CODE.fb};fetch("/x")`), 'meta')).toContain('error:fetch');
    expect(rules(page(`${CODE.fb};new WebSocket(u)`), 'meta')).toContain('error:network-api');
    expect(rules(page(`${CODE.fb};navigator.sendBeacon(u)`), 'meta')).toContain(
      'error:network-api',
    );
    expect(rules(page(`${CODE.fb};document.createElement("iframe")`), 'meta')).toContain(
      'error:iframe',
    );
  });

  it('fails on cookies', () => {
    expect(rules(page(`${CODE.fb};document.cookie`), 'meta')).toContain('error:cookie');
  });

  it('warns about XMLHttpRequest, but fails on Moloco, which forbids it', () => {
    const code = `${CODE.fb};new XMLHttpRequest`;
    expect(rules(page(code), 'meta')).toContain('warning:xhr');
    expect(rules(page(code), 'moloco')).toContain('error:forbidden-token');
  });

  it('warns about localStorage, but fails on Google, which forbids it', () => {
    expect(rules(page(`${CODE.fb};localStorage.getItem`), 'meta')).toContain('warning:storage');
    expect(rules(page(`${CODE.google};localStorage.getItem`, GOOGLE_HEAD), 'google')).toContain(
      'error:forbidden-token',
    );
  });

  it('fails when the CTA does not match the network', () => {
    expect(rules(page(CODE.fb), 'unity')).toContain('error:cta');
    expect(rules(page(CODE.mraid), 'meta')).toContain('error:cta');
    expect(rules(page(`${CODE.fb};${CODE.mraid}`), 'meta')).toContain('error:cta');
  });

  it('checks Google markup rules', () => {
    expect(rules(page(CODE.google), 'google')).toEqual(
      expect.arrayContaining(['error:google-exitapi', 'error:google-orientation']),
    );
    const selfClosing = page(CODE.google, GOOGLE_HEAD).replace(
      '<meta charset="UTF-8">',
      '<meta charset="UTF-8" />',
    );
    expect(rules(selfClosing, 'google')).toContain('error:self-closing');
  });

  it('ignores markup-looking strings inside scripts', () => {
    const code = `${CODE.google};s="<path />"`;
    expect(rules(page(code, GOOGLE_HEAD), 'google')).toEqual([]);
  });
});
