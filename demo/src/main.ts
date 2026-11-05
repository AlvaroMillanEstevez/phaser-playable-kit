import {
  FROM_AD,
  FROM_HOST,
  withFakeContainer,
  type AdMessage,
  type HostMessage,
} from './container.ts';
import type { DemoBuild, DemoManifest, DemoPlayable } from './manifest.ts';

type Orientation = 'portrait' | 'landscape';

const SCREEN = { short: 360, long: 720 };
const PHONE_PADDING = 14;
const AUTO_READY_MS = 300;
const AUTO_VIEWABLE_MS = 600;

const $ = (id: string): HTMLElement => {
  const element = document.getElementById(id);
  if (!element) throw new Error(`#${id} missing`);
  return element;
};

const ui = {
  playables: $('playables'),
  networks: $('networks'),
  orientation: $('orientation'),
  containerControls: $('container-controls') as HTMLFieldSetElement,
  containerNote: $('container-note'),
  autoStart: $('auto-start') as HTMLInputElement,
  sendReady: $('send-ready') as HTMLButtonElement,
  toggleViewable: $('toggle-viewable') as HTMLButtonElement,
  buildInfo: $('build-info'),
  restart: $('restart') as HTMLButtonElement,
  phoneFit: $('phone-fit'),
  phone: $('phone'),
  frame: $('ad') as HTMLIFrameElement,
  log: $('log') as HTMLOListElement,
  clearLog: $('clear-log') as HTMLButtonElement,
};

const state = {
  manifest: { playables: [] } as DemoManifest,
  playable: '',
  network: '',
  orientation: 'portrait' as Orientation,
  viewable: false,
  loadedAt: 0,
  timers: [] as number[],
};

const formatBytes = (bytes: number): string => `${(bytes / 1_000_000).toFixed(2)} MB`;

function currentPlayable(): DemoPlayable | undefined {
  return state.manifest.playables.find((p) => p.id === state.playable);
}

function currentBuild(): DemoBuild | undefined {
  return currentPlayable()?.builds.find((b) => b.network === state.network);
}

// ------------------------------------------------------------------ log

function log(kind: 'call' | 'event' | 'host', label: string, text: string): void {
  const item = document.createElement('li');
  const seconds = state.loadedAt ? ((performance.now() - state.loadedAt) / 1000).toFixed(1) : '0.0';
  for (const [className, value] of [
    ['time', `${seconds}s`],
    [`kind-${kind}`, label],
    ['text', text],
  ] as const) {
    const span = document.createElement('span');
    span.className = className;
    span.textContent = value;
    item.append(span);
  }
  ui.log.append(item);
  ui.log.scrollTop = ui.log.scrollHeight;
}

// ------------------------------------------------------------------ container

function post(message: HostMessage): void {
  ui.frame.contentWindow?.postMessage(message, '*');
}

function sendReady(): void {
  post({ source: FROM_HOST, type: 'ready' });
  log('host', 'container', 'ready');
  ui.sendReady.disabled = true;
}

function setViewable(viewable: boolean): void {
  state.viewable = viewable;
  post({ source: FROM_HOST, type: 'viewable', value: viewable });
  log('host', 'container', `viewableChange(${viewable})`);
  ui.toggleViewable.setAttribute('aria-pressed', String(viewable));
  ui.toggleViewable.textContent = `Viewable: ${viewable ? 'on' : 'off'}`;
}

window.addEventListener('message', (event: MessageEvent<AdMessage | null>) => {
  // Only trust messages from the ad iframe that carry the demo's marker.
  if (event.source !== ui.frame.contentWindow || event.data?.source !== FROM_AD) return;
  const message = event.data;
  switch (message.type) {
    case 'loaded':
      log('host', 'container', 'ad loaded');
      if (currentBuild()?.family === 'mraid' && ui.autoStart.checked) {
        state.timers.push(window.setTimeout(sendReady, AUTO_READY_MS));
        state.timers.push(
          window.setTimeout(() => {
            setViewable(true);
          }, AUTO_VIEWABLE_MS),
        );
      }
      break;
    case 'event':
      log('event', 'event', message.name);
      break;
    case 'call':
      log(
        'call',
        'CTA/API',
        `${message.name}(${message.args.map((a) => JSON.stringify(a)).join(', ')})`,
      );
      break;
  }
});

// ------------------------------------------------------------------ rendering

function renderPlayables(): void {
  ui.playables.replaceChildren(
    ...state.manifest.playables.map((playable) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = playable.title;
      button.setAttribute('aria-pressed', String(playable.id === state.playable));
      button.addEventListener('click', () => {
        state.playable = playable.id;
        render();
        void load();
      });
      return button;
    }),
  );
}

function renderNetworks(): void {
  const playable = currentPlayable();
  ui.networks.replaceChildren(
    ...(playable?.builds ?? []).map((build) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = build.name;
      if (build.status === 'testing') {
        const badge = document.createElement('span');
        badge.className = 'badge';
        badge.textContent = 'testing';
        button.append(badge);
      }
      button.setAttribute('aria-pressed', String(build.network === state.network));
      button.addEventListener('click', () => {
        state.network = build.network;
        render();
        void load();
      });
      return button;
    }),
  );
}

const CTA_API = {
  mraid: 'mraid.open(storeUrl)',
  google: 'ExitApi.exit()',
  fb: 'FbPlayableAd.onCTAClick()',
};

function renderBuildInfo(): void {
  const build = currentBuild();
  if (!build) {
    ui.buildInfo.replaceChildren();
    return;
  }
  const used = build.bytes / build.maxBytes;
  const dl = document.createElement('dl');
  const rows: [string, string][] = [
    ['Network', `${build.name}${build.status === 'testing' ? ' (testing)' : ''}`],
    ['Output', build.output === 'zip' ? 'ZIP with index.html' : 'single HTML file'],
    ['CTA', CTA_API[build.family]],
    [
      'Size',
      `${formatBytes(build.bytes)} of ${formatBytes(build.maxBytes)} (${Math.round(used * 100)}%)`,
    ],
  ];
  for (const [term, value] of rows) {
    const dt = document.createElement('dt');
    dt.textContent = term;
    const dd = document.createElement('dd');
    dd.textContent = value;
    dl.append(dt, dd);
  }
  const meter = document.createElement('div');
  meter.className = used > 0.75 ? 'meter high' : 'meter';
  meter.setAttribute('role', 'meter');
  meter.setAttribute('aria-label', 'Size against the network limit');
  meter.setAttribute('aria-valuenow', String(Math.round(used * 100)));
  const bar = document.createElement('span');
  bar.style.width = `${Math.min(100, used * 100)}%`;
  meter.append(bar);
  const download = document.createElement('a');
  download.href = build.download;
  download.download = '';
  download.textContent = `Download the ${build.output === 'zip' ? 'ZIP' : 'HTML file'}`;
  ui.buildInfo.replaceChildren(dl, meter, download);
}

function renderContainerControls(): void {
  const mraid = currentBuild()?.family === 'mraid';
  ui.containerControls.disabled = !mraid;
  ui.containerNote.textContent = mraid
    ? 'Unity Ads and the other MRAID networks require the ad to wait for both events before it renders. Turn viewability off to see the ad pause and mute.'
    : 'This network has no MRAID: the ad starts right away and follows page visibility.';
}

function renderOrientation(): void {
  for (const button of ui.orientation.querySelectorAll('button')) {
    button.setAttribute('aria-pressed', String(button.dataset.value === state.orientation));
  }
  const portrait = state.orientation === 'portrait';
  ui.frame.width = String(portrait ? SCREEN.short : SCREEN.long);
  ui.frame.height = String(portrait ? SCREEN.long : SCREEN.short);
  fitPhone();
}

/** Scales the phone down when the column is narrower than the device. */
function fitPhone(): void {
  const portrait = state.orientation === 'portrait';
  const width = (portrait ? SCREEN.short : SCREEN.long) + PHONE_PADDING * 2;
  const height = (portrait ? SCREEN.long : SCREEN.short) + PHONE_PADDING * 2;
  const scale = Math.min(1, ui.phoneFit.clientWidth / width);
  ui.phone.style.transform = `scale(${scale})`;
  ui.phoneFit.style.height = `${height * scale}px`;
}

function render(): void {
  const playable = currentPlayable();
  if (playable && !playable.builds.some((b) => b.network === state.network)) {
    state.network = playable.builds[0]?.network ?? '';
  }
  renderPlayables();
  renderNetworks();
  renderBuildInfo();
  renderContainerControls();
  renderOrientation();
  saveSelection();
}

// ------------------------------------------------------------------ loading

async function load(): Promise<void> {
  const build = currentBuild();
  if (!build) return;
  for (const timer of state.timers.splice(0)) clearTimeout(timer);
  state.viewable = false;
  ui.sendReady.disabled = false;
  ui.toggleViewable.setAttribute('aria-pressed', 'false');
  ui.toggleViewable.textContent = 'Viewable: off';

  const response = await fetch(build.html);
  const html = await response.text();
  state.loadedAt = performance.now();
  log('host', 'demo', `loading ${state.playable} for ${build.name} (${state.orientation})`);
  if (build.family === 'google')
    log('host', 'demo', "exitapi.js replaced by the demo's fake ExitApi");
  ui.frame.srcdoc = withFakeContainer(html, build.family);
}

// ------------------------------------------------------------------ selection memory

const STORAGE_KEY = 'ppk-demo-selection';

function saveSelection(): void {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        playable: state.playable,
        network: state.network,
        orientation: state.orientation,
      }),
    );
  } catch {
    // Storage can be blocked; the demo works without it.
  }
}

function restoreSelection(): void {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as Partial<typeof state>;
    if (typeof saved.playable === 'string') state.playable = saved.playable;
    if (typeof saved.network === 'string') state.network = saved.network;
    if (saved.orientation === 'portrait' || saved.orientation === 'landscape') {
      state.orientation = saved.orientation;
    }
  } catch {
    // Ignore unreadable or blocked storage.
  }
}

// ------------------------------------------------------------------ start

ui.orientation.addEventListener('click', (event) => {
  const value = (event.target as HTMLElement).closest('button')?.dataset.value;
  if (value !== 'portrait' && value !== 'landscape') return;
  state.orientation = value;
  render();
  void load();
});
ui.sendReady.addEventListener('click', sendReady);
ui.toggleViewable.addEventListener('click', () => {
  setViewable(!state.viewable);
});
ui.restart.addEventListener('click', () => {
  void load();
});
ui.clearLog.addEventListener('click', () => {
  ui.log.replaceChildren();
});
new ResizeObserver(fitPhone).observe(ui.phoneFit);

const manifestResponse = await fetch('builds/manifest.json');
state.manifest = (await manifestResponse.json()) as DemoManifest;
restoreSelection();
if (!currentPlayable()) state.playable = state.manifest.playables[0]?.id ?? '';
render();
void load();
