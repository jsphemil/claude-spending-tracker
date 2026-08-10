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
    return <p className="text-sm text-zinc-500">Not enough history yet.</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" />
        <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#71717a" }} axisLine={false} tickLine={false} />
        <YAxis
          tick={{ fontSize: 11, fill: "#71717a" }}
          axisLine={false}
          tickLine={false}
          width={56}
          tickFormatter={(v) => formatMoneyCompact(Number(v), currency)}
        />
        <Tooltip formatter={(value) => formatMoney(Number(value ?? 0), currency)} />
        <Line
          type="monotone"
          dataKey="value"
          stroke="#0ea5e9"
          strokeWidth={2}
          dot={{ r: 3, fill: "#0ea5e9" }}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
