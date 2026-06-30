import {
  getBalloonTeam,
  isBalloonTeamMode,
} from '../../../shared/games/balloon-drop/teams';
import type { PlayerState, RoomState } from '../../../shared/types';

interface BalloonDropWinnerProps {
  state: RoomState;
}

const TEAM_COLORS = ['#5dade2', '#f39c12'] as const;

function formatSeconds(ms: number): string {
  const s = Math.floor(ms / 1000);
  return `${s}s`;
}

function Confetti() {
  return (
    <div className="balloon-drop-confetti" aria-hidden>
      {Array.from({ length: 28 }, (_, i) => (
        <span
          key={i}
          className="balloon-drop-confetti-piece"
          style={{ ['--piece' as string]: i }}
        />
      ))}
    </div>
  );
}

function FloatingBalloons() {
  return (
    <div className="balloon-drop-winner-floaters" aria-hidden>
      <span className="balloon-drop-float-balloon balloon-drop-float-balloon--1" />
      <span className="balloon-drop-float-balloon balloon-drop-float-balloon--2" />
      <span className="balloon-drop-float-balloon balloon-drop-float-balloon--3" />
    </div>
  );
}

function PlayerChip({
  player,
  highlight,
}: {
  player: PlayerState;
  highlight?: boolean;
}) {
  return (
    <span className={`balloon-drop-winner-chip${highlight ? ' balloon-drop-winner-chip--win' : ''}`}>
      <span className="balloon-drop-winner-chip-dot" style={{ background: player.color }} />
      {player.name}
    </span>
  );
}

function TeamStandings({
  players,
  playerCount,
  winnerTeam,
}: {
  players: PlayerState[];
  playerCount: number;
  winnerTeam: number | null;
}) {
  const teams = [0, 1] as const;

  return (
    <div className="balloon-drop-winner-teams">
      {teams.map((team) => {
        const members = players
          .filter((p) => getBalloonTeam(p.lane, playerCount) === team)
          .sort((a, b) => a.lane - b.lane);
        if (members.length === 0) return null;
        const isWinner = winnerTeam === team;

        return (
          <div
            key={team}
            className={`balloon-drop-winner-team${isWinner ? ' balloon-drop-winner-team--win' : ''}`}
            style={{ ['--team-color' as string]: TEAM_COLORS[team] }}
          >
            <p className="balloon-drop-winner-team-label">Team {team + 1}</p>
            <div className="balloon-drop-winner-team-members">
              {members.map((p) => (
                <PlayerChip key={p.id} player={p} highlight={isWinner && !p.eliminated} />
              ))}
            </div>
            <p className="balloon-drop-winner-team-status">
              {isWinner ? 'Balloon survived' : 'Balloon popped'}
            </p>
          </div>
        );
      })}
    </div>
  );
}

function FfaStandings({ players, winnerId }: { players: PlayerState[]; winnerId: string | null }) {
  const sorted = [...players].sort((a, b) => {
    if (a.eliminated !== b.eliminated) return a.eliminated ? 1 : -1;
    return b.score - a.score;
  });

  return (
    <ul className="balloon-drop-winner-ffa">
      {sorted.map((p, i) => (
        <li
          key={p.id}
          className={`balloon-drop-winner-ffa-row${p.id === winnerId ? ' balloon-drop-winner-ffa-row--win' : ''}`}
        >
          <span className="balloon-drop-winner-ffa-rank">{i + 1}</span>
          <span className="balloon-drop-winner-chip-dot" style={{ background: p.color }} />
          <span className="balloon-drop-winner-ffa-name">{p.name}</span>
          <span className="balloon-drop-winner-ffa-status">
            {p.id === winnerId ? 'Winner' : p.eliminated ? 'Out' : 'Surviving'}
          </span>
        </li>
      ))}
    </ul>
  );
}

export default function BalloonDropWinner({ state }: BalloonDropWinnerProps) {
  const playerCount = state.players.length;
  const solo = playerCount === 1;
  const teamMode = isBalloonTeamMode(playerCount);
  const winner = state.winnerId ? state.players.find((p) => p.id === state.winnerId) : null;
  const winningTeam =
    winner && teamMode ? getBalloonTeam(winner.lane, playerCount) : null;

  if (solo) {
    const player = state.players[0];
    const seconds = formatSeconds(player?.score ?? state.gameTime);

    return (
      <div className="balloon-drop-winner-overlay" role="dialog" aria-label="Round results">
        <Confetti />
        <FloatingBalloons />
        <div className="balloon-drop-winner-card balloon-drop-winner-card--solo">
          <div className="balloon-drop-winner-hero-icon" aria-hidden>
            🎈
          </div>
          <p className="balloon-drop-winner-eyebrow">Solo run</p>
          <h2 className="balloon-drop-winner-title">Nice keepy-uppy!</h2>
          <p className="balloon-drop-winner-time">{seconds}</p>
          <p className="balloon-drop-winner-subtitle">You kept the balloon off the floor</p>
          <p className="balloon-drop-winner-hint">Tap Back to lobby on your phone to play again</p>
        </div>
      </div>
    );
  }

  const teamAccent =
    winningTeam !== null ? TEAM_COLORS[winningTeam] : undefined;

  return (
    <div className="balloon-drop-winner-overlay" role="dialog" aria-label="Round results">
      <Confetti />
      <FloatingBalloons />
      <div
        className="balloon-drop-winner-card"
        style={teamAccent ? { ['--win-accent' as string]: teamAccent } : undefined}
      >
        {winner ? (
          <>
            <div className="balloon-drop-winner-hero-icon" aria-hidden>
              🏆
            </div>
            <p className="balloon-drop-winner-eyebrow">
              {teamMode ? 'Team victory' : 'Winner'}
            </p>
            <h2 className="balloon-drop-winner-title">
              {teamMode
                ? `Team ${winningTeam! + 1} wins!`
                : `${winner.name} wins!`}
            </h2>
            {teamMode ? (
              <div className="balloon-drop-winner-hero-chips">
                {state.players
                  .filter((p) => getBalloonTeam(p.lane, playerCount) === winningTeam)
                  .sort((a, b) => a.lane - b.lane)
                  .map((p) => (
                    <PlayerChip key={p.id} player={p} highlight />
                  ))}
              </div>
            ) : (
              <div className="balloon-drop-winner-hero-chips">
                <PlayerChip player={winner} highlight />
              </div>
            )}
            <p className="balloon-drop-winner-subtitle">
              {teamMode
                ? 'Their balloon stayed in the air longest'
                : 'Last one with a balloon in the air'}
            </p>
          </>
        ) : (
          <>
            <div className="balloon-drop-winner-hero-icon" aria-hidden>
              🎈
            </div>
            <p className="balloon-drop-winner-eyebrow">Round over</p>
            <h2 className="balloon-drop-winner-title">It&apos;s a tie!</h2>
            <p className="balloon-drop-winner-subtitle">Every balloon hit the floor</p>
          </>
        )}

        <div className="balloon-drop-winner-standings">
          <p className="balloon-drop-winner-standings-label">Final standings</p>
          {teamMode ? (
            <TeamStandings
              players={state.players}
              playerCount={playerCount}
              winnerTeam={winningTeam}
            />
          ) : (
            <FfaStandings players={state.players} winnerId={state.winnerId} />
          )}
        </div>

        <p className="balloon-drop-winner-hint">Everyone tap Back to lobby on their phones</p>
      </div>
    </div>
  );
}
