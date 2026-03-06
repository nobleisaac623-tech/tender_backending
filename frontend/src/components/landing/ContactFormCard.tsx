import { MapPin, Phone, Mail, Clock } from 'lucide-react';
import { ContactForm } from './ContactForm';

const contactItems = [
  {
    icon: MapPin,
    label: 'Address',
    value: '123 Business Avenue, Suite 100',
  },
  {
    icon: Phone,
    label: 'Phone',
    value: '+1 (555) 123-4567',
  },
  {
    icon: Mail,
    label: 'Email',
    value: 'procurement@example.com',
  },
  {
    icon: Clock,
    label: 'Hours',
    value: 'Mon–Fri 8am–5pm',
  },
];

export function ContactFormCard() {
  return (
    <div className="mx-auto max-w-4xl overflow-hidden rounded-2xl shadow-xl md:flex">
      {/* Left — Contact Info Panel */}
      <div
        className="relative overflow-hidden rounded-t-2xl bg-gradient-to-br from-[#1e3a5f] to-[#2563eb] p-8 md:rounded-l-2xl md:rounded-tr-none md:w-[320px] md:shrink-0"
        style={{
          background: 'linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)',
        }}
      >
        {/* Decorative blob */}
        <div
          className="absolute -bottom-8 -right-8 h-32 w-32 rounded-full bg-blue-300/20 blur-2xl"
          aria-hidden
        />
        <div className="relative space-y-6">
          {contactItems.map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex items-start gap-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/15">
                <Icon className="h-5 w-5 text-white" />
              </span>
              <div>
                <p className="text-sm font-medium text-white/90">{label}</p>
                <p className="mt-0.5 text-white">{value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right — Form Panel */}
      <div className="rounded-b-2xl bg-white p-8 md:rounded-r-2xl md:rounded-bl-none md:flex-1 md:p-10">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Get In Touch</h2>
          <p className="mt-1 text-gray-600">We&apos;d love to hear from you.</p>
        </div>
        <ContactForm />
      </div>
    </div>
  );
}
