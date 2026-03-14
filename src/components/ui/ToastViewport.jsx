import { useToast } from '../../contexts/ToastContext';
import Toast from './Toast';

export default function ToastViewport() {
  const { toasts, dismissToast } = useToast();

  return (
    <div className="dn-toast-viewport pointer-events-none fixed inset-x-0 bottom-20 z-[80] flex flex-col items-center gap-3 px-4 md:bottom-6 md:right-6 md:left-auto md:w-[26rem]">
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-none w-full">
          <Toast toast={toast} onClose={() => dismissToast(toast.id)} />
        </div>
      ))}
    </div>
  );
}
