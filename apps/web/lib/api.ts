import { TargetFramesIndex, TargetSummary } from './types';

// Read API base URL from Next.js env var (or Vite client env in preview)
export const getApiBaseUrl = (): string => {
  if (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  // @ts-ignore - Handle Vite client env
  if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) {
    // @ts-ignore
    return import.meta.env.VITE_API_URL;
  }
  return '';
};

/**
 * Fetch list of all available SPHEREx targets.
 */
export async function fetchTargets(): Promise<TargetSummary[]> {
  const baseUrl = getApiBaseUrl();
  const url = baseUrl ? `${baseUrl}/targets` : '/targets';

  try {
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Failed to fetch targets: ${res.statusText}`);
    }
    return await res.json();
  } catch (err) {
    // Fallback for standalone mock environment
    console.warn('API /targets unreachable, checking local static index fallback:', err);
    try {
      const fallbackRes = await fetch('/static/frames/mock-target/index.json');
      if (fallbackRes.ok) {
        const data: TargetFramesIndex = await fallbackRes.json();
        return [
          {
            id: data.target,
            title: data.title,
            ra: data.ra,
            dec: data.dec,
            caption: data.caption,
            frame_count: data.frames.length,
          },
        ];
      }
    } catch {
      // ignore
    }
    throw err;
  }
}

/**
 * Fetch frames and metadata index for a target by ID.
 */
export async function fetchTargetFrames(targetId: string): Promise<TargetFramesIndex> {
  const baseUrl = getApiBaseUrl();
  const url = baseUrl ? `${baseUrl}/targets/${targetId}/frames` : `/targets/${targetId}/frames`;

  try {
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Failed to fetch frames for target ${targetId}: ${res.statusText}`);
    }
    return await res.json();
  } catch (err) {
    // Fallback to static index.json if backend server is not directly accessible
    console.warn(`API /targets/${targetId}/frames unreachable, attempting static fallback:`, err);
    const staticUrl = `/static/frames/${targetId}/index.json`;
    const fallbackRes = await fetch(staticUrl);
    if (fallbackRes.ok) {
      return await fallbackRes.json();
    }
    throw err;
  }
}

/**
 * Construct full URL to load a frame WebP image.
 */
export function getFrameImageUrl(targetId: string, filename: string): string {
  const baseUrl = getApiBaseUrl();
  const path = `/static/frames/${targetId}/${filename}`;
  return baseUrl ? `${baseUrl}${path}` : path;
}
