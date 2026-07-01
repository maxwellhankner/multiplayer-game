import GamePhaseStart from '../shared/GamePhaseStart';
import RotatePhonePrompt from '../coin-rush/RotatePhonePrompt';

export default function DrunkDriverOrient() {
  return (
    <GamePhaseStart hint="Tilt your phone sideways to race">
      <RotatePhonePrompt compact />
    </GamePhaseStart>
  );
}
