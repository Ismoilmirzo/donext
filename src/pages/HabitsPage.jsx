import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { CalendarCheck2, Plus, Snowflake } from 'lucide-react';
import { isYesterday, parseISO, startOfMonth } from 'date-fns';
import AddHabitModal from '../components/habits/AddHabitModal';
import HabitList from '../components/habits/HabitList';
import HabitMonthlyGrid from '../components/habits/HabitMonthlyGrid';
import HabitStreakCard from '../components/habits/HabitStreakCard';
import WeeklyGoalPromptCard from '../components/habits/WeeklyGoalPromptCard';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import ConfirmActionModal from '../components/ui/ConfirmActionModal';
import EmptyState from '../components/ui/EmptyState';
import { HabitsPageSkeleton } from '../components/ui/PageSkeletons';
import ProgressBar from '../components/ui/ProgressBar';
import SkeletonCard from '../components/ui/SkeletonCard';

const HabitWeeklyChart = lazy(() => import('../components/habits/HabitWeeklyChart'));
const HabitStatsCard = lazy(() => import('../components/habits/HabitStatsCard'));
import { useLocale } from '../contexts/LocaleContext';
import { useToast } from '../contexts/ToastContext';
import { useHabits } from '../hooks/useHabits';
import { useWeeklyGoal } from '../hooks/useWeeklyGoal';
import { toISODate } from '../lib/dates';
import { getLocaleTag } from '../lib/i18n';

export default function HabitsPage() {
  const { locale, t } = useLocale();
  const toast = useToast();
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
  const weeklyGoal = useWeeklyGoal();

  const [menuHabitId, setMenuHabitId] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState(null);
  const [saving, setSaving] = useState(false);
  const [pendingHabitAction, setPendingHabitAction] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
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
  const todayLabel = new Intl.DateTimeFormat(getLocaleTag(locale), {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  }).format(new Date());
  const refillLabel = streak.nextGrantDate
    ? new Intl.DateTimeFormat(getLocaleTag(locale), {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      }).format(parseISO(streak.nextGrantDate))
    : '';
  const freezeNoticeText = freezeNotice
    ? isYesterday(parseISO(freezeNotice.date))
      ? t('habits.freezeNoticeYesterday', {
          streak: freezeNotice.streakDays,
          remaining: freezeNotice.remaining,
          total: freezeNotice.total,
        })
      : t('habits.freezeNoticeDate', {
          streak: freezeNotice.streakDays,
          remaining: freezeNotice.remaining,
          total: freezeNotice.total,
          date: new Intl.DateTimeFormat(getLocaleTag(locale), {
            month: 'short',
            day: 'numeric',
          }).format(parseISO(freezeNotice.date)),
        })
    : '';

  async function handleToggle(habit) {
    const currentValue = Boolean(checkedMap[habit.id]);
    const { error: toggleError } = await toggleHabit(habit.id, todayIso, currentValue);
    if (toggleError) {
      toast.error('Could not update habit', toggleError.message);
      return;
    }
    toast.success(currentValue ? 'Habit unchecked' : 'Habit completed', habit.title);
  }

  async function handleSaveHabit(payload) {
    setSaving(true);
    let result;
    if (editingHabit) {
      result = await updateHabit(editingHabit.id, payload);
    } else {
      result = await addHabit(payload.title, payload.icon);
    }
    if (result?.error) {
      toast.error('Could not save habit', result.error.message);
      setSaving(false);
      return;
    }
    setSaving(false);
    setEditingHabit(null);
    setModalOpen(false);
    toast.success(editingHabit ? 'Habit updated' : 'Habit added', payload.title);
  }

  async function handleHabitAction() {
    if (!pendingHabitAction?.habit) return;
    setActionLoading(true);
    const result =
      pendingHabitAction.type === 'archive'
        ? await archiveHabit(pendingHabitAction.habit.id)
        : await deleteHabit(pendingHabitAction.habit.id);
    setActionLoading(false);
    if (result?.error) {
      toast.error('Action failed', result.error.message);
      return;
    }
    toast.success(
      pendingHabitAction.type === 'archive' ? 'Habit archived' : 'Habit deleted',
      pendingHabitAction.habit.title
    );
    setPendingHabitAction(null);
    setMenuHabitId(null);
  }

  if (loading) return <HabitsPageSkeleton />;

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
        <div className="mt-3 inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs" style={{ borderColor: 'rgb(var(--dn-accent-rgb) / 0.2)', background: 'rgb(var(--dn-accent-rgb) / 0.1)', color: 'color-mix(in srgb, var(--dn-accent) 32%, var(--dn-text))' }}>
          <Snowflake className="h-3.5 w-3.5" />
          <span>{t('habits.freezeInventoryValue', { available: streak.availableFreezes, total: streak.storageCap })}</span>
          <span style={{ opacity: 0.5 }}>|</span>
          <span>{freezeInventorySummary(streak, refillLabel, t)}</span>
        </div>
      </Card>

      {freezeNotice ? <Card className="dn-banner-info text-sm">{freezeNoticeText}</Card> : null}

      {weeklyGoal.promptVisible ? (
        <WeeklyGoalPromptCard
          suggestedHours={weeklyGoal.suggestedMinutes / 60}
          lastWeekLabel={weeklyGoal.formatGoalMinutes(weeklyGoal.lastWeekMinutes)}
          onSave={(minutes) => void weeklyGoal.setWeeklyGoal(minutes)}
          onSkip={weeklyGoal.skipWeek}
          saving={weeklyGoal.loading}
          t={t}
        />
      ) : null}

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
          onArchive={(habit) => {
            setPendingHabitAction({ type: 'archive', habit });
          }}
          onDelete={(habit) => {
            setPendingHabitAction({ type: 'delete', habit });
          }}
          onReorder={async (habit, direction) => {
            const { error: reorderError } = await reorderHabits(habit.id, direction);
            if (reorderError) {
              toast.error('Could not reorder habit', reorderError.message);
              return;
            }
            toast.info(direction === 'up' ? 'Habit moved up' : 'Habit moved down', habit.title);
          }}
        />
      )}

      <Suspense fallback={<div className="grid gap-4 lg:grid-cols-2"><SkeletonCard /><SkeletonCard /></div>}>
        <div className="grid gap-4 lg:grid-cols-2">
          <HabitWeeklyChart habits={habits} logs={logs} />
          <HabitMonthlyGrid habits={habits} logs={logs} streak={streak} freezeDates={streak.freezeDates} />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <HabitStatsCard habits={habits} logs={logs} />
          <HabitStreakCard
          current={streak.current}
          longest={streak.longest}
          availableFreezes={streak.availableFreezes}
          usedThisWeek={streak.usedThisWeek}
          storageCap={streak.storageCap}
          nextGrantDate={streak.nextGrantDate}
          />
        </div>
      </Suspense>

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

      <ConfirmActionModal
        open={Boolean(pendingHabitAction)}
        onClose={() => setPendingHabitAction(null)}
        onConfirm={handleHabitAction}
        title={pendingHabitAction?.type === 'archive' ? t('habits.confirmArchiveTitle') : t('habits.confirmDeleteTitle')}
        message={
          pendingHabitAction?.type === 'archive'
            ? t('habits.confirmArchiveBody', { title: pendingHabitAction?.habit?.title || '' })
            : t('habits.confirmDeleteBody', { title: pendingHabitAction?.habit?.title || '' })
        }
        confirmLabel={pendingHabitAction?.type === 'archive' ? t('common.archive') : t('common.delete')}
        cancelLabel={t('common.cancel')}
        confirmVariant={pendingHabitAction?.type === 'archive' ? 'secondary' : 'danger'}
        loading={actionLoading}
      />
    </div>
  );
}

function freezeInventorySummary(streak, refillLabel, t) {
  if (streak.availableFreezes === streak.storageCap) {
    return t('habits.freezeAtCapacity');
  }
  return t('habits.freezeNextRefill', { total: streak.storageCap, date: refillLabel });
}
