import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface AccountStatusDetails {
  status: string;
  reason?: string;
  contact_email?: string;
  email?: string;
}

export function AccountRejected() {
  const [details, setDetails] = useState<AccountStatusDetails | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const stored = sessionStorage.getItem('account_status');
    if (stored) {
      try {
        setDetails(JSON.parse(stored));
      } catch {
        setDetails(null);
      }
    }
  }, []);

  const contactEmail = details?.contact_email || 'procurement@example.com';
  const email = details?.email;

  return (
    <div className="flex min-h-screen items-center justify-center bg-rose-50 px-4 py-8">
      <div className="w-full max-w-[560px]">
        {/* Icon */}
        <div className="mb-6 flex justify-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-rose-100">
            <svg className="h-10 w-10 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v4m0 4h.01M4.318 4.318l15.364 15.364M9.88 9.88l4.24 4.24" />
            </svg>
          </div>
        </div>

        {/* Card */}
        <div className="rounded-2xl bg-white shadow-xl">
          <div className="border-l-4 border-rose-500 rounded-l-2xl p-6">
            <h1 className="text-center text-2xl font-bold text-gray-900">Registration Rejected</h1>
            <p className="mt-2 text-center text-gray-600">
              Unfortunately your supplier registration was not approved.
            </p>

            {/* Reason */}
            <div className="mt-6 rounded-xl border border-rose-200 bg-rose-50 p-5">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Reason</p>
              <p className="mt-1 text-gray-900">{details?.reason || 'No reason was provided.'}</p>
            </div>

            {/* Next steps */}
            <div className="mt-6 space-y-3 text-sm text-gray-600">
              <p>
                If you believe this decision was made in error, you can contact the procurement team for clarification or submit a new registration in the future.
              </p>
            </div>

            {/* Contact */}
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <a
                href={`mailto:${contactEmail}`}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-blue-600 px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Email Admin
              </a>
            </div>

            {/* Back to login */}
            <div className="mt-8 text-center">
              <button
                onClick={() => {
                  sessionStorage.removeItem('account_status');
                  navigate('/login', { state: email ? { email } : undefined });
                }}
                className="text-sm text-gray-500 hover:text-gray-700 hover:underline"
              >
                ← Back to Login
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

