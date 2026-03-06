import { Link } from 'react-router-dom';
import { FileText, Facebook, Twitter, Linkedin, Mail, MapPin, Phone } from 'lucide-react';

const socialLinks = [
  { icon: Facebook, href: '#', label: 'Facebook' },
  { icon: Twitter, href: '#', label: 'Twitter' },
  { icon: Linkedin, href: '#', label: 'LinkedIn' },
  { icon: Mail, href: 'mailto:procurement@example.com', label: 'Email' },
];

const quickLinks = [
  { to: '/', label: 'Home' },
  { to: '/#tenders', label: 'Active Tenders' },
  { to: '/#about', label: 'About Us' },
  { to: '/#contact', label: 'Contact Us' },
];

const supplierLinks = [
  { to: '/register', label: 'Register' },
  { to: '/login', label: 'Login' },
  { to: '/#tenders', label: 'Browse Tenders' },
  { to: '/register', label: 'Submit a Bid' },
  { to: '/login', label: 'My Profile' },
];

export function Footer() {
  return (
    <footer className="bg-[#0f172a]">
      <div className="mx-auto max-w-6xl px-4 py-12">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {/* Column 1 — Brand */}
          <div>
            <Link to="/" className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-white">
                <FileText className="h-5 w-5" />
              </span>
              <span className="font-semibold text-white">Supplier Tender</span>
            </Link>
            <p className="mt-3 text-sm text-[#94a3b8]">
              Transparent procurement for a better future.
            </p>
            <div className="mt-4 flex gap-2">
              {socialLinks.map(({ icon: Icon, href, label }) => (
                <a
                  key={label}
                  href={href}
                  aria-label={label}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-[#334155] text-white transition-colors hover:bg-[#3b82f6]"
                >
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Column 2 — Quick Links */}
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-white">
              Quick Links
            </h3>
            <ul className="mt-4 space-y-2">
              {quickLinks.map(({ to, label }) => (
                <li key={label}>
                  <Link
                    to={to}
                    className="text-sm text-[#94a3b8] transition-colors hover:text-white"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3 — For Suppliers */}
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-white">
              For Suppliers
            </h3>
            <ul className="mt-4 space-y-2">
              {supplierLinks.map(({ to, label }) => (
                <li key={label}>
                  <Link
                    to={to}
                    className="text-sm text-[#94a3b8] transition-colors hover:text-white"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 4 — Contact */}
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-white">
              Contact
            </h3>
            <ul className="mt-4 space-y-3 text-sm text-[#94a3b8]">
              <li className="flex items-start gap-3">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                <span>123 Business Avenue, Suite 100</span>
              </li>
              <li className="flex items-center gap-3">
                <Phone className="h-4 w-4 shrink-0" />
                <a href="tel:+15551234567" className="transition-colors hover:text-white">
                  +1 (555) 123-4567
                </a>
              </li>
              <li className="flex items-center gap-3">
                <Mail className="h-4 w-4 shrink-0" />
                <a
                  href="mailto:procurement@example.com"
                  className="transition-colors hover:text-white"
                >
                  procurement@example.com
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 space-y-2 border-t border-[#334155] pt-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between text-[#64748b] text-sm">
            <span>© {new Date().getFullYear()} Supplier Tender. All rights reserved.</span>
            <span>
              <Link to="#" className="transition-colors hover:text-white">
                Privacy Policy
              </Link>
              {' · '}
              <Link to="#" className="transition-colors hover:text-white">
                Terms of Service
              </Link>
            </span>
          </div>
          <div className="text-center text-[13px] text-[#64748b]">
            Developed by{' '}
            <a
              href="https://wa.me/233534086538"
              target="_blank"
              rel="noopener noreferrer"
              title="Chat with developer on WhatsApp"
              className="inline-flex items-center gap-1 text-white font-semibold transition-colors duration-200 hover:text-green-400"
            >
              Adimat
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="h-4 w-4 text-[#25D366]"
              >
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
                <path d="M12 0C5.373 0 0 5.373 0 12c0 2.117.549 4.107 1.51 5.833L.057 23.215a.75.75 0 00.918.919l5.382-1.453A11.952 11.952 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.907 0-3.7-.513-5.238-1.407l-.374-.217-3.876 1.046 1.046-3.877-.217-.374A9.953 9.953 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z" />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
