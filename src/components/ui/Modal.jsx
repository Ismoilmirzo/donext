import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

export default function Modal({ open, onClose, title, children, footer, panelClassName = '', bodyClassName = '' }) {
  const panelRef = useRef(null);
  const previouslyFocused = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    previouslyFocused.current = document.activeElement;

    const timer = setTimeout(() => {
      const firstFocusable = panelRef.current?.querySelector(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      firstFocusable?.focus();
    }, 60);

    function onKeyDown(event) {
      if (event.key === 'Escape') {
        onClose?.();
        return;
      }
      if (event.key === 'Tab' && panelRef.current) {
        const focusable = panelRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('keydown', onKeyDown);
      previouslyFocused.current?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="dn-modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="dn-modal-title"
    >
      <div
        ref={panelRef}
        className={`dn-modal-panel w-full max-w-lg rounded-2xl ${panelClassName}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="dn-divider flex items-center justify-between border-b px-5 py-3.5">
          <h3 id="dn-modal-title" className="text-base font-semibold text-slate-100">{title}</h3>
          <button
            onClick={onClose}
            className="dn-icon-button -mr-1 rounded-lg p-1.5"
            aria-label="Close dialog"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className={`px-5 py-4 ${bodyClassName}`}>{children}</div>
        {footer && <div className="dn-divider border-t px-5 py-3.5">{footer}</div>}
      </div>
    </div>
  );
}
