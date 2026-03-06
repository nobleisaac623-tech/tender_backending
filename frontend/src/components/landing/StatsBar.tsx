import { useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { analyticsService } from '@/services/analytics';
import { useCountUp } from '@/hooks/useCountUp';
import { FileText, Users, Send, Award } from 'lucide-react';

const STATS = [
  {
    key: 'tenders',
    icon: FileText,
    label: 'Total Tenders Published',
    suffix: '+',
  },
  {
    key: 'suppliers',
    icon: Users,
    label: 'Registered Suppliers',
    suffix: '+',
  },
  {
    key: 'bids',
    icon: Send,
    label: 'Bids Submitted',
    suffix: '+',
  },
  {
    key: 'awards',
    icon: Award,
    label: 'Successful Awards',
    suffix: '+',
  },
] as const;

export function StatsBar() {
  const sectionRef = useRef<HTMLElement>(null);
  const { data, isLoading } = useQuery({
    queryKey: ['analytics'],
    queryFn: () => analyticsService.getAnalytics(),
    retry: false,
  });

  const tenders = data?.summary?.total_tenders ?? 12;
  const suppliers = data?.summary?.total_suppliers ?? 48;
  const bids = data?.summary?.total_bids ?? 156;
  const awards =
    data?.tenders_by_status?.find((t: { status: string }) => t.status === 'awarded')?.count ?? 23;

  const counts = [tenders, suppliers, bids, awards];

  const c1 = useCountUp(counts[0], 2000, false);
  const c2 = useCountUp(counts[1], 2000, false);
  const c3 = useCountUp(counts[2], 2000, false);
  const c4 = useCountUp(counts[3], 2000, false);
  const counterRefs = [c1, c2, c3, c4];
  const startRef = useRef<(() => void)[]>([]);
  startRef.current = [c1.start, c2.start, c3.start, c4.start];

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
            startRef.current.forEach((fn) => fn());
          }
        });
      },
      { threshold: 0.5 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="bg-[#1e3a5f] px-4 py-12"
    >
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-8 md:grid-cols-4 md:gap-4">
        {STATS.map((stat, i) => {
          const Icon = stat.icon;
          const counter = counterRefs[i];
          const value = isLoading ? counts[i] : counter.count;
          return (
            <div
              key={stat.key}
              className="flex flex-col items-center text-center"
            >
              <Icon className="mb-2 h-8 w-8 text-white/80" />
              <span className="text-4xl font-bold text-white md:text-5xl">
                {value}
                {stat.suffix}
              </span>
              <span className="mt-1 text-sm text-gray-300">{stat.label}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
