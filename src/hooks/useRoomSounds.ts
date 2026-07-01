import { useEffect, useRef } from 'react';
import type { RoomState } from '../../shared/types';
import { useAudio } from '../audio/AudioProvider';

export function useRoomSounds(state: RoomState | null) {
  const { play } = useAudio();
  const prevRef = useRef<RoomState | null>(null);

  useEffect(() => {
    const prev = prevRef.current;
    if (!state) return;

    if (!prev) {
      prevRef.current = state;
      return;
    }

    const lobbyish = state.phase === 'lobby' || state.phase === 'winner';

    if (lobbyish) {
      const prevIds = new Set(prev.players.map((p) => p.id));
      const currentIds = new Set(state.players.map((p) => p.id));

      for (const player of state.players) {
        if (!prevIds.has(player.id)) {
          play('lobbyJoin');
        }
      }

      for (const player of prev.players) {
        if (!currentIds.has(player.id)) {
          play('lobbyLeave');
        }
      }
    }

    if (state.phase === 'countdown' && state.countdown > 0) {
      const enteredCountdown = prev.phase !== 'countdown';
      const tickedDown = prev.countdown !== state.countdown;
      if (enteredCountdown || tickedDown) {
        play('countdownTick');
      }
    }

    prevRef.current = state;
  }, [state, play]);
}
