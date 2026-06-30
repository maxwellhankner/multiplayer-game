interface MobileControllerCountdownProps {
  count: number | string;
  hint: string;
}

export default function MobileControllerCountdown({ count, hint }: MobileControllerCountdownProps) {
  return (
    <div className="controller-game-center">
      <div className="countdown-mobile">{count}</div>
      <p className="controller-game-hint">{hint}</p>
    </div>
  );
}
