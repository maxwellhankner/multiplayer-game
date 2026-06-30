import type { GameClientModule } from '../types';
import { TapCounterControllerView, TapCounterHostView } from './views';

export const tapCounterClient: GameClientModule = {
  id: 'tap-counter',
  themeClass: 'tap-counter',
  HostView: TapCounterHostView,
  ControllerView: TapCounterControllerView,
};
