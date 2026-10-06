import { useQuery } from '@tanstack/react-query';
import { fetchTargets } from '../lib/api';
import { TargetSummary } from '../lib/types';

export function useTargets() {
  return useQuery<TargetSummary[]>({
    queryKey: ['targets'],
    queryFn: fetchTargets,
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 2,
  });
}
