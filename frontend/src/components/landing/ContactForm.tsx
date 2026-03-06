import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { User, Mail, Phone, FileText, MessageSquare, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { contactService } from '@/services/contact';
import { toastError } from '@/hooks/useToast';
import { cn } from '@/utils/cn';

const schema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Valid email is required'),
  phone: z.string().optional(),
  subject: z.string().min(1, 'Subject is required'),
  message: z
    .string()
    .min(10, 'Message must be at least 10 characters')
    .max(500, 'Message must be at most 500 characters'),
});

type FormData = z.infer<typeof schema>;

interface SuccessData {
  name: string;
  email: string;
}

export function ContactForm() {
  const [success, setSuccess] = useState<SuccessData | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
    reset,
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', email: '', phone: '', subject: '', message: '' },
  });

  const messageValue = watch('message', '');
  const charCount = messageValue.length;

  const onSubmit = async (data: FormData) => {
    try {
      await contactService.sendContactMessage(data);
      setSuccess({ name: data.name, email: data.email });
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Failed to send message.');
    }
  };

  if (success) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center p-10 text-center">
        <SuccessCheckmark />
        <h3
          className="mt-6 text-2xl font-bold text-gray-900 opacity-0 animate-fadeIn"
          style={{ animationDelay: '0.4s', animationFillMode: 'forwards' }}
        >
          Thank You, {success.name.split(' ')[0]}!
        </h3>
        <p
          className="mt-3 max-w-sm text-gray-600 opacity-0 animate-fadeIn"
          style={{ animationDelay: '0.4s', animationFillMode: 'forwards' }}
        >
          Your message has been received. We&apos;ll get back to you at {success.email} within 24
          hours.
        </p>
        <Button
          variant="outline"
          className="mt-6"
          onClick={() => {
            setSuccess(null);
            reset();
          }}
        >
          Send Another Message
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <FormField
        label="Full Name"
        error={errors.name?.message}
        icon={User}
      >
        <input
          type="text"
          {...register('name')}
          className={cn(inputClass(errors.name), 'h-11')}
          placeholder="John Doe"
        />
      </FormField>

      <FormField label="Email Address" error={errors.email?.message} icon={Mail}>
        <input
          type="email"
          {...register('email')}
          className={cn(inputClass(errors.email), 'h-11')}
          placeholder="john@example.com"
        />
      </FormField>

      <FormField
        label="Phone Number (optional)"
        error={errors.phone?.message}
        icon={Phone}
      >
        <input
          type="tel"
          {...register('phone')}
          className={cn(inputClass(errors.phone), 'h-11')}
          placeholder="+1 234 567 8900"
        />
      </FormField>

      <FormField label="Subject" error={errors.subject?.message} icon={FileText}>
        <input
          type="text"
          {...register('subject')}
          className={cn(inputClass(errors.subject), 'h-11')}
          placeholder="Inquiry about..."
        />
      </FormField>

      <FormField
        label="Message"
        error={errors.message?.message}
        icon={MessageSquare}
        isTextarea
        extra={
          <span className="mt-1 text-xs text-gray-500">{charCount} / 500</span>
        }
      >
        <textarea
          {...register('message')}
          rows={4}
          className={cn(
            inputClass(errors.message),
            'min-h-[100px] resize-y py-3'
          )}
          placeholder="Your message..."
        />
      </FormField>

      <Button
        type="submit"
        disabled={isSubmitting}
        className="h-12 w-full bg-[#1e3a5f] font-bold text-white hover:bg-[#17304d] active:scale-[0.98]"
      >
        <Send className="mr-2 h-5 w-5" />
        {isSubmitting ? 'Sending...' : 'Send Message'}
      </Button>
    </form>
  );
}

function FormField({
  label,
  error,
  icon: Icon,
  extra,
  isTextarea,
  children,
}: {
  label: string;
  error?: string;
  icon: React.ElementType;
  extra?: React.ReactNode;
  isTextarea?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-bold text-gray-700">
        {label}
      </label>
      <div className="relative">
        <span
          className={cn(
            'pointer-events-none absolute left-3 text-gray-400',
            isTextarea ? 'top-4' : 'top-1/2 -translate-y-1/2'
          )}
        >
          <Icon className="h-5 w-5" />
        </span>
        <div className="[&_input]:pl-11 [&_textarea]:pl-11">{children}</div>
      </div>
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
      {extra}
    </div>
  );
}

function inputClass(error?: string) {
  return cn(
    'flex w-full rounded-lg border bg-white px-3 py-2 text-sm transition-colors',
    'focus:outline-none focus:ring-2 focus:ring-[#2563eb] focus:ring-offset-1',
    error
      ? 'border-red-500 focus:border-red-500'
      : 'border-gray-300 focus:border-[#2563eb]'
  );
}

function SuccessCheckmark() {
  const circumference = 2 * Math.PI * 40;
  return (
    <div className="relative flex h-20 w-20 items-center justify-center">
      <svg
        className="h-20 w-20 -rotate-90"
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
      >
        <circle
          cx="50"
          cy="50"
          r="40"
          stroke="#10b981"
          strokeWidth="80"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={circumference}
          style={{ animation: 'checkCircleDraw 0.6s ease forwards' }}
        />
        <path
          d="M30 52 L42 66 L72 34"
          stroke="white"
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          strokeDasharray={60}
          strokeDashoffset={60}
          style={{ animation: 'checkMarkDraw 0.4s ease 0.4s forwards' }}
        />
      </svg>
      <style>{`
        @keyframes checkCircleDraw {
          to { stroke-dashoffset: 0; }
        }
        @keyframes checkMarkDraw {
          to { stroke-dashoffset: 0; }
        }
      `}</style>
    </div>
  );
}
