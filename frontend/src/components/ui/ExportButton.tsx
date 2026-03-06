import { Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ExportButtonProps {
  onClick: () => void;
  label?: string;
  disabled?: boolean;
  loading?: boolean;
  empty?: boolean;
}

export function ExportButton({
  onClick,
  label = 'Export to Excel',
  disabled = false,
  loading = false,
  empty = false,
}: ExportButtonProps) {
  const isDisabled = disabled || loading || empty;

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onClick}
      disabled={isDisabled}
      title={empty && !loading ? 'No data to export' : undefined}
      className="border-green-600 text-green-700 hover:bg-green-50 hover:text-green-800"
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Download className="h-4 w-4" />
      )}
      <span className="ml-2">{label}</span>
    </Button>
  );
}
