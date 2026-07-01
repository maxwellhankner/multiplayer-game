import type { RoomState } from '../../../shared/types';
import DrunkDriverPaneGrid, { DrunkDriverSpotlight } from './DrunkDriverPaneGrid';

interface DrunkDriverStartLightProps {
  state: RoomState;
}

export default function DrunkDriverStartLight({ state }: DrunkDriverStartLightProps) {
  return (
    <div className="drunk-driver-startlight">
      <DrunkDriverPaneGrid players={state.players} mode="startlight" />
      <DrunkDriverSpotlight countdown={state.countdown > 0 ? state.countdown : 1} />
    </div>
  );
}
