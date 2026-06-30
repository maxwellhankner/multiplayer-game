import type { GameClientModule } from '../types';
import { CoinRushControllerView, CoinRushHostView } from './views';

export const coinRushClient: GameClientModule = {
  id: 'coin-rush',
  themeClass: 'coin-rush',
  HostView: CoinRushHostView,
  ControllerView: CoinRushControllerView,
};
