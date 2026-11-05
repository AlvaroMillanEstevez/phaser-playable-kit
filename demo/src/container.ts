/**
 * The fake ad container injected into each build shown in the demo. It only exposes the
 * API of the build's network family (so a wrong CTA would fail visibly), forwards every
 * call and the runtime's anonymous events to the demo page, and lets the page drive
 * MRAID's `ready` and `viewableChange`.
 */
import type { NetworkFamily } from '../../src/core/networks/specs.ts';

export const FROM_AD = 'ppk-demo-ad';
export const FROM_HOST = 'ppk-demo-host';

export type AdMessage =
  | { source: typeof FROM_AD; type: 'loaded' }
  | { source: typeof FROM_AD; type: 'event'; name: string }
  | { source: typeof FROM_AD; type: 'call'; name: string; args: unknown[] };

export type HostMessage =
  | { source: typeof FROM_HOST; type: 'ready' }
  | { source: typeof FROM_HOST; type: 'viewable'; value: boolean };

/** Runs inside the ad's iframe, before any of the ad's own scripts. */
function fakeContainer(family: NetworkFamily, fromAd: string, fromHost: string): void {
  const send = (message: Record<string, unknown>): void => {
    window.parent.postMessage({ source: fromAd, ...message }, '*');
  };
  const call =
    (name: string) =>
    (...args: unknown[]): void => {
      send({ type: 'call', name, args });
    };
  window.addEventListener('playable:event', (event) => {
    send({ type: 'event', name: (event as CustomEvent<string>).detail });
  });

  if (family === 'mraid') {
    let state = 'loading';
    let viewable = false;
    const listeners: Record<string, ((...args: unknown[]) => void)[]> = {};
    const emit = (event: string, ...args: unknown[]): void => {
      for (const listener of [...(listeners[event] ?? [])]) listener(...args);
    };
    Object.assign(window, {
      mraid: {
        getVersion: () => '3.0',
        getState: () => state,
        isViewable: () => viewable,
        open: call('mraid.open'),
        close: call('mraid.close'),
        addEventListener: (event: string, listener: (...args: unknown[]) => void) => {
          (listeners[event] ??= []).push(listener);
        },
        removeEventListener: (event: string, listener: (...args: unknown[]) => void) => {
          listeners[event] = (listeners[event] ?? []).filter((l) => l !== listener);
        },
      },
    });
    window.addEventListener('message', (event) => {
      const message = event.data as { source?: string; type?: string; value?: boolean } | null;
      if (event.source !== window.parent || message?.source !== fromHost) return;
      if (message.type === 'ready' && state === 'loading') {
        state = 'default';
        emit('ready');
      } else if (message.type === 'viewable' && typeof message.value === 'boolean') {
        viewable = message.value;
        emit('viewableChange', viewable);
      }
    });
  } else if (family === 'google') {
    Object.assign(window, { ExitApi: { exit: call('ExitApi.exit') } });
  } else {
    Object.assign(window, { FbPlayableAd: { onCTAClick: call('FbPlayableAd.onCTAClick') } });
  }
  send({ type: 'loaded' });
}

const GOOGLE_EXIT_API_TAG = /<script\b[^>]*exitapi\.js[^>]*><\/script>/i;

/**
 * Returns the build's HTML with the fake container first in `<head>`. Google's
 * exitapi.js tag is removed: the fake ExitApi replaces it and the demo stays offline.
 */
export function withFakeContainer(html: string, family: NetworkFamily): string {
  const script = `<script>(${fakeContainer.toString()})(${JSON.stringify(family)}, ${JSON.stringify(FROM_AD)}, ${JSON.stringify(FROM_HOST)});</script>`;
  return html.replace(GOOGLE_EXIT_API_TAG, '').replace(/<head>/i, (tag) => `${tag}${script}`);
}
