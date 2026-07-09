import { showsAsLandscapeReady } from '../../../shared/games/bots';
import RotatePhonePrompt from '../coin-rush/RotatePhonePrompt';

export default function ShotsFiredOrient() {
  return (
    <div className="shots-fired-orient" aria-hidden>
      <div className="shots-fired-orient-center">
        <RotatePhonePrompt />
        <p className="shots-fired-orient-hint">Hold landscape — then grab your pistol</p>
      </div>
    </div>
  );
}

export { showsAsLandscapeReady };
