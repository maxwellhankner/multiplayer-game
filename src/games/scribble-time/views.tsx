import { useCallback, useState } from 'react';
import MobileControllerCountdown from '../../components/mobile/MobileControllerCountdown';
import { SCRIBBLE_PROMPT_MAX_LENGTH } from '../../../shared/games/scribble-time/constants';
import type { ScribbleStroke, RoomState } from '../../../shared/types';
import type { GameControllerProps, GameHostProps } from '../types';
import ScribbleDrawPad, { ScribblePreview } from './ScribbleDrawPad';
import ScribbleHostView from './ScribbleHostView';
import ScribbleWinner from './ScribbleWinner';

function playerName(state: RoomState, id: string | null): string {
  if (!id) return 'Player';
  return state.players.find((p) => p.id === id)?.name ?? 'Player';
}

export function ScribbleTimeHostView({ state }: GameHostProps) {
  if (state.phase === 'winner') {
    return (
      <>
        <ScribbleHostView state={state} />
        <ScribbleWinner state={state} />
      </>
    );
  }
  if (state.phase === 'countdown' || state.phase === 'playing') {
    return <ScribbleHostView state={state} />;
  }
  return null;
}

export function ScribbleTimeControllerView({
  state,
  playerId,
  onScribblePrompt,
  onScribbleDraw,
  onScribblePick,
}: GameControllerProps) {
  const [promptDraft, setPromptDraft] = useState('');
  const [promptSubmitted, setPromptSubmitted] = useState(false);
  const [submittedDraw, setSubmittedDraw] = useState(false);

  const isPrompter = state.scribblePrompterId === playerId;
  const phase = state.scribblePhase;

  const submitDraw = useCallback(
    (strokes: ScribbleStroke[]) => {
      if (submittedDraw) return;
      setSubmittedDraw(true);
      onScribbleDraw?.(strokes);
    },
    [onScribbleDraw, submittedDraw],
  );

  if (state.phase === 'countdown') {
    return (
      <MobileControllerCountdown
        count={state.countdown > 0 ? state.countdown : 'GO!'}
        hint="Scribble Time starting soon"
      />
    );
  }

  if (state.phase !== 'playing' || !phase) {
    return null;
  }

  if (phase === 'prompt') {
    if (isPrompter && !promptSubmitted) {
      return (
        <div className="scribble-controller scribble-controller--prompt">
          <label className="scribble-prompt-question" htmlFor="scribble-prompt-input">
            What do you want people to draw?
          </label>
          <div className="scribble-prompt-field-group">
            <input
              id="scribble-prompt-input"
              type="text"
              className="scribble-prompt-field"
              value={promptDraft}
              maxLength={SCRIBBLE_PROMPT_MAX_LENGTH}
              placeholder="e.g. a cat on a skateboard"
              autoComplete="off"
              onChange={(e) => setPromptDraft(e.target.value)}
            />
            <p className="scribble-prompt-count">
              {promptDraft.length}/{SCRIBBLE_PROMPT_MAX_LENGTH}
            </p>
          </div>
          <button
            type="button"
            className="btn btn-primary btn-large scribble-prompt-submit"
            disabled={!promptDraft.trim()}
            onClick={() => {
              setPromptSubmitted(true);
              onScribblePrompt?.(promptDraft.trim());
            }}
          >
            Submit
          </button>
        </div>
      );
    }

    if (isPrompter) {
      return (
        <div className="controller-game-eliminated">
          <p className="controller-game-eliminated-title">Prompt sent!</p>
          <p className="controller-game-eliminated-detail">Waiting for artists…</p>
        </div>
      );
    }

    return (
      <div className="controller-game-eliminated">
        <p className="controller-game-eliminated-title">
          {playerName(state, state.scribblePrompterId)} is writing a prompt
        </p>
        <p className="controller-game-eliminated-detail">Hang tight…</p>
      </div>
    );
  }

  if (phase === 'draw') {
    if (isPrompter) {
      return (
        <div className="controller-game-eliminated">
          <p className="controller-game-eliminated-title">Everyone is drawing!</p>
          <p className="controller-game-eliminated-detail">
            You wrote: &ldquo;{state.scribblePrompt}&rdquo;
          </p>
          <p className="controller-game-eliminated-detail">
            {state.scribbleDrawSecondsLeft}s left
          </p>
        </div>
      );
    }

    return (
      <div className="scribble-controller scribble-controller--draw">
        <ScribbleDrawPad
          prompt={state.scribblePrompt ?? 'Draw!'}
          secondsLeft={state.scribbleDrawSecondsLeft}
          submitted={submittedDraw}
          onSubmit={submitDraw}
        />
      </div>
    );
  }

  if (phase === 'pick') {
    if (isPrompter) {
      return (
        <div className="scribble-controller scribble-controller--pick">
          <h2 className="scribble-pick-title">Pick your favorite drawing</h2>
          <p className="scribble-pick-hint">Tap the best match for your prompt</p>
          <div className="scribble-pick-grid">
            {state.scribbleDrawings.map((d) => (
              <ScribblePreview
                key={d.playerId}
                strokes={d.strokes}
                label={playerName(state, d.playerId)}
                variant="mobile"
                onClick={() => onScribblePick?.(d.playerId)}
              />
            ))}
          </div>
        </div>
      );
    }

    return (
      <div className="controller-game-eliminated">
        <p className="controller-game-eliminated-title">
          {playerName(state, state.scribblePrompterId)} is choosing a winner
        </p>
        <p className="controller-game-eliminated-detail">Watch the main screen</p>
      </div>
    );
  }

  return null;
}
