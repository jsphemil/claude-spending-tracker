// Slim gauge ring, replacing the old thick Recharts pie for the Dashboard's
// hero figure — colors are set via inline `style` (not SVG attributes) so
// the CSS custom properties resolve reliably across browsers.
const RADIUS = 64;
const STROKE = 12;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function NetWorthRing({
  usedFraction,
  centerLabel,
  centerValue,
  centerSubtext,
}: {
  /** 0–1, clamped. Null renders an empty track (nothing available to gauge). */
  usedFraction: number | null;
  centerLabel: string;
  centerValue: string;
  centerSubtext?: string;
}) {
  const used = usedFraction === null ? 0 : Math.max(0, Math.min(1, usedFraction));
  const usedLength = used * CIRCUMFERENCE;
  const availableLength = CIRCUMFERENCE - usedLength;

  return (
    <div className="flex items-center gap-5">
      <svg width="128" height="128" viewBox="0 0 148 148" className="shrink-0">
        <circle cx="74" cy="74" r={RADIUS} fill="none" style={{ stroke: "var(--surface-3)" }} strokeWidth={STROKE} />
        {usedFraction !== null && (
          <>
            <circle
              cx="74"
              cy="74"
              r={RADIUS}
              fill="none"
              style={{ stroke: "var(--danger)" }}
              strokeWidth={STROKE}
              strokeDasharray={`${usedLength} ${CIRCUMFERENCE}`}
              strokeLinecap="round"
              transform="rotate(-90 74 74)"
            />
            <circle
              cx="74"
              cy="74"
              r={RADIUS}
              fill="none"
              style={{ stroke: "var(--success)" }}
              strokeWidth={STROKE}
              strokeDasharray={`${availableLength} ${CIRCUMFERENCE}`}
              strokeDashoffset={-usedLength}
              strokeLinecap="round"
              transform="rotate(-90 74 74)"
            />
          </>
        )}
      </svg>
      <div>
        <p className="text-xs text-fg-muted">{centerLabel}</p>
        <p className="font-data text-2xl font-semibold tabular-nums text-fg">{centerValue}</p>
        {centerSubtext && <p className="mt-0.5 text-xs text-fg-muted">{centerSubtext}</p>}
        <div className="mt-3 flex gap-4">
          <div className="flex items-center gap-1.5 text-xs text-fg-muted">
            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: "var(--danger)" }} />
            Used
          </div>
          <div className="flex items-center gap-1.5 text-xs text-fg-muted">
            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: "var(--success)" }} />
            Available
          </div>
        </div>
      </div>
    </div>
  );
}
