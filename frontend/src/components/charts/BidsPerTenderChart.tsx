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

const MAX_TITLE_LEN = 20;

function truncate(s: string): string {
  if (s.length <= MAX_TITLE_LEN) return s;
  return s.slice(0, MAX_TITLE_LEN - 3) + '...';
}

interface DataItem {
  tender_title: string;
  bid_count: number;
}

interface Props {
  data: DataItem[];
  isEmpty: boolean;
}

function getBarColor(maxCount: number, count: number): string {
  if (maxCount <= 0) return '#bfdbfe';
  const t = maxCount > 0 ? count / maxCount : 0;
  // Interpolate from #bfdbfe (light) to #1e40af (dark)
  const r = Math.round(191 - (191 - 30) * t);
  const g = Math.round(219 - (219 - 64) * t);
  const b = Math.round(254 - (254 - 175) * t);
  return `rgb(${r},${g},${b})`;
}

export function BidsPerTenderChart({ data, isEmpty }: Props) {
  const chartData = data.map((d) => ({
    ...d,
    shortTitle: truncate(d.tender_title),
  }));
  const maxCount = Math.max(0, ...chartData.map((d) => d.bid_count));

  if (isEmpty) {
    return (
      <div className="flex h-[280px] items-center justify-center text-sm text-gray-500">
        No data yet
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart
        data={chartData}
        layout="vertical"
        margin={{ top: 8, right: 24, left: 8, bottom: 8 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
        <XAxis type="number" tick={{ fontSize: 12, fill: '#6b7280' }} allowDecimals={false} />
        <YAxis
          type="category"
          dataKey="shortTitle"
          width={120}
          tick={{ fontSize: 11, fill: '#6b7280' }}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip
          contentStyle={{
            borderRadius: '8px',
            border: '1px solid #e5e7eb',
            backgroundColor: '#fff',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          }}
          formatter={(value: number | undefined) => [value ?? 0, 'Bids']}
          labelFormatter={(_, payload) => payload[0]?.payload?.tender_title ?? ''}
        />
        <Bar
          dataKey="bid_count"
          radius={[0, 6, 6, 0]}
          maxBarSize={24}
          animationDuration={800}
        >
          {chartData.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={getBarColor(maxCount, entry.bid_count)}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
