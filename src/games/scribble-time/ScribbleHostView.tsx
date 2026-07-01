import type { RoomState } from '../../../shared/types';
import { ScribblePreview } from './ScribbleDrawPad';

interface ScribbleHostViewProps {
  state: RoomState;
}

function playerName(state: RoomState, id: string | null): string {
  if (!id) return 'Someone';
  return state.players.find((p) => p.id === id)?.name ?? 'Player';
}

export default function ScribbleHostView({ state }: ScribbleHostViewProps) {
  const phase = state.scribblePhase;
  const prompterName = playerName(state, state.scribblePrompterId);

  if (state.phase === 'countdown') {
    return (
      <div className="scribble-host scribble-host--center">
        <h2 className="scribble-host-title">Scribble Time</h2>
        <p className="scribble-host-status">Round starting…</p>
      </div>
    );
  }

  if (phase === 'prompt') {
    return (
      <div className="scribble-host scribble-host--center">
        <h2 className="scribble-host-title">Scribble Time</h2>
        <p className="scribble-host-status">
          Waiting for <strong>{prompterName}</strong> to write a prompt…
        </p>
      </div>
    );
  }

  if (phase === 'draw' && state.scribblePrompt) {
    return (
      <div className="scribble-host scribble-host--center">
        <p className="scribble-host-eyebrow">Draw this</p>
        <h2 className="scribble-host-prompt">{state.scribblePrompt}</h2>
        <p className="scribble-host-status">
          {state.scribbleDrawSecondsLeft}s remaining
        </p>
      </div>
    );
  }

  if (phase === 'pick' || state.phase === 'winner') {
    const drawings = state.scribbleDrawings;
    return (
      <div className="scribble-host scribble-host--gallery">
        <div className="scribble-host-gallery-header">
          <p className="scribble-host-eyebrow">Prompt</p>
          <h2 className="scribble-host-prompt">{state.scribblePrompt}</h2>
          {phase === 'pick' && (
            <p className="scribble-host-status">
              {prompterName} is picking a favorite…
            </p>
          )}
        </div>
        <div className="scribble-host-grid">
          {drawings.map((d) => (
            <div key={d.playerId} className="scribble-host-grid-item">
              <ScribblePreview
                strokes={d.strokes}
                label={playerName(state, d.playerId)}
                variant="host"
              />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="scribble-host scribble-host--center">
      <p className="scribble-host-status">Scribble Time</p>
    </div>
  );
}
