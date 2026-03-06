import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface Props {
  completed: number;
  pending: number;
  isEmpty: boolean;
}

const COLORS = { completed: '#10b981', pending: '#f59e0b' };

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

  const completedPct = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="relative h-[280px] w-full">
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
            labelLine={false}
            animationDuration={800}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
          contentStyle={{
            borderRadius: '8px',
            border: '1px solid #e5e7eb',
            backgroundColor: '#fff',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          }}
          formatter={(value: number | undefined) => {
            const v = value ?? 0;
            const pct = total > 0 ? Math.round((v / total) * 100) : 0;
            return [`${v} (${pct}%)`, ''];
          }}
        />
        <Legend verticalAlign="bottom" height={36} />
      </PieChart>
    </ResponsiveContainer>
      <div className="absolute left-1/2 top-[45%] -translate-x-1/2 -translate-y-1/2 text-2xl font-bold text-[#0f172a]">
        {completedPct}%
      </div>
    </div>
  );
}
