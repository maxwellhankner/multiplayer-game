import type { RoomState } from '../../../shared/types';
import CoinRushPaneGrid from './CoinRushPaneGrid';
import RotatePhonePrompt from './RotatePhonePrompt';

interface CoinRushOrientProps {
  state: RoomState;
}

export default function CoinRushOrient({ state }: CoinRushOrientProps) {
  return (
    <div className="coin-rush-orient">
      <CoinRushPaneGrid players={state.players} mode="orient" />
      <div className="coin-rush-orient-center" aria-live="polite">
        <RotatePhonePrompt />
      </div>
    </div>
  );
}
