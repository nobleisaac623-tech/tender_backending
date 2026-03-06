import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  published: 'Published',
  closed: 'Closed',
  evaluated: 'Evaluated',
  awarded: 'Awarded',
};

const STATUS_COLORS: Record<string, string> = {
  draft: '#9ca3af',
  published: '#2563eb',
  closed: '#f97316',
  evaluated: '#9333ea',
  awarded: '#22c55e',
};

interface DataItem {
  status: string;
  count: number;
}

interface Props {
  data: DataItem[];
  isEmpty: boolean;
}

export function TendersByStatusChart({ data, isEmpty }: Props) {
  const chartData = data.map((d) => ({
    ...d,
    label: STATUS_LABELS[d.status] ?? d.status,
  }));

  if (isEmpty) {
    return (
      <div className="flex h-[280px] items-center justify-center text-sm text-gray-500">
        No data yet
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={chartData} margin={{ top: 16, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 12, fill: '#6b7280' }}
          tickLine={false}
          axisLine={{ stroke: '#e5e7eb' }}
        />
        <YAxis
          tick={{ fontSize: 12, fill: '#6b7280' }}
          tickLine={false}
          axisLine={false}
          allowDecimals={false}
        />
        <Tooltip
          contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
          formatter={(value: number) => [value, 'Count']}
          labelFormatter={(label) => label}
        />
        <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={48} label={{ position: 'top', fontSize: 12 }}>
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.status] ?? '#6b7280'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
