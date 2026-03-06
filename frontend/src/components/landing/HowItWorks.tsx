import { UserPlus, Search, FileText, Bell } from 'lucide-react';

const steps = [
  {
    number: '01',
    icon: UserPlus,
    color: '#3b82f6',
    bg: '#eff6ff',
    title: 'Register & Get Approved',
    desc: 'Create your supplier account and complete your company profile. Our team will review and approve.',
  },
  {
    number: '02',
    icon: Search,
    color: '#10b981',
    bg: '#ecfdf5',
    title: 'Browse Open Tenders',
    desc: 'View all published tenders, download documents, and check submission deadlines.',
  },
  {
    number: '03',
    icon: FileText,
    color: '#8b5cf6',
    bg: '#f5f3ff',
    title: 'Submit Your Bid',
    desc: 'Upload your technical proposal and supporting documents before the deadline.',
  },
  {
    number: '04',
    icon: Bell,
    color: '#f59e0b',
    bg: '#fffbeb',
    title: 'Get Notified',
    desc: 'Receive real-time notifications when evaluations are complete and awards are made.',
  },
];

export function HowItWorks() {
  return (
    <section className="bg-[#f8fafc] px-4 py-16">
      <div className="mx-auto max-w-6xl">
        <h2 className="text-center text-3xl font-bold text-gray-900 sm:text-4xl">
          How It Works
        </h2>
        <p className="mt-2 text-center text-gray-600">
          Four simple steps for suppliers.
        </p>
        <div className="mt-14 flex flex-col gap-12 md:flex-row md:items-start">
          {steps.map((step, i) => {
            const Icon = step.icon;
            return (
              <div key={step.number} className="flex flex-1 items-start">
                <div className="flex flex-1 flex-col items-center">
                  <div
                    className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-2 text-lg font-bold"
                    style={{
                      backgroundColor: step.bg,
                      borderColor: step.color,
                      color: step.color,
                    }}
                  >
                    {step.number}
                  </div>
                  <div
                    className="my-2 h-8 w-0.5 shrink-0"
                    style={{ backgroundColor: '#cbd5e1' }}
                  />
                  <Icon
                    className="h-10 w-10 shrink-0"
                    style={{ color: step.color }}
                  />
                  <h3 className="mt-4 text-center font-bold text-gray-900">
                    {step.title}
                  </h3>
                  <p className="mt-2 max-w-[260px] text-center text-sm text-gray-600">
                    {step.desc}
                  </p>
                </div>
                {i < steps.length - 1 && (
                  <div
                    className="hidden flex-1 border-t-2 border-dashed border-[#cbd5e1] pt-7 md:block"
                    style={{ marginTop: '1.75rem', minWidth: 16 }}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
