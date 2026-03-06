import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
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

export function BidsPerTenderChart({ data, isEmpty }: Props) {
  const chartData = data.map((d) => ({
    ...d,
    shortTitle: truncate(d.tender_title),
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
          contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
          formatter={(value: number) => [value, 'Bids']}
          labelFormatter={(_, payload) => payload[0]?.payload?.tender_title ?? ''}
        />
        <Bar dataKey="bid_count" radius={[0, 4, 4, 0]} maxBarSize={24} fill="url(#bidsPerTenderGrad)">
          <defs>
            <linearGradient id="bidsPerTenderGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#60a5fa" />
            </linearGradient>
          </defs>
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
