import React from "react";
import { LineChart, Line, ResponsiveContainer } from "recharts";

export function SparklineChart({ data, color, dataKey }) {
  if (!data || data.length === 0) return null;
  return (
    <ResponsiveContainer width="100%" height={32}>
      <LineChart data={data}>
        <Line
          type="monotone"
          dataKey={dataKey}
          stroke={color}
          strokeWidth={1.5}
          dot={false}
          isAnimationActive={true}
          animationDuration={1500}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
