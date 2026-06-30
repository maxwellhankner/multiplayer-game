import { useRoomSounds } from '../hooks/useRoomSounds';
import type { RoomState } from '../../shared/types';

interface RoomSoundsProps {
  state: RoomState | null;
  playerId?: string | null;
}

/** Invisible listener — plays SFX from room state changes. */
export default function RoomSounds({ state, playerId }: RoomSoundsProps) {
  useRoomSounds(state, playerId);
  return null;
}
