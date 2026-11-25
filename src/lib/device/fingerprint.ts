'use client';

const DEVICE_KEY = 'hr_rf_device_id';
const IDB_NAME = 'hr_rf_vault';
const IDB_STORE = 'meta';

function getOsFamily(): string {
  const ua = navigator.userAgent || '';
  if (/iphone|ipad|ipod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) {
    return 'ios';
  }
  if (/android/i.test(ua)) return 'android';
  if (/windows/i.test(ua)) return 'windows';
  if (/mac os x|macintosh/i.test(ua)) return 'macos';
  if (/linux/i.test(ua)) return 'linux';
  return 'other';
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
        getReq.onsuccess = () => {
          const value = (getReq.result as string) || null;
          db.close();
          resolve(value);
        };
        getReq.onerror = () => {
          db.close();
          resolve(null);
        };
        tx.onabort = () => {
          db.close();
          resolve(null);
        };
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
        tx.oncomplete = () => {
          db.close();
          resolve();
        };
        tx.onerror = () => {
          db.close();
          resolve();
        };
        tx.onabort = () => {
          db.close();
          resolve();
        };
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
  const secureCrypto = globalThis.crypto;
  const resolved =
    localVal ||
    idbVal ||
    (secureCrypto?.randomUUID
      ? secureCrypto.randomUUID()
      : (() => {
          if (!secureCrypto?.getRandomValues) {
            throw new Error('Secure device identity generation is unavailable.');
          }
          const bytes = secureCrypto.getRandomValues(new Uint8Array(16));
          return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
        })());

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

async function sha256(input: string): Promise<string> {
  if (!globalThis.crypto?.subtle) {
    throw new Error('Secure browser fingerprinting is unavailable.');
  }
  const encoded = new TextEncoder().encode(input);
  const hashBuffer = await globalThis.crypto.subtle.digest('SHA-256', encoded);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
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
  const traits = [
    navigator.userAgent,
    navigator.language,
    `${window.screen.width}x${window.screen.height}x${window.screen.colorDepth}`,
    String(window.devicePixelRatio || 1),
    Intl.DateTimeFormat().resolvedOptions().timeZone || '',
    getWebGLRenderer(),
    getCanvasSignature(),
  ].join('||');

  return sha256(traits);
}