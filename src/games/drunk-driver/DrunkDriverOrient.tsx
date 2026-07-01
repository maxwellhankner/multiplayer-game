import type { RoomState } from '../../../shared/types';
import DrunkDriverPaneGrid from './DrunkDriverPaneGrid';
import RotatePhonePrompt from '../coin-rush/RotatePhonePrompt';

interface DrunkDriverOrientProps {
  state: RoomState;
}

export default function DrunkDriverOrient({ state }: DrunkDriverOrientProps) {
  return (
    <div className="drunk-driver-orient">
      <DrunkDriverPaneGrid players={state.players} mode="orient" />
      <div className="drunk-driver-orient-center" aria-live="polite">
        <RotatePhonePrompt />
      </div>
    </div>
  );
}
