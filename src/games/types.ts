import type { ComponentType } from 'react';
import type { BalloonInput, CoinStickInput, DrunkDriverInput, RoomState, ScribbleStroke } from '../../shared/types';

export interface GameHostProps {
  state: RoomState;
}

export interface GameControllerProps {
  state: RoomState;
  playerId: string;
  onJump?: () => void;
  onCoinInput?: (input: CoinStickInput) => void;
  onShotsFiredInput?: (input: CoinStickInput) => void;
  onShotsFiredShoot?: () => void;
  onShotsFiredMelee?: () => void;
  onShotsFiredJump?: () => void;
  onBalloonInput?: (input: BalloonInput) => void;
  onDrunkInput?: (input: DrunkDriverInput) => void;
  onScribblePrompt?: (prompt: string) => void;
  onScribbleDraw?: (strokes: ScribbleStroke[]) => void;
  onScribblePick?: (artistId: string) => void;
  onLandscapeReady?: () => void;
}

export interface GameClientModule {
  id: string;
  themeClass: string;
  HostView: ComponentType<GameHostProps>;
  ControllerView: ComponentType<GameControllerProps> | null;
}
