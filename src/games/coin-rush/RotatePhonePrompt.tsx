interface RotatePhonePromptProps {
  compact?: boolean;
}

export default function RotatePhonePrompt({ compact = false }: RotatePhonePromptProps) {
  return (
    <div
      className={`coin-rush-rotate-prompt${compact ? ' coin-rush-rotate-prompt--compact' : ''}`}
      role="status"
      aria-live="polite"
    >
      <div className="coin-rush-rotate-icon" aria-hidden>
        <div className="coin-rush-rotate-phone">
          <div className="coin-rush-rotate-screen" />
        </div>
      </div>
      <p className="coin-rush-rotate-text">Rotate your phone sideways</p>
      <p className="coin-rush-rotate-sub">Hold landscape to continue</p>
    </div>
  );
}
