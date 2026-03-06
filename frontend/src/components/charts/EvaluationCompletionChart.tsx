import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface Props {
  completed: number;
  pending: number;
  isEmpty: boolean;
}

const COLORS = { completed: '#22c55e', pending: '#f97316' };

export function EvaluationCompletionChart({ completed, pending, isEmpty }: Props) {
  const total = completed + pending;
  const data = [
    { name: 'Completed', value: completed, color: COLORS.completed },
    { name: 'Pending', value: pending, color: COLORS.pending },
  ].filter((d) => d.value > 0);

  if (isEmpty || total === 0) {
    return (
      <div className="flex h-[280px] items-center justify-center text-sm text-gray-500">
        No data yet
      </div>
    );
  }

  const renderLabel = ({ name, value }: { name: string; value: number }) => {
    const pct = total > 0 ? Math.round((value / total) * 100) : 0;
    return `${pct}%`;
  };

  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="45%"
          innerRadius={60}
          outerRadius={90}
          paddingAngle={2}
          dataKey="value"
          label={renderLabel}
          labelLine={false}
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
          formatter={(value: number) => {
            const pct = total > 0 ? Math.round((value / total) * 100) : 0;
            return [`${value} (${pct}%)`, ''];
          }}
        />
        <Legend verticalAlign="bottom" height={36} />
      </PieChart>
    </ResponsiveContainer>
  );
}
