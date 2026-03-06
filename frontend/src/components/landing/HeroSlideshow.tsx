import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

const heroSlides = [
  {
    image: 'https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=1600&q=80',
    headline: 'Transparent Supplier Procurement',
    subheading:
      'A fair, open platform for tenders and supplier evaluation. Publish tenders, receive bids, and evaluate with clarity.',
  },
  {
    image: 'https://images.unsplash.com/photo-1521791136064-7986c2920216?w=1600&q=80',
    headline: 'Find the Right Suppliers',
    subheading:
      'Access a verified pool of suppliers across all industries. Competitive bidding ensures the best value for your organization.',
  },
  {
    image: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=1600&q=80',
    headline: 'Grow Your Business',
    subheading:
      'Register as a supplier and compete for contracts on a level playing field. Fair evaluation, clear criteria, real opportunities.',
  },
  {
    image: 'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=1600&q=80',
    headline: 'Procurement Made Simple',
    subheading:
      'From tender creation to contract award — manage the entire procurement lifecycle in one modern platform.',
  },
];

export function HeroSlideshow() {
  const [index, setIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const next = useCallback(() => {
    setIndex((i) => (i + 1) % heroSlides.length);
  }, []);

  const prev = useCallback(() => {
    setIndex((i) => (i - 1 + heroSlides.length) % heroSlides.length);
  }, []);

  useEffect(() => {
    if (isPaused) return;
    const id = setInterval(next, 5000);
    return () => clearInterval(id);
  }, [isPaused, next]);

  const slide = heroSlides[index];

  return (
    <section
      className="group relative min-h-[70vh] overflow-hidden md:min-h-[90vh]"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Background images with crossfade */}
      {heroSlides.map((s, i) => (
        <div
          key={s.image}
          className="absolute inset-0 transition-opacity duration-700 ease-in-out"
          style={{
            opacity: i === index ? 1 : 0,
            pointerEvents: i === index ? 'auto' : 'none',
          }}
        >
          <img
            src={s.image}
            alt=""
            className="h-full w-full object-cover"
            loading={i === 0 ? 'eager' : 'lazy'}
            decoding="async"
          />
          <div
            className="absolute inset-0 bg-black/55"
            aria-hidden
          />
        </div>
      ))}

      {/* Content */}
      <div className="relative z-10 flex min-h-[70vh] flex-col items-center justify-center px-4 py-16 text-center md:min-h-[90vh]">
        <h1
          key={`headline-${index}`}
          className="text-4xl font-bold tracking-tight text-white drop-shadow-md sm:text-5xl md:text-6xl"
          style={{
            animation: 'slideUp 0.6s ease forwards',
          }}
        >
          {slide.headline}
        </h1>
        <p
          key={`subheading-${index}`}
          className="mt-4 max-w-2xl text-lg text-white/90 drop-shadow-sm sm:text-xl"
          style={{
            animation: 'slideUp 0.6s ease 0.1s forwards',
            opacity: 0,
          }}
        >
          {slide.subheading}
        </p>
        <div
          key={`buttons-${index}`}
          className="mt-8 flex flex-wrap items-center justify-center gap-4"
          style={{
            animation: 'slideUp 0.6s ease 0.2s forwards',
            opacity: 0,
          }}
        >
          <Link to="/#tenders">
            <Button
              size="lg"
              className="bg-white font-semibold text-primary hover:bg-gray-100"
            >
              View Open Tenders
            </Button>
          </Link>
          <Link to="/register">
            <Button
              size="lg"
              variant="outline"
              className="border-white text-white hover:bg-white/10"
            >
              Register as Supplier
            </Button>
          </Link>
        </div>
      </div>

      {/* Prev / Next arrows */}
      <button
        type="button"
        onClick={prev}
        className="absolute left-4 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/30 text-white shadow-lg transition-colors hover:bg-white md:opacity-0 md:group-hover:opacity-100"
        aria-label="Previous slide"
      >
        <ChevronLeft className="h-6 w-6" />
      </button>
      <button
        type="button"
        onClick={next}
        className="absolute right-4 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/30 text-white shadow-lg transition-colors hover:bg-white md:opacity-0 md:group-hover:opacity-100"
        aria-label="Next slide"
      >
        <ChevronRight className="h-6 w-6" />
      </button>

      {/* Dot indicators */}
      <div className="absolute bottom-6 left-1/2 z-20 flex -translate-x-1/2 gap-2">
        {heroSlides.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setIndex(i)}
            className="h-2.5 w-2.5 rounded-full transition-all"
            style={{
              backgroundColor: i === index ? 'white' : 'transparent',
              boxShadow: '0 1px 3px rgba(0,0,0,0.5)',
              border: '2px solid white',
            }}
            aria-label={`Go to slide ${i + 1}`}
          />
        ))}
      </div>
    </section>
  );
}
