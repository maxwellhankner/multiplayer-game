import GamePhaseStart from '../shared/GamePhaseStart';
import RotatePhonePrompt from './RotatePhonePrompt';

export default function CoinRushOrient() {
  return (
    <GamePhaseStart hint="Hold your phone sideways to play">
      <RotatePhonePrompt compact />
    </GamePhaseStart>
  );
}
