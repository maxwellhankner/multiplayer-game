interface MobileControllerCountdownProps {
  count: number | string;
  hint: string;
  /** When true, renders over game controls without blocking touches. */
  overlay?: boolean;
}

export default function MobileControllerCountdown({
  count,
  hint,
  overlay = false,
}: MobileControllerCountdownProps) {
  const content = (
    <>
      <div className="countdown-mobile">{count}</div>
      <p className="controller-game-hint">{hint}</p>
    </>
  );

  if (overlay) {
    return (
      <div className="controller-countdown-overlay" aria-live="polite">
        {content}
      </div>
    );
  }

  return <div className="controller-game-center">{content}</div>;
}
