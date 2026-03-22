import { useEffect, useMemo, useState } from 'react';
import { MessageSquarePlus, Sparkles } from 'lucide-react';
import { useLocale } from '../../contexts/LocaleContext';
import Button from '../ui/Button';
import ColorPicker from '../ui/ColorPicker';
import Input from '../ui/Input';
import Modal from '../ui/Modal';
import TextArea from '../ui/TextArea';
import { PROJECT_PREFERRED_TIME_OPTIONS, PROJECT_PRIORITY_OPTIONS } from '../../lib/projectPriority';
import { parseNaturalLanguageProject } from '../../lib/aiDecompose';
import { findMatchingTemplate, PROJECT_TEMPLATES } from '../../data/projectTemplates';

export default function CreateProjectModal({ open, onClose, onSave, saving = false, initialProject = null }) {
  const { locale, t } = useLocale();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#6366F1');
  const [priority, setPriority] = useState('normal');
  const [preferredTime, setPreferredTime] = useState('any');
  const [deadlineDate, setDeadlineDate] = useState('');
  const [nlMode, setNlMode] = useState(false);
  const [nlInput, setNlInput] = useState('');

  useEffect(() => {
    if (!open) return;
    setTitle(initialProject?.title || '');
    setDescription(initialProject?.description || '');
    setColor(initialProject?.color || '#6366F1');
    setPriority(initialProject?.priority_tag || 'normal');
    setPreferredTime(initialProject?.preferred_time || 'any');
    setDeadlineDate(initialProject?.deadline_date || '');
    setNlMode(false);
    setNlInput('');
  }, [initialProject, open]);

  // Template suggestion based on title
  const templateMatch = useMemo(() => {
    if (initialProject || !title || title.length < 3) return null;
    return findMatchingTemplate(title);
  }, [initialProject, title]);

  function handleNlParse() {
    if (!nlInput.trim()) return;
    const parsed = parseNaturalLanguageProject(nlInput);
    if (parsed) {
      setTitle(parsed.title);
      setDescription(parsed.description || '');
      setPriority(parsed.priority_tag || 'normal');
      setDeadlineDate(parsed.deadline_date || '');
      setNlMode(false);
    }
  }

  async function handleSave() {
    if (!title.trim()) return;
    await onSave?.({
      title: title.trim(),
      description: description.trim(),
      color,
      priority_tag: priority,
      preferred_time: preferredTime,
      deadline_date: deadlineDate || null,
      _templateTasks: templateMatch ? getTemplateTasks(templateMatch, locale) : undefined,
    });
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={initialProject ? t('projectModal.editTitle') : t('projectModal.createTitle')}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            {t('common.cancel')}
          </Button>
          <Button onClick={handleSave} disabled={!title.trim() || saving}>
            {saving ? t('common.saving') : initialProject ? t('projectModal.saveChanges') : t('projectModal.createTitle')}
          </Button>
        </div>
      }
    >
      <div className="space-y-3">
        {!initialProject ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setNlMode((v) => !v)}
              className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
                nlMode
                  ? 'border border-indigo-500/30 bg-indigo-500/10 text-indigo-300'
                  : 'border border-slate-700 bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <MessageSquarePlus className="h-3.5 w-3.5" />
              {t('projectModal.nlMode')}
            </button>
          </div>
        ) : null}

        {nlMode ? (
          <div className="space-y-2">
            <TextArea
              rows={3}
              value={nlInput}
              onChange={(e) => setNlInput(e.target.value)}
              placeholder={t('projectModal.nlPlaceholder')}
              className="text-sm"
            />
            <Button size="sm" onClick={handleNlParse} disabled={!nlInput.trim()}>
              {t('projectModal.nlParse')}
            </Button>
          </div>
        ) : (
          <>
            <label className="space-y-1">
              <span className="text-xs uppercase tracking-wide text-slate-500">{t('common.title')}</span>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t('projectModal.titlePlaceholder')} />
            </label>
            <label className="space-y-1">
              <span className="text-xs uppercase tracking-wide text-slate-500">{t('common.description')}</span>
              <TextArea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t('projectModal.descriptionPlaceholder')} />
            </label>
            <label className="space-y-1">
              <span className="text-xs uppercase tracking-wide text-slate-500">{t('common.color')}</span>
              <ColorPicker value={color} onChange={setColor} />
            </label>
            <label className="space-y-1">
              <span className="text-xs uppercase tracking-wide text-slate-500">{t('projects.priorityLabel')}</span>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full rounded-lg border border-slate-600 bg-slate-700 px-4 py-3 text-slate-50 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {PROJECT_PRIORITY_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {t(`projects.priority.${option}`)}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1">
              <span className="text-xs uppercase tracking-wide text-slate-500">{t('projects.preferredTimeLabel')}</span>
              <select
                value={preferredTime}
                onChange={(e) => setPreferredTime(e.target.value)}
                className="w-full rounded-lg border border-slate-600 bg-slate-700 px-4 py-3 text-slate-50 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {PROJECT_PREFERRED_TIME_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {t(`projects.preferredTime.${option}`)}
                  </option>
                ))}
              </select>
              <p className="text-xs text-slate-500">{t('projects.preferredTimeHint')}</p>
            </label>
            <label className="space-y-1">
              <span className="text-xs uppercase tracking-wide text-slate-500">{t('projects.deadlineLabel')}</span>
              <Input type="date" value={deadlineDate} onChange={(e) => setDeadlineDate(e.target.value)} />
              <p className="text-xs text-slate-500">{t('projects.deadlineHint')}</p>
            </label>

            {templateMatch ? (
              <div className="rounded-lg border border-indigo-500/20 bg-indigo-500/5 p-3">
                <div className="flex items-center gap-1.5 text-xs text-indigo-300">
                  <Sparkles className="h-3.5 w-3.5" />
                  {t('projectModal.templateMatch', { type: locale === 'uz' ? templateMatch.labelUz : templateMatch.label })}
                </div>
                <p className="mt-1 text-xs text-slate-400">{t('projectModal.templateHint')}</p>
              </div>
            ) : null}
          </>
        )}
      </div>
    </Modal>
  );
}

function getTemplateTasks(template, locale) {
  if (!template?.tasks) return [];
  return template.tasks.map((t) => ({
    title: locale === 'uz' ? (t.titleUz || t.title) : t.title,
    description: '',
  }));
}
