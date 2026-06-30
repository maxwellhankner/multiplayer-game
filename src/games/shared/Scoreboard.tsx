import type { RoomState } from '../../../shared/types';
import { getSecondsLeft } from '../shared/simple-game';

interface ScoreboardProps {
  state: RoomState;
  title: string;
  scoreLabel: (score: number) => string;
}

export default function Scoreboard({ state, title, scoreLabel }: ScoreboardProps) {
  const secondsLeft = getSecondsLeft(state.gameTime);
  const sorted = [...state.players].sort((a, b) => b.score - a.score);

  return (
    <div className="simple-game-host">
      <div className="simple-game-host-header">
        <h1>{title}</h1>
        {state.phase === 'countdown' && (
          <div className="simple-game-timer">{state.countdown > 0 ? state.countdown : 'GO!'}</div>
        )}
        {state.phase === 'playing' && (
          <div className="simple-game-timer">{secondsLeft}s</div>
        )}
      </div>
      <ul className="simple-game-scores">
        {sorted.map((p) => (
          <li key={p.id}>
            <span className="player-dot" style={{ background: p.color }} />
            <span className="simple-game-player-name">{p.name}</span>
            <span className="simple-game-player-score">{scoreLabel(p.score)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
