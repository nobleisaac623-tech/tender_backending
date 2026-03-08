import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toastError, toastSuccess } from '@/hooks/useToast';

interface AccountStatusDetails {
  status: string;
  reason?: string;
  suspended_at?: string | null;
  blacklisted_at?: string | null;
  contact_email?: string;
  email?: string;
}

function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return 'N/A';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return dateString;
  }
}

export function AccountBlacklisted() {
  const [details, setDetails] = useState<AccountStatusDetails | null>(null);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (message.length < 30) {
      toastError('Message must be at least 30 characters');
      return;
    }

    setSubmitting(true);
    try {
      const email = details?.email || '';
      const response = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/auth/appeal.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ supplier_email: email, message })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to submit appeal');
      }
      
      setSubmitted(true);
      toastSuccess('Appeal submitted successfully');
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Failed to submit appeal');
    } finally {
      setSubmitting(false);
    }
  };

  const contactEmail = details?.contact_email || 'procurement@example.com';
  const whatsappNumber = '233534086538';

  return (
    <div className="flex min-h-screen items-center justify-center bg-red-50 px-4 py-8">
      <div className="w-full max-w-[560px]">
        {/* Warning Icon */}
        <div className="mb-6 flex justify-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-red-100">
            <svg className="h-10 w-10 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
          </div>
        </div>

        {/* Main Card */}
        <div className="rounded-2xl bg-white shadow-xl">
          <div className="border-l-4 border-red-500 rounded-l-2xl p-6">
            <h1 className="text-center text-2xl font-bold text-red-600">Account Permanently Blocked</h1>
            <p className="mt-2 text-center text-gray-600">Your account has been blocked from this platform.</p>

            {/* Warning Banner */}
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4">
              <div className="flex items-center gap-2 text-red-800">
                <svg className="h-5 w-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <p className="text-sm font-medium">This action is permanent. Blacklisted accounts cannot submit bids or access the platform.</p>
              </div>
            </div>

            {/* Info Box */}
            {details ? (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-5">
                <div className="space-y-4">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Reason</p>
                    <p className="mt-1 text-gray-900">{details.reason || 'No reason provided.'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Blocked On</p>
                    <p className="mt-1 text-gray-900">{formatDate(details.blacklisted_at)}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-5">
                <p className="text-gray-600">Your account has been permanently blocked. Please contact the administrator for more information.</p>
              </div>
            )}

            {/* Contact Buttons */}
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
              <a
                href={`https://wa.me/${whatsappNumber}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#25D366] px-4 py-2 text-sm font-medium text-white hover:bg-[#20BD5C]"
              >
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                WhatsApp Admin
              </a>
            </div>

            {/* Appeal Form */}
            <div className="mt-8">
              <p className="text-center text-sm text-gray-500 mb-4">Or submit a formal appeal</p>
              
              {submitted ? (
                <div className="rounded-xl border border-green-200 bg-green-50 p-5 text-center">
                  <svg className="mx-auto h-10 w-10 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <h3 className="mt-2 text-lg font-semibold text-green-800">Appeal Submitted</h3>
                  <p className="mt-1 text-green-700">
                    Your appeal has been sent to the administrator. We will review it and contact you at {details?.email || 'your email'} within 2 business days.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="email">Your Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      value={details?.email || ''}
                      readOnly
                      className="mt-1 bg-gray-100"
                    />
                  </div>
                  <div>
                    <Label htmlFor="message">Your Message</Label>
                    <textarea
                      id="message"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Please explain why you believe this block should be lifted... (min 30 characters)"
                      className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                      rows={4}
                      minLength={30}
                      maxLength={500}
                      required
                    />
                    <p className="mt-1 text-xs text-gray-500">{message.length}/500 characters (min 30)</p>
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full border-2 border-red-600 bg-transparent text-red-600 hover:bg-red-600 hover:text-white"
                    disabled={submitting || message.length < 30}
                  >
                    {submitting ? 'Submitting...' : 'Submit Appeal'}
                  </Button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
