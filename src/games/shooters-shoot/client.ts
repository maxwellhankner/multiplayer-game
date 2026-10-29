import type { GameClientModule } from '../types';
import { ShootersShootControllerView, ShootersShootHostView } from './views';

export const shootersShootClient: GameClientModule = {
  id: 'shooters-shoot',
  themeClass: 'shooters-shoot',
  HostView: ShootersShootHostView,
  ControllerView: ShootersShootControllerView,
};
