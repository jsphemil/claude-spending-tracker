// Concentric double-ring: the outer ring fills 0-100% as spend approaches
// income (or owed approaches a credit limit); past 100% an inner ring in
// warning red fills a second time for the overage, reading as a literal
// second lap around the circle (confirmed design, see Phase 7 planning).
export function BalanceRing({
  lap1Percent,
  lap2Percent,
  isOverLimit,
  centerLabel,
  centerValue,
  size = 176,
}: {
  lap1Percent: number;
  lap2Percent: number;
  isOverLimit: boolean;
  centerLabel: string;
  centerValue: string;
  size?: number;
}) {
  const strokeWidth = 14;
  const gap = 5;
  const cx = size / 2;
  const cy = size / 2;
  const r1 = size / 2 - strokeWidth;
  const r2 = r1 - strokeWidth - gap;
  const c1 = 2 * Math.PI * r1;
  const c2 = 2 * Math.PI * r2;

  const lap1Color = isOverLimit ? "#f97316" : "#3b82f6";

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={cx} cy={cy} r={r1} fill="none" stroke="#e4e4e7" strokeWidth={strokeWidth} />
        <circle
          cx={cx}
          cy={cy}
          r={r1}
          fill="none"
          stroke={lap1Color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={c1}
          strokeDashoffset={c1 - (lap1Percent / 100) * c1}
        />
        {lap2Percent > 0 && (
          <>
            <circle cx={cx} cy={cy} r={r2} fill="none" stroke="#fecaca" strokeWidth={strokeWidth} />
            <circle
              cx={cx}
              cy={cy}
              r={r2}
              fill="none"
              stroke="#ef4444"
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={c2}
              strokeDashoffset={c2 - (lap2Percent / 100) * c2}
            />
          </>
        )}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center px-4 text-center">
        <p className="text-xs text-zinc-500">{centerLabel}</p>
        <p className="text-lg font-semibold text-zinc-900">{centerValue}</p>
        {isOverLimit && <p className="mt-0.5 text-xs font-medium text-red-600">Over</p>}
      </div>
    </div>
  );
}
