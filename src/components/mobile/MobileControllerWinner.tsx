import type { RoomState } from '../../../shared/types';
import { getControllerWinMessage } from './getControllerWinMessage';
import PlatformControllerShell from './PlatformControllerShell';

interface MobileControllerWinnerProps {
  state: RoomState;
  playerId: string;
  meReady: boolean;
  waitingOnOthers: boolean;
  onLobbyReady: () => void;
}

export default function MobileControllerWinner({
  state,
  playerId,
  meReady,
  waitingOnOthers,
  onLobbyReady,
}: MobileControllerWinnerProps) {
  const { title, subtitle } = getControllerWinMessage(state, playerId);

  return (
    <PlatformControllerShell className="controller-winner">
      <h1 className="platform-title controller-winner-title">{title}</h1>
      {subtitle && <p className="hint controller-winner-subtitle">{subtitle}</p>}
      <div className="controller-lobby-footer">
        <button
          type="button"
          className="btn btn-primary btn-large"
          disabled={meReady}
          onClick={onLobbyReady}
        >
          Back to lobby
        </button>
        {waitingOnOthers && <p className="status-msg">Waiting for others…</p>}
      </div>
    </PlatformControllerShell>
  );
}
