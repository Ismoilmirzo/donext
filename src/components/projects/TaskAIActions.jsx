import { useState, useEffect, useRef } from 'react';
import { Sparkles, Scissors, MessageSquare, ChevronDown, Loader2 } from 'lucide-react';
import { useLocale } from '../../contexts/LocaleContext';

export default function TaskAIActions({ task, onSplit, onClarify, loading }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const { t } = useLocale();

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div className="relative inline-block" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        disabled={loading}
        className="p-1 rounded text-slate-400 hover:text-amber-400 hover:bg-slate-700/50
          transition-colors disabled:opacity-50"
        title={t('ai.refineLabel')}
      >
        {loading
          ? <Loader2 size={14} className="animate-spin" />
          : <Sparkles size={14} />}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 w-40 rounded-md border
          border-slate-700 bg-slate-800 shadow-lg py-1 text-sm">
          <button
            onClick={() => { onSplit(task); setOpen(false); }}
            disabled={loading}
            className="flex items-center gap-2 w-full px-3 py-1.5 text-slate-300
              hover:bg-slate-700 transition-colors disabled:opacity-50"
          >
            <Scissors size={14} />
            {t('ai.splitTask')}
          </button>
          <button
            onClick={() => { onClarify(task); setOpen(false); }}
            disabled={loading}
            className="flex items-center gap-2 w-full px-3 py-1.5 text-slate-300
              hover:bg-slate-700 transition-colors disabled:opacity-50"
          >
            <MessageSquare size={14} />
            {t('ai.clarifyTask')}
          </button>
        </div>
      )}
    </div>
  );
}
