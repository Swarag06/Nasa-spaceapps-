import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchTargetFrames, getFrameImageUrl } from '../lib/api';
import { TargetFramesIndex } from '../lib/types';

export function useFrames(targetId: string | null) {
  const query = useQuery<TargetFramesIndex>({
    queryKey: ['target-frames', targetId],
    queryFn: () => {
      if (!targetId) throw new Error('No target specified');
      return fetchTargetFrames(targetId);
    },
    enabled: Boolean(targetId),
    staleTime: 1000 * 60 * 10,
  });

  // Preload all WebP frame images into browser cache for instantaneous scrubbing & blinking
  useEffect(() => {
    if (query.data?.frames && targetId) {
      query.data.frames.forEach((frame) => {
        const img = new Image();
        img.src = getFrameImageUrl(targetId, frame.file);
      });
    }
  }, [query.data, targetId]);

  return query;
}
