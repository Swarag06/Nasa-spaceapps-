/**
 * SPHEREx Sky Explorer Data Types
 */

export interface FrameItem {
  file: string;
  obs_id: string;
  time_utc: string;
  wavelength_um: number;
  detector: number;
}

export interface TargetFramesIndex {
  target: string;
  title: string;
  ra: number;
  dec: number;
  caption: string;
  frames: FrameItem[];
}

export interface TargetSummary {
  id: string;
  title: string;
  ra: number;
  dec: number;
  caption: string;
  frame_count: number;
}

export type ViewMode = 'single' | 'blink' | 'side-by-side';
