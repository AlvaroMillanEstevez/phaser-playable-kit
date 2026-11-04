import { vi } from 'vitest';
import type { AdGlobal, Mraid, MraidState } from '../src/core/adapter.ts';

export const STORE_URLS = {
  ios: 'https://apps.apple.com/app/id000000000',
  android: 'https://play.google.com/store/apps/details?id=com.example.game',
};

export const ANDROID_UA = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36';
export const IOS_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15';

export interface FakeMraid extends Mraid {
  state: MraidState;
  viewable: boolean;
  open: ReturnType<typeof vi.fn<(url: string) => void>>;
  fireReady(): void;
  fireViewable(viewable: boolean): void;
}

/** An MRAID container that only becomes ready or viewable when the test says so. */
export function fakeMraid(initial: { state?: MraidState; viewable?: boolean } = {}): FakeMraid {
  const listeners = new Map<string, Set<(...args: never[]) => void>>();
  const emit = (event: string, ...args: unknown[]): void => {
    for (const listener of listeners.get(event) ?? [])
      (listener as (...a: unknown[]) => void)(...args);
  };
  const mraid: FakeMraid = {
    state: initial.state ?? 'loading',
    viewable: initial.viewable ?? false,
    open: vi.fn<(url: string) => void>(),
    getState: () => mraid.state,
    isViewable: () => mraid.viewable,
    addEventListener(event: string, listener: (...args: never[]) => void) {
      let set = listeners.get(event);
      if (!set) listeners.set(event, (set = new Set()));
      set.add(listener);
    },
    removeEventListener(event: string, listener: (...args: never[]) => void) {
      listeners.get(event)?.delete(listener);
    },
    fireReady() {
      mraid.state = 'default';
      emit('ready');
    },
    fireViewable(viewable: boolean) {
      mraid.viewable = viewable;
      emit('viewableChange', viewable);
    },
  };
  return mraid;
}

export interface FakeGlobal extends AdGlobal {
  document: AdGlobal['document'] & {
    visibilityState: DocumentVisibilityState;
    setVisibility(state: DocumentVisibilityState): void;
  };
}

export function fakeGlobal(
  overrides: Omit<Partial<AdGlobal>, 'document' | 'navigator'> = {},
  userAgent = IOS_UA,
): FakeGlobal {
  const visibilityListeners = new Set<() => void>();
  const document: FakeGlobal['document'] = {
    visibilityState: 'visible',
    addEventListener: (_type, listener) => visibilityListeners.add(listener),
    setVisibility(state) {
      document.visibilityState = state;
      for (const listener of visibilityListeners) listener();
    },
  };
  return { navigator: { userAgent }, document, ...overrides };
}
