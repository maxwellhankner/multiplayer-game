import type { GameClientModule } from '../types';
import { ButtonHoldControllerView, ButtonHoldHostView } from './views';

export const buttonHoldClient: GameClientModule = {
  id: 'button-hold',
  themeClass: 'button-hold',
  HostView: ButtonHoldHostView,
  ControllerView: ButtonHoldControllerView,
};
