import type { GameClientModule } from '../types';
import { BalloonDropControllerView, BalloonDropHostView } from './views';

export const balloonDropClient: GameClientModule = {
  id: 'balloon-drop',
  themeClass: 'balloon-drop',
  HostView: BalloonDropHostView,
  ControllerView: BalloonDropControllerView,
};
