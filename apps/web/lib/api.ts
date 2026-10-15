import { TargetFramesIndex, TargetSummary } from './types';

// Raw config value as specified by the requirements
export const RAW_FRAMES_BASE_URL = "https://https://swarag06.github.io/spherex-frames";

// Normalized config URL ensuring valid HTTP/HTTPS protocol
export const FRAMES_BASE_URL = RAW_FRAMES_BASE_URL.replace(/^https?:\/\/https?:\/\//i, 'https://');

interface TargetsJsonResponse {
  targets: string[];
}

/**
 * Fetch list of targets from ${FRAMES_BASE_URL}/targets.json.
 * For each target id, loads its metadata from ${FRAMES_BASE_URL}/${id}/index.json.
 */
export async function fetchTargets(): Promise<TargetSummary[]> {
  const url = `${FRAMES_BASE_URL}/targets.json`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch targets from ${url}: ${res.statusText}`);
  }

  const data: TargetsJsonResponse = await res.json();
  const ids: string[] = Array.isArray(data.targets) ? data.targets : [];

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
          title: id,
          ra: 0.0,
          dec: 0.0,
          caption: '',
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
  const url = `${FRAMES_BASE_URL}/${targetId}/index.json`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch frames for target ${targetId} from ${url}: ${res.statusText}`);
  }
  return await res.json();
}

/**
 * Construct full URL for a frame image: ${FRAMES_BASE_URL}/${targetId}/${filename}.
 */
export function getFrameImageUrl(targetId: string, filename: string): string {
  return `${FRAMES_BASE_URL}/${targetId}/${filename}`;
}
