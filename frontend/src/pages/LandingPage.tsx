import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { tendersService } from '@/services/tenders';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TenderFilterBar } from '@/components/tenders/TenderFilterBar';
import { CategoryBadge } from '@/components/tenders/CategoryBadge';
import { TagChip } from '@/components/tenders/TagChip';
import { HeroSlideshow } from '@/components/landing/HeroSlideshow';
import { StatsBar } from '@/components/landing/StatsBar';
import { Testimonials } from '@/components/landing/Testimonials';
import { ContactFormCard } from '@/components/landing/ContactFormCard';
import { HowItWorks } from '@/components/landing/HowItWorks';
import { CTABanner } from '@/components/landing/CTABanner';
import { Footer } from '@/components/landing/Footer';
import { getCategoryAsset, getTenderImage, getFallbackImage } from '@/utils/categoryAssets';
import { FileText, Clock } from 'lucide-react';

function Navbar() {
  const { user } = useAuth();
  const dashboardLink =
    user?.role === 'admin'
      ? '/admin/dashboard'
      : user?.role === 'evaluator'
        ? '/evaluator/dashboard'
        : user?.role === 'supplier'
          ? '/supplier/dashboard'
          : null;

  return (
    <nav className="sticky top-0 z-50 border-b border-gray-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-3 font-semibold text-primary">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-white">
            <FileText className="h-5 w-5" />
          </span>
          <span>Supplier Tender</span>
        </Link>
        <div className="flex items-center gap-4">
          <Link to="/#tenders" className="text-sm font-medium text-gray-600 hover:text-primary">
            Tenders
          </Link>
          <Link to="/#about" className="text-sm font-medium text-gray-600 hover:text-primary">
            About
          </Link>
          <Link to="/#contact" className="text-sm font-medium text-gray-600 hover:text-primary">
            Contact
          </Link>
          {user ? (
            <Link to={dashboardLink ?? '/'}>
              <Button variant="default">Dashboard</Button>
            </Link>
          ) : (
            <>
              <Link to="/login">
                <Button variant="ghost">Login</Button>
              </Link>
              <Link to="/register">
                <Button>Register</Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

function Countdown({ deadline }: { deadline: string }) {
  const end = new Date(deadline).getTime();
  const now = Date.now();
  const diff = Math.max(0, end - now);
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  if (diff <= 0) return <span className="text-amber-600">Closed</span>;
  return (
    <span className="text-sm text-gray-600">
      {days}d {hours}h left
    </span>
  );
}

function ActiveTenders() {
  const [filters, setFilters] = useState<{ category_id: number | null; search: string; tag: string }>({
    category_id: null,
    search: '',
    tag: '',
  });
  const { data: tenders, isLoading, error } = useQuery({
    queryKey: ['tenders', 'public', filters],
    queryFn: () => tendersService.listPublic({
      category_id: filters.category_id ?? undefined,
      search: filters.search || undefined,
      tag: filters.tag || undefined,
    }),
  });
  const { user } = useAuth();

  return (
    <section id="tenders" className="border-t border-gray-100 bg-gray-50/50 px-4 py-16">
      <div className="mx-auto max-w-6xl">
        <h2 className="text-2xl font-bold text-gray-900 sm:text-3xl">Active Tenders</h2>
        <p className="mt-2 text-gray-600">Browse open tenders and submit your bid before the deadline.</p>
        <TenderFilterBar
          filters={filters}
          onFilterChange={setFilters}
          total={tenders?.length}
        />
        {isLoading && (
          <div className="mt-8 flex justify-center">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        )}
        {error && (
          <p className="mt-4 text-red-600">Failed to load tenders. Please try again later.</p>
        )}
        {tenders && tenders.length === 0 && (
          <p className="mt-6 text-gray-500">No open tenders at the moment.</p>
        )}
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {tenders?.map((t) => {
            const asset = getCategoryAsset(t.category_name);
            return (
              <Link
                key={t.id}
                to={user?.role === 'supplier' ? `/supplier/tenders/${t.id}` : `/tender/${t.id}`}
                className="group flex flex-col overflow-hidden rounded-xl bg-white shadow-md transition-all hover:scale-[1.02] hover:shadow-lg"
              >
                <div className="relative h-40 overflow-hidden bg-slate-200">
                  <img
                    src={getTenderImage(t)}
                    alt={t.category_name ? `${t.category_name} category` : 'Tender category'}
                    className="h-full w-full object-cover object-center"
                    loading="lazy"
                    decoding="async"
                    onError={(e) => {
                      e.currentTarget.src = getFallbackImage({ id: t.id, title: t.title, category_name: t.category_name });
                    }}
                  />
                  <div
                    className="absolute inset-0 opacity-30"
                    style={{
                      background: `linear-gradient(to top, ${asset.color}, transparent)`,
                    }}
                  />
                  {t.category_name && (
                    <div className="absolute bottom-3 left-3">
                      <CategoryBadge
                        category_name={t.category_name}
                        category_color={t.category_color ?? asset.color}
                      />
                    </div>
                  )}
                </div>
                <div className="flex flex-1 flex-col p-4">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-lg">{t.title}</CardTitle>
                    <Badge variant="secondary" className="shrink-0">
                      {t.reference_number}
                    </Badge>
                  </div>
                  {t.tags && t.tags.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {t.tags.slice(0, 3).map((tag) => (
                        <TagChip key={tag} tag={tag} />
                      ))}
                      {t.tags.length > 3 && (
                        <span className="text-xs text-gray-500">+{t.tags.length - 3} more</span>
                      )}
                    </div>
                  )}
                  <div className="mt-3 flex items-center gap-2 text-sm text-gray-600">
                    <Clock className="h-4 w-4 shrink-0" />
                    <Countdown deadline={t.submission_deadline} />
                  </div>
                  {t.budget != null && (
                    <p className="mt-1 text-sm text-gray-600">
                      Budget: {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(t.budget)}
                    </p>
                  )}
                  <Button
                    variant="outline"
                    className="mt-4 w-full group-hover:bg-primary group-hover:text-white"
                  >
                    View Details
                  </Button>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function About() {
  return (
    <section id="about" className="border-t border-gray-100 bg-white px-4 py-16">
      <div className="mx-auto flex max-w-6xl flex-col gap-12 md:flex-row md:items-center md:gap-12">
        <div className="flex-1 shrink-0 overflow-hidden rounded-2xl shadow-lg">
          <img
            src="https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&q=80"
            alt="Our procurement team"
            className="h-80 w-full object-cover"
            style={{ objectPosition: 'center top' }}
            loading="lazy"
            decoding="async"
            width={800}
            height={320}
          />
        </div>
        <div className="flex-1 border-l-4 border-primary pl-6 md:pl-8">
          <h2 className="text-2xl font-bold text-gray-900 sm:text-3xl">About Us</h2>
          <p className="mt-4 text-gray-600 leading-relaxed">
            We use this system to run transparent, fair procurement. By publishing tenders and evaluating bids
            against clear criteria, we ensure the best value and quality for our organization while giving every
            qualified supplier a clear opportunity to compete.
          </p>
          <ul className="mt-6 space-y-3">
            <li className="flex items-center gap-2 text-gray-700">
              <span className="text-green-600">✓</span>
              Fair and transparent evaluation
            </li>
            <li className="flex items-center gap-2 text-gray-700">
              <span className="text-green-600">✓</span>
              Verified supplier database
            </li>
            <li className="flex items-center gap-2 text-gray-700">
              <span className="text-green-600">✓</span>
              End-to-end digital procurement
            </li>
            <li className="flex items-center gap-2 text-gray-700">
              <span className="text-green-600">✓</span>
              Real-time notifications
            </li>
          </ul>
        </div>
      </div>
    </section>
  );
}

function Contact() {
  return (
    <section id="contact" className="px-4 py-16">
      <div className="mx-auto max-w-4xl">
        <h2 className="text-2xl font-bold text-gray-900 sm:text-3xl">Contact</h2>
        <p className="mt-2 text-gray-600">Reach out with any questions.</p>
        <div className="mt-8">
          <ContactFormCard />
        </div>
      </div>
    </section>
  );
}

export function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main>
        <HeroSlideshow />
        <StatsBar />
        <ActiveTenders />
        <Testimonials />
        <HowItWorks />
        <About />
        <Contact />
        <CTABanner />
      </main>
      <Footer />
    </div>
  );
}
