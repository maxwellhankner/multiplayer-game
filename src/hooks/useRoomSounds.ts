import { useEffect, useRef } from 'react';
import { isBot } from '../../shared/games/bots';
import type { RoomState } from '../../shared/types';
import { useAudio } from '../audio/AudioProvider';

export function useRoomSounds(state: RoomState | null, playerId?: string | null) {
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
      for (const player of state.players) {
        if (!prevIds.has(player.id) && !isBot(player.id)) {
          play('playerJoin');
        }
      }

      for (const player of state.players) {
        if (isBot(player.id)) continue;
        const was = prev.players.find((p) => p.id === player.id);
        if (player.ready && was && !was.ready) {
          play('playerReady');
        }
      }
    }

    if (state.phase === 'countdown' && prev.countdown !== state.countdown) {
      if (state.countdown > 0) {
        play('countdownTick');
      } else {
        play('countdownGo');
      }
    }

    if (state.phase === 'playing' && prev.phase === 'playing') {
      for (const player of state.players) {
        const was = prev.players.find((p) => p.id === player.id);
        if (!was) continue;

        const lostLife = player.lives < was.lives;
        const newlyEliminated = !was.eliminated && player.eliminated;
        if (!lostLife && !newlyEliminated) continue;

        if (!playerId || player.id === playerId) {
          play('lifeLost');
        }
      }
    }

    if (prev.phase !== 'winner' && state.phase === 'winner' && state.winnerId) {
      play('win');
    }

    prevRef.current = state;
  }, [state, playerId, play]);
}
