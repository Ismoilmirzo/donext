import { useEffect, useMemo, useState } from 'react';
import { CalendarCheck2, Plus } from 'lucide-react';
import { isYesterday, parseISO, startOfMonth } from 'date-fns';
import AddHabitModal from '../components/habits/AddHabitModal';
import HabitList from '../components/habits/HabitList';
import HabitMonthlyGrid from '../components/habits/HabitMonthlyGrid';
import HabitStatsCard from '../components/habits/HabitStatsCard';
import HabitStreakCard from '../components/habits/HabitStreakCard';
import HabitWeeklyChart from '../components/habits/HabitWeeklyChart';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import EmptyState from '../components/ui/EmptyState';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import ProgressBar from '../components/ui/ProgressBar';
import { useLocale } from '../contexts/LocaleContext';
import { useHabits } from '../hooks/useHabits';
import { getLocaleTag } from '../lib/i18n';
import { toISODate } from '../lib/dates';

export default function HabitsPage() {
  const { locale, t } = useLocale();
  const {
    habits,
    logs,
    loading,
    fetchHabitLogs,
    toggleHabit,
    addHabit,
    updateHabit,
    archiveHabit,
    deleteHabit,
    reorderHabits,
    streak,
    freezeNotice,
  } = useHabits();

  const [menuHabitId, setMenuHabitId] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const todayIso = toISODate(new Date());

  useEffect(() => {
    const monthStartIso = toISODate(startOfMonth(new Date()));
    void fetchHabitLogs(monthStartIso, todayIso);
  }, [fetchHabitLogs, todayIso]);

  const checkedMap = useMemo(() => {
    const map = {};
    logs.forEach((log) => {
      if (log.date === todayIso && log.completed) map[log.habit_id] = true;
    });
    return map;
  }, [logs, todayIso]);

  const completed = habits.filter((habit) => checkedMap[habit.id]).length;
  const total = habits.length;
  const percent = total ? Math.round((completed / total) * 100) : 0;
  const todayLabel = new Intl.DateTimeFormat(getLocaleTag(locale), { weekday: 'long', month: 'short', day: 'numeric' }).format(new Date());
  const freezeNoticeText = freezeNotice
    ? isYesterday(parseISO(freezeNotice.date))
      ? t('habits.freezeNoticeYesterday', { streak: freezeNotice.streakDays })
      : t('habits.freezeNoticeDate', {
          streak: freezeNotice.streakDays,
          date: new Intl.DateTimeFormat(getLocaleTag(locale), { month: 'short', day: 'numeric' }).format(parseISO(freezeNotice.date)),
        })
    : '';

  async function handleToggle(habit) {
    const currentValue = Boolean(checkedMap[habit.id]);
    const { error: toggleError } = await toggleHabit(habit.id, todayIso, currentValue);
    if (toggleError) setError(toggleError.message);
  }

  async function handleSaveHabit(payload) {
    setSaving(true);
    setError('');
    let result;
    if (editingHabit) {
      result = await updateHabit(editingHabit.id, payload);
    } else {
      result = await addHabit(payload.title, payload.icon);
    }
    if (result?.error) {
      setError(result.error.message);
      setSaving(false);
      return;
    }
    setSaving(false);
    setEditingHabit(null);
    setModalOpen(false);
  }

  if (loading) return <LoadingSpinner label={t('habits.loading')} />;

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-xl font-semibold text-slate-50">{t('habits.title', { date: todayLabel })}</h1>
            <p className="mt-1 text-sm text-slate-400">{t('habits.summary', { completed, total, percent })}</p>
          </div>
          <Button
            onClick={() => {
              setEditingHabit(null);
              setModalOpen(true);
            }}
            className="inline-flex items-center gap-1"
          >
            <Plus className="h-4 w-4" />
            {t('habits.addHabit')}
          </Button>
        </div>
        <div className="mt-3">
          <ProgressBar value={percent} max={100} />
        </div>
        {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
      </Card>

      {freezeNotice && (
        <Card className="border-sky-500/30 bg-sky-500/10 text-sm text-sky-100">
          {freezeNoticeText}
        </Card>
      )}

      {!habits.length ? (
        <EmptyState
          icon={<CalendarCheck2 className="h-5 w-5 text-emerald-400" />}
          title={t('habits.noHabitsTitle')}
          message={t('habits.noHabitsMessage')}
          ctaLabel={t('habits.addHabit')}
          onCta={() => setModalOpen(true)}
        />
      ) : (
        <HabitList
          habits={habits}
          checkedMap={checkedMap}
          onToggle={handleToggle}
          menuHabitId={menuHabitId}
          setMenuHabitId={setMenuHabitId}
          onEdit={(habit) => {
            setEditingHabit(habit);
            setModalOpen(true);
          }}
          onArchive={async (habit) => {
            const { error: archiveError } = await archiveHabit(habit.id);
            if (archiveError) setError(archiveError.message);
            setMenuHabitId(null);
          }}
          onDelete={async (habit) => {
            const confirmed = window.confirm(t('habits.deleteHabitConfirm', { title: habit.title }));
            if (!confirmed) return;
            const { error: deleteError } = await deleteHabit(habit.id);
            if (deleteError) setError(deleteError.message);
            setMenuHabitId(null);
          }}
          onReorder={async (habit, direction) => {
            const { error: reorderError } = await reorderHabits(habit.id, direction);
            if (reorderError) setError(reorderError.message);
          }}
        />
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <HabitWeeklyChart habits={habits} logs={logs} />
        <HabitMonthlyGrid habits={habits} logs={logs} streak={streak} freezeDates={streak.freezeDates} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <HabitStatsCard habits={habits} logs={logs} />
        <HabitStreakCard
          current={streak.current}
          longest={streak.longest}
          weeklyRemaining={streak.weeklyRemaining}
          weeklyLimit={streak.weeklyLimit}
        />
      </div>

      <AddHabitModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingHabit(null);
        }}
        onSave={handleSaveHabit}
        editingHabit={editingHabit}
        saving={saving}
      />
    </div>
  );
}
