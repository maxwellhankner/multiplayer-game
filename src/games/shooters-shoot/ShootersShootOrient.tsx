import { showsAsLandscapeReady } from '../../../shared/games/bots';
import RotatePhonePrompt from '../coin-rush/RotatePhonePrompt';

export default function ShootersShootOrient() {
  return (
    <div className="shooters-shoot-orient" aria-hidden>
      <div className="shooters-shoot-orient-center">
        <RotatePhonePrompt />
        <p className="shooters-shoot-orient-hint">Last one standing</p>
      </div>
    </div>
  );
}

export { showsAsLandscapeReady };
