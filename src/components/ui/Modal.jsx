import { useEffect } from 'react';

export default function Modal({ open, onClose, title, children, footer, panelClassName = '', bodyClassName = '' }) {
  useEffect(() => {
    if (!open) return undefined;

    function onKeyDown(event) {
      if (event.key === 'Escape') onClose?.();
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className={`w-full max-w-lg rounded-xl border border-slate-700 bg-slate-800 ${panelClassName}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-700 px-4 py-3">
          <h3 className="text-base font-semibold text-slate-100">{title}</h3>
          <button
            onClick={onClose}
            className="rounded-md px-2 py-1 text-slate-400 transition-colors hover:bg-slate-700 hover:text-slate-100"
          >
            x
          </button>
        </div>
        <div className={`px-4 py-4 ${bodyClassName}`}>{children}</div>
        {footer && <div className="border-t border-slate-700 px-4 py-3">{footer}</div>}
      </div>
    </div>
  );
}
