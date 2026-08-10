"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { formatMoney } from "@/lib/services/format";

export function CategoryPieChart({
  data,
  currency = "INR",
  centerLabel,
  centerValue,
  centerSubtext,
  showDataLabels = false,
  height = 260,
}: {
  data: { name: string; value: number; color: string }[];
  currency?: string;
  /** Small label above the center value, e.g. a month name. */
  centerLabel?: string;
  /** Main figure shown in the donut's hole, e.g. net worth or balance. */
  centerValue?: string;
  /** Small text below the center value, e.g. "22% of available spent". */
  centerSubtext?: string;
  /** Show the amount directly on each slice, not just in the tooltip. */
  showDataLabels?: boolean;
  height?: number;
}) {
  if (data.length === 0) {
    return <p className="text-sm text-zinc-500">No data for this period.</p>;
  }

  return (
    <div>
      <div className="relative" style={{ height }}>
        <ResponsiveContainer width="100%" height={height}>
          <PieChart margin={{ top: 16, right: 24, bottom: 16, left: 24 }}>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius={60}
              outerRadius={90}
              paddingAngle={2}
              label={showDataLabels ? (entry) => formatMoney(Number(entry.value), currency) : false}
            >
              {data.map((entry) => (
                <Cell key={entry.name} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip formatter={(value) => formatMoney(Number(value ?? 0), currency)} />
          </PieChart>
        </ResponsiveContainer>
        {centerValue && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-4 text-center">
            {centerLabel && <p className="text-xs text-zinc-500">{centerLabel}</p>}
            <p className="text-lg font-semibold text-zinc-900">{centerValue}</p>
            {centerSubtext && <p className="mt-0.5 text-xs text-zinc-500">{centerSubtext}</p>}
          </div>
        )}
      </div>
      <div className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1">
        {data.map((d) => (
          <div key={d.name} className="flex items-center gap-1.5 text-xs text-zinc-600">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: d.color }} />
            {d.name}
          </div>
        ))}
      </div>
    </div>
  );
}
