import { useRef, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function CTABanner() {
  const sectionRef = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setVisible(true);
        });
      },
      { threshold: 0.2 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="px-4 py-20 transition-all duration-[600ms] ease-out"
      style={{
        background: 'linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(20px)',
      }}
    >
      <div className="mx-auto max-w-3xl text-center">
        <Sparkles className="mx-auto mb-4 h-12 w-12 text-white" />
        <h2 className="text-3xl font-bold text-white sm:text-4xl">
          Ready to Grow Your Business?
        </h2>
        <p className="mt-3 text-lg text-white/90">
          Join hundreds of suppliers competing for contracts on a fair, transparent platform.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <Link to="/register">
            <Button
              size="lg"
              className="bg-white font-bold text-[#1e3a5f] hover:bg-gray-100"
            >
              Register as Supplier
            </Button>
          </Link>
          <Link to="/#tenders">
            <Button
              size="lg"
              variant="outline"
              className="border-2 border-white font-semibold text-white hover:bg-white/10"
            >
              Browse Open Tenders
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
