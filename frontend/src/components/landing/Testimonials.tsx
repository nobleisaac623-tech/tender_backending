import { useState } from 'react';
import { Star } from 'lucide-react';

const testimonials = [
  {
    quote:
      'The platform made it incredibly easy to find and submit bids for tenders. The process is transparent and professional.',
    name: 'Kwame Asante',
    company: 'Asante Tech Solutions',
    category: 'IT & Technology',
    rating: 5,
    initials: 'KA',
    avatarColor: '#3b82f6',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face&q=80',
  },
  {
    quote:
      'We won our first contract through this system within two months of registering. The document upload process was seamless.',
    name: 'Abena Mensah',
    company: 'Mensah Construction Ltd',
    category: 'Construction',
    rating: 5,
    initials: 'AM',
    avatarColor: '#10b981',
    avatar: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=100&h=100&fit=crop&crop=face&q=80',
  },
  {
    quote:
      'Finally a procurement system that is fair and easy to navigate. We always know where our bid stands in the process.',
    name: 'Kofi Boateng',
    company: 'Boateng Medical Supplies',
    category: 'Health & Medical',
    rating: 5,
    initials: 'KB',
    avatarColor: '#8b5cf6',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=face&q=80',
  },
];

function TestimonialAvatar({ t }: { t: (typeof testimonials)[0] }) {
  const [imgError, setImgError] = useState(false);

  if (imgError) {
    return (
      <div
        className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-2 border-white text-sm font-semibold text-white shadow-md"
        style={{ backgroundColor: t.avatarColor }}
      >
        {t.initials}
      </div>
    );
  }

  return (
    <img
      src={t.avatar}
      alt={t.name}
      className="h-14 w-14 shrink-0 rounded-full border-2 border-white object-cover shadow-md"
      loading="lazy"
      decoding="async"
      width={56}
      height={56}
      onError={() => setImgError(true)}
    />
  );
}

export function Testimonials() {
  return (
    <section className="border-t border-gray-100 bg-white px-4 py-16">
      <div className="mx-auto max-w-6xl">
        <h2 className="text-center text-3xl font-bold text-gray-900 sm:text-4xl">
          What Suppliers Say
        </h2>
        <p className="mt-2 text-center text-gray-600">
          Trusted by businesses across industries.
        </p>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {testimonials.map((t) => (
            <div
              key={t.initials}
              className="relative rounded-xl border border-[#e2e8f0] bg-white p-7 shadow-sm transition-shadow hover:shadow-md"
            >
              <span
                className="absolute left-6 top-6 text-6xl font-serif leading-none text-[#dbeafe]"
                aria-hidden
              >
                "
              </span>
              <div className="mb-3 flex gap-0.5 text-amber-500">
                {Array.from({ length: t.rating }).map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-current" />
                ))}
              </div>
              <p className="relative z-10 mt-2 text-[15px] italic leading-relaxed text-[#475569]">
                {t.quote}
              </p>
              <hr className="my-4 border-[#e2e8f0]" />
              <div className="flex items-center gap-4">
                <TestimonialAvatar t={t} />
                <div>
                  <p className="font-semibold text-gray-900">{t.name}</p>
                  <p className="text-sm text-gray-500">
                    {t.company} · {t.category}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
