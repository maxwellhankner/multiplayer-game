import { ScribbleTimeControllerView, ScribbleTimeHostView } from './views';
import type { GameClientModule } from '../types';

export const scribbleTimeClient: GameClientModule = {
  id: 'scribble-time',
  themeClass: 'scribble-time',
  HostView: ScribbleTimeHostView,
  ControllerView: ScribbleTimeControllerView,
};
