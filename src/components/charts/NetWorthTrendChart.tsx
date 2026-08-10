"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatMoney, formatMoneyCompact } from "@/lib/services/format";

export function NetWorthTrendChart({
  data,
  currency = "INR",
  height = 200,
}: {
  data: { label: string; value: number }[];
  currency?: string;
  height?: number;
}) {
  if (data.length === 0) {
    return <p className="text-sm text-fg-muted">Not enough history yet.</p>;
  }

  // Grid/axis use a translucent neutral (not a solid hex) so they stay
  // subtle against both light and dark surfaces without needing separate
  // per-theme values — the alpha blends into whichever background is under
  // it. The accent line color is theme-invariant by design (data ink, not
  // surface chrome), tuned to read on both.
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(140,144,160,0.25)" />
        <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#8b90a0" }} axisLine={false} tickLine={false} />
        <YAxis
          tick={{ fontSize: 11, fill: "#8b90a0" }}
          axisLine={false}
          tickLine={false}
          width={56}
          tickFormatter={(v) => formatMoneyCompact(Number(v), currency)}
        />
        <Tooltip
          formatter={(value) => formatMoney(Number(value ?? 0), currency)}
          contentStyle={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            fontSize: 12,
          }}
        />
        <Line
          type="monotone"
          dataKey="value"
          stroke="#7c6ef2"
          strokeWidth={2}
          dot={{ r: 3, fill: "#7c6ef2" }}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
