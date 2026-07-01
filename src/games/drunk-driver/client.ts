import type { GameClientModule } from '../types';
import { DrunkDriverControllerView, DrunkDriverHostView } from './views';

export const drunkDriverClient: GameClientModule = {
  id: 'drunk-driver',
  themeClass: 'drunk-driver',
  HostView: DrunkDriverHostView,
  ControllerView: DrunkDriverControllerView,
};
