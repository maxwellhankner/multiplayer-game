import type { GameClientModule } from '../types';
import { ShotsFiredControllerView, ShotsFiredHostView } from './views';

export const shotsFiredClient: GameClientModule = {
  id: 'shots-fired',
  themeClass: 'shots-fired',
  HostView: ShotsFiredHostView,
  ControllerView: ShotsFiredControllerView,
};
