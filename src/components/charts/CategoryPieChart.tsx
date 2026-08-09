"use client";

import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { formatMoney } from "@/lib/services/format";

export function CategoryPieChart({
  data,
  currency = "INR",
}: {
  data: { name: string; value: number; color: string }[];
  currency?: string;
}) {
  if (data.length === 0) {
    return <p className="text-sm text-zinc-500">No data for this period.</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={240}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={2}>
          {data.map((entry) => (
            <Cell key={entry.name} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip formatter={(value) => formatMoney(Number(value ?? 0), currency)} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}
