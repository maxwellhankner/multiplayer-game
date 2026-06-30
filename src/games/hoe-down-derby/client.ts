import type { GameClientModule } from '../types';
import { HoeDownControllerView, HoeDownHostView } from './views';

export const hoeDownDerbyClient: GameClientModule = {
  id: 'hoe-down-derby',
  themeClass: 'hoe-down-derby',
  HostView: HoeDownHostView,
  ControllerView: HoeDownControllerView,
};
