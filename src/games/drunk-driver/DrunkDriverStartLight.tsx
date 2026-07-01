import type { RoomState } from '../../../shared/types';
import GamePhaseStart from '../shared/GamePhaseStart';
import { DrunkDriverSpotlight } from './DrunkDriverPaneGrid';

interface DrunkDriverStartLightProps {
  state: RoomState;
}

export default function DrunkDriverStartLight({ state }: DrunkDriverStartLightProps) {
  return (
    <GamePhaseStart hint="First across the line wins">
      <DrunkDriverSpotlight countdown={state.countdown > 0 ? state.countdown : 1} />
    </GamePhaseStart>
  );
}
