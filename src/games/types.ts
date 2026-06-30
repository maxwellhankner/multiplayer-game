import type { ComponentType } from 'react';
import type { RoomState } from '../../shared/types';

export interface GameHostProps {
  state: RoomState;
}

export interface GameControllerProps {
  state: RoomState;
  playerId: string;
  onJump?: () => void;
  onTap?: () => void;
  onHoldStart?: () => void;
  onHoldEnd?: () => void;
}

export interface GameClientModule {
  id: string;
  themeClass: string;
  HostView: ComponentType<GameHostProps>;
  ControllerView: ComponentType<GameControllerProps> | null;
}
