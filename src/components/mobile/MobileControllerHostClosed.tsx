import PlatformControllerShell from './PlatformControllerShell';

interface MobileControllerHostClosedProps {
  onBackToJoin: () => void;
}

export default function MobileControllerHostClosed({ onBackToJoin }: MobileControllerHostClosedProps) {
  return (
    <PlatformControllerShell className="controller-host-closed">
      <div className="boot-screen">
        <h1 className="boot-title">Lobby closed</h1>
        <p className="status-msg">
          This lobby is closed. Please wait for it to come back online.
        </p>
        <button type="button" className="btn btn-primary btn-large" onClick={onBackToJoin}>
          Back to join screen
        </button>
      </div>
    </PlatformControllerShell>
  );
}
