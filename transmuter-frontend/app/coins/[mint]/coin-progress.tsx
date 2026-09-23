export function CoinProgress({ value, label }: { value: number; label: string }) {
  const width = Math.min(100, Math.max(0, value));

  return (
    <div
      className="coin-progress"
      role="progressbar"
      aria-valuenow={width}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <i style={{ width: `${width}%` }} />
    </div>
  );
}
