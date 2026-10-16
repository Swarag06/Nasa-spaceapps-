import { TargetFramesIndex, TargetSummary } from './types';

// Raw config value as specified by the requirements
export const RAW_FRAMES_BASE_URL = "https://https://swarag06.github.io/spherex-frames";

// Normalized config URL ensuring valid HTTP/HTTPS protocol
export const FRAMES_BASE_URL = RAW_FRAMES_BASE_URL.replace(/^https?:\/\/https?:\/\//i, 'https://');

// Known target fallback IDs if targets.json network request encounters errors
const FALLBACK_TARGET_IDS = [
  "test-field",
  "3i-atlas-aug",
  "3i-atlas-aug-stacked",
  "3i-atlas-aug-buildup",
  "3i-atlas-dec",
  "3i-atlas-dec-stacked",
  "3i-atlas-dec-buildup",
];

interface TargetsJsonResponse {
  targets: string[];
}

/**
 * Fetch a URL with cache-busting and transparent proxy fallback.
 */
async function fetchWithFallback<T>(remoteUrl: string, proxyRelPath: string): Promise<T> {
  const cacheBustUrl = `${remoteUrl}${remoteUrl.includes('?') ? '&' : '?'}t=${Date.now()}`;

  // Strategy 1: Direct fetch to remote GitHub Pages URL
  try {
    const res = await fetch(cacheBustUrl, {
      cache: 'no-cache',
      headers: { Accept: 'application/json' },
    });
    if (res.ok) {
      return await res.json();
    }
    console.warn(`Direct fetch to ${remoteUrl} returned status ${res.status}, trying proxy fallback...`);
  } catch (err) {
    console.warn(`Direct fetch to ${remoteUrl} failed, trying proxy fallback...`, err);
  }

  // Strategy 2: Proxy fallback via development server
  try {
    const proxyUrl = `/remote-frames/${proxyRelPath}${proxyRelPath.includes('?') ? '&' : '?'}t=${Date.now()}`;
    const proxyRes = await fetch(proxyUrl, {
      cache: 'no-cache',
      headers: { Accept: 'application/json' },
    });
    if (proxyRes.ok) {
      return await proxyRes.json();
    }
    throw new Error(`Proxy fallback returned status ${proxyRes.status}`);
  } catch (proxyErr) {
    throw new Error(`Failed to fetch ${remoteUrl} both directly and via proxy: ${proxyErr}`);
  }
}

/**
 * Fetch list of targets from ${FRAMES_BASE_URL}/targets.json.
 * For each target id, loads its metadata from ${FRAMES_BASE_URL}/${id}/index.json.
 */
export async function fetchTargets(): Promise<TargetSummary[]> {
  let ids: string[] = [];

  try {
    const data = await fetchWithFallback<TargetsJsonResponse>(
      `${FRAMES_BASE_URL}/targets.json`,
      'targets.json'
    );
    ids = Array.isArray(data?.targets) ? data.targets : FALLBACK_TARGET_IDS;
  } catch (err) {
    console.warn('Could not fetch targets.json, using known target list fallback:', err);
    ids = FALLBACK_TARGET_IDS;
  }

  // Fetch index.json for each target to populate titles and coordinates
  const targets = await Promise.all(
    ids.map(async (id) => {
      try {
        const targetData = await fetchTargetFrames(id);
        return {
          id: targetData.target || id,
          title: targetData.title || id,
          ra: targetData.ra ?? 0.0,
          dec: targetData.dec ?? 0.0,
          caption: targetData.caption || '',
          tracking: targetData.tracking,
          stack: targetData.stack,
          frame_count: targetData.frames?.length || 0,
        };
      } catch (err) {
        console.warn(`Could not load full index for target ${id}:`, err);
        return {
          id,
          title: id.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
          ra: 0.0,
          dec: 0.0,
          caption: '',
          tracking: id.includes('atlas') || id.includes('stacked') || id.includes('buildup'),
          frame_count: 0,
        };
      }
    })
  );

  return targets;
}

/**
 * Fetch a target's metadata and frames from ${FRAMES_BASE_URL}/${targetId}/index.json.
 */
export async function fetchTargetFrames(targetId: string): Promise<TargetFramesIndex> {
  const remoteUrl = `${FRAMES_BASE_URL}/${targetId}/index.json`;
  const proxyPath = `${targetId}/index.json`;
  return await fetchWithFallback<TargetFramesIndex>(remoteUrl, proxyPath);
}

/**
 * Construct full URL for a frame image: ${FRAMES_BASE_URL}/${targetId}/${filename}.
 */
export function getFrameImageUrl(targetId: string, filename: string): string {
  if (filename.startsWith('http://') || filename.startsWith('https://')) {
    return filename;
  }
  return `${FRAMES_BASE_URL}/${targetId}/${filename}`;
}

/**
 * Fallback URL via local proxy if direct GitHub image load fails.
 */
export function getProxyFrameImageUrl(targetId: string, filename: string): string {
  return `/remote-frames/${targetId}/${filename}`;
}
