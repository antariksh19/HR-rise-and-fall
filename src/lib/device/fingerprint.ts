'use client';

const DEVICE_KEY = 'hr_rf_device_id';
const IDB_NAME = 'hr_rf_vault';
const IDB_STORE = 'meta';

function getOsFamily(): string {
  const ua = navigator.userAgent || '';
  if (/iphone|ipad|ipod/i.test(ua)) return 'ios';
  if (/android/i.test(ua)) return 'android';
  if (/windows/i.test(ua)) return 'windows';
  if (/mac os x|macintosh/i.test(ua)) return 'macos';
  if (/linux/i.test(ua)) return 'linux';
  return 'other';
}

export function isStandardizedIosDevice(): boolean {
  return getOsFamily() === 'ios';
}

function readIdbDeviceId(): Promise<string | null> {
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open(IDB_NAME, 1);
      req.onupgradeneeded = () => {
        if (!req.result.objectStoreNames.contains(IDB_STORE)) {
          req.result.createObjectStore(IDB_STORE);
        }
      };
      req.onsuccess = () => {
        const db = req.result;
        const tx = db.transaction(IDB_STORE, 'readonly');
        const getReq = tx.objectStore(IDB_STORE).get(DEVICE_KEY);
        getReq.onsuccess = () => resolve((getReq.result as string) || null);
        getReq.onerror = () => resolve(null);
      };
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

function writeIdbDeviceId(id: string): Promise<void> {
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open(IDB_NAME, 1);
      req.onupgradeneeded = () => {
        if (!req.result.objectStoreNames.contains(IDB_STORE)) {
          req.result.createObjectStore(IDB_STORE);
        }
      };
      req.onsuccess = () => {
        const db = req.result;
        const tx = db.transaction(IDB_STORE, 'readwrite');
        tx.objectStore(IDB_STORE).put(id, DEVICE_KEY);
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      };
      req.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

/** Persistent Device ID synced across localStorage and IndexedDB */
export async function getOrCreatePersistentDeviceId(): Promise<string> {
  let localVal: string | null = null;
  try {
    localVal = localStorage.getItem(DEVICE_KEY);
  } catch {
    // Ignore storage restriction
  }

  const idbVal = await readIdbDeviceId();
  const resolved =
    localVal ||
    idbVal ||
    (typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `dev-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`);

  try {
    localStorage.setItem(DEVICE_KEY, resolved);
  } catch {
    // Ignore
  }
  await writeIdbDeviceId(resolved);

  return resolved;
}

function getCanvasSignature(): string {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 220;
    canvas.height = 40;
    const ctx = canvas.getContext('2d');
    if (!ctx) return 'no-canvas';
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillStyle = '#FF2E17';
    ctx.fillRect(10, 4, 80, 20);
    ctx.fillStyle = '#F4F2EC';
    ctx.fillText('HR-RISE-FALL-FP', 14, 8);
    return canvas.toDataURL().slice(-64);
  } catch {
    return 'canvas-err';
  }
}

function getWebGLRenderer(): string {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl || !('getExtension' in gl)) return 'no-webgl';
    const webgl = gl as WebGLRenderingContext;
    const ext = webgl.getExtension('WEBGL_debug_renderer_info');
    if (!ext) return 'no-ext';
    return String(webgl.getParameter(ext.UNMASKED_RENDERER_WEBGL) || 'unknown');
  } catch {
    return 'webgl-err';
  }
}

async function getAudioSignature(): Promise<string> {
  try {
    const OfflineCtx =
      window.OfflineAudioContext ||
      (window as unknown as { webkitOfflineAudioContext?: typeof OfflineAudioContext })
        .webkitOfflineAudioContext;
    if (!OfflineCtx) return 'no-audio';

    const ctx = new OfflineCtx(1, 4096, 44100);
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(10000, ctx.currentTime);

    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.setValueAtTime(-50, ctx.currentTime);
    compressor.knee.setValueAtTime(40, ctx.currentTime);
    compressor.ratio.setValueAtTime(12, ctx.currentTime);
    compressor.attack.setValueAtTime(0, ctx.currentTime);
    compressor.release.setValueAtTime(0.25, ctx.currentTime);

    osc.connect(compressor);
    compressor.connect(ctx.destination);
    osc.start(0);

    const buffer = await ctx.startRendering();
    const data = buffer.getChannelData(0);
    let sum = 0;
    for (let i = 500; i < 1500; i++) {
      sum += Math.abs(data[i]);
    }
    return sum.toFixed(6);
  } catch {
    return 'audio-err';
  }
}

async function sha256(input: string): Promise<string> {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const encoded = new TextEncoder().encode(input);
    const hashBuffer = await crypto.subtle.digest('SHA-256', encoded);
    return Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }
  let hash = 2166136261;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return (hash >>> 0).toString(16).padStart(16, '0');
}

/** Browser-independent hardware signature (consistent across Chrome, Edge, Firefox) */
export async function getCrossBrowserHardwareSignature(): Promise<string> {
  const w = Math.min(window.screen.width, window.screen.height);
  const h = Math.max(window.screen.width, window.screen.height);
  const dpr = Math.round((window.devicePixelRatio || 1) * 100);
  const cores = navigator.hardwareConcurrency || 0;
  const touch = navigator.maxTouchPoints > 0 ? 1 : 0;
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
  const gpu = getWebGLRenderer();

  const traits = [
    getOsFamily(),
    `${w}x${h}`,
    String(dpr),
    String(window.screen.colorDepth || 24),
    String(cores),
    String(touch),
    tz,
    gpu,
  ].join('|');

  return sha256(traits);
}

/** Browser-level fingerprint (blocks Incognito & cookie clears in the same browser) */
export async function getDeviceFingerprint(): Promise<string> {
  const audio = await getAudioSignature();
  const traits = [
    navigator.userAgent,
    navigator.language,
    `${window.screen.width}x${window.screen.height}x${window.screen.colorDepth}`,
    String(window.devicePixelRatio || 1),
    Intl.DateTimeFormat().resolvedOptions().timeZone || '',
    getWebGLRenderer(),
    getCanvasSignature(),
    audio,
  ].join('||');

  return sha256(traits);
}