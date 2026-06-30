import type { ComponentType } from 'react';
import type { BalloonInput, CoinStickInput, RoomState, ScribbleStroke } from '../../shared/types';

export interface GameHostProps {
  state: RoomState;
}

export interface GameControllerProps {
  state: RoomState;
  playerId: string;
  onJump?: () => void;
  onCoinInput?: (input: CoinStickInput) => void;
  onBalloonInput?: (input: BalloonInput) => void;
  onScribblePrompt?: (prompt: string) => void;
  onScribbleDraw?: (strokes: ScribbleStroke[]) => void;
  onScribblePick?: (artistId: string) => void;
}

export interface GameClientModule {
  id: string;
  themeClass: string;
  HostView: ComponentType<GameHostProps>;
  ControllerView: ComponentType<GameControllerProps> | null;
}
