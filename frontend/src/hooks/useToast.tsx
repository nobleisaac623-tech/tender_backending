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
      <Toast open={open} onOpenChange={setOpen} variant={variant}>
        {options.title && <ToastTitle>{options.title}</ToastTitle>}
        {options.description && <ToastDescription>{options.description}</ToastDescription>}
        <ToastClose />
      </Toast>
      <ToastViewport />
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
