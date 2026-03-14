import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';

const ICONS = {
  info: Info,
  success: CheckCircle2,
  error: AlertCircle,
};

export default function Toast({ toast, onClose }) {
  const Icon = ICONS[toast.variant] || Info;

  return (
    <div className={`dn-toast pointer-events-auto dn-toast-${toast.variant}`}>
      <div className="flex items-start gap-3">
        <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10">
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">{toast.title}</p>
          {toast.description && <p className="mt-1 text-sm opacity-85">{toast.description}</p>}
        </div>
        <button type="button" onClick={onClose} className="dn-icon-button rounded-full p-1.5" aria-label="Dismiss notification">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
