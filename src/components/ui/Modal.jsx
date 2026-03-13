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
    <div className="dn-modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className={`dn-modal-panel w-full max-w-lg rounded-xl ${panelClassName}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="dn-divider flex items-center justify-between border-b px-4 py-3">
          <h3 className="text-base font-semibold text-slate-100">{title}</h3>
          <button
            onClick={onClose}
            className="dn-icon-button rounded-md px-2 py-1"
          >
            x
          </button>
        </div>
        <div className={`px-4 py-4 ${bodyClassName}`}>{children}</div>
        {footer && <div className="dn-divider border-t px-4 py-3">{footer}</div>}
      </div>
    </div>
  );
}
