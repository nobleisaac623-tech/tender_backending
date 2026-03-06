import { useCallback, useState } from 'react';
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from '@/components/ui/toast';

type ToastVariant = 'default' | 'success' | 'destructive';

interface ToastOptions {
  title?: string;
  description?: string;
  variant?: ToastVariant;
}

let toastFn: (opts: ToastOptions) => void = () => {};

export function Toaster() {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<ToastOptions>({});
  const [variant, setVariant] = useState<ToastVariant>('default');

  toastFn = useCallback((opts: ToastOptions) => {
    setOptions(opts);
    setVariant(opts.variant ?? 'default');
    setOpen(true);
  }, []);

  return (
    <ToastProvider>
      {/* aria-live region so screen readers announce notifications */}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {open && options.title ? `${options.title}. ${options.description ?? ''}` : ''}
      </div>
      <Toast open={open} onOpenChange={setOpen} variant={variant} role="status">
        {options.title && <ToastTitle>{options.title}</ToastTitle>}
        {options.description && <ToastDescription>{options.description}</ToastDescription>}
        <ToastClose aria-label="Dismiss notification" />
      </Toast>
      <ToastViewport aria-label="Notifications" />
    </ToastProvider>
  );
}

export function toast(options: ToastOptions) {
  toastFn(options);
}

export function toastSuccess(message: string, title = 'Success') {
  toast({ title, description: message, variant: 'success' });
}

export function toastError(message: string, title = 'Error') {
  toast({ title, description: message, variant: 'destructive' });
}
