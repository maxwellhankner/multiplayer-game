import { useEffect } from 'react';
import type { GamePhase } from '../../../shared/types';
import { useIsLandscape } from './useIsLandscape';

export function useReportLandscapeReady(
  phase: GamePhase,
  landscapeReady: boolean,
  onLandscapeReady?: () => void,
) {
  const isLandscape = useIsLandscape();

  useEffect(() => {
    if (phase !== 'orient' || landscapeReady || !isLandscape) return;
    onLandscapeReady?.();
  }, [phase, landscapeReady, isLandscape, onLandscapeReady]);
}
