import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, Dumbbell, Filter, ListChecks } from 'lucide-react';
import GymEmptyState from '../components/gym/GymEmptyState';
import GymNav from '../components/gym/GymNav';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import { useLocale } from '../contexts/LocaleContext';
import { formatGymDayLabel, formatGymWeekdayLabel } from '../gym/lib/gymI18n';
import { calculateSessionVolume, calculateWeeklySessionGoal, toDateKey } from '../gym/lib/gymMetrics';
import { useGym } from '../hooks/useGym';

function monthCells(date = new Date()) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const cells = [];
  for (let index = 0; index < first.getDay(); index += 1) cells.push(null);
  for (let day = 1; day <= last.getDate(); day += 1) {
    const current = new Date(year, month, day);
    cells.push(toDateKey(current));
  }
  return cells;
}

function sessionMatchesFilter(session, filter) {
  if (filter === 'all') return true;
  if (filter === 'finished') return Number(session.duration_min || 0) > 0;
  if (filter === 'logged') return (session.gym_set_logs || []).length > 0;
  if (filter.startsWith('day:')) return session.program_day_id === filter.slice(4);
  return true;
}

function getDayTypeDotClass(session) {
  const label = String(session?.program_day?.label || '').toLowerCase();
  if (label.includes('lower')) return 'bg-sky-300';
  if (label.includes('pull')) return 'bg-violet-300';
  if (label.includes('push')) return 'bg-emerald-300';
  return 'bg-amber-300';
}

export default function GymHistoryPage() {
  const { t } = useLocale();
  const { activeProgram, error, loading, retryGymSchema, schemaMissing, sessions } = useGym();
  const [filter, setFilter] = useState('all');
  const [selectedSessionId, setSelectedSessionId] = useState('');
  const sessionsByDate = useMemo(() => {
    const rows = new Map();
    sessions.forEach((session) => {
      if (!rows.has(session.performed_at)) rows.set(session.performed_at, session);
    });
    return rows;
  }, [sessions]);
  const cells = useMemo(() => monthCells(), []);
  const filteredSessions = useMemo(() => sessions.filter((session) => sessionMatchesFilter(session, filter)), [filter, sessions]);
  const selectedSession = filteredSessions.find((session) => session.id === selectedSessionId) || filteredSessions[0];
  const weeklyStreak = useMemo(() => calculateWeeklySessionGoal(sessions, 12, 3), [sessions]);

  if (loading) {
    return (
      <div className="space-y-4">
        <GymNav />
        <Card className="min-h-[16rem] animate-pulse" />
      </div>
    );
  }

  if (!activeProgram) {
    return (
      <div className="space-y-4">
        <GymNav />
        <GymEmptyState error={error} schemaMissing={schemaMissing} onRetry={retryGymSchema} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <GymNav />

      <Card className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-emerald-300">{t('gym.historyEyebrow')}</p>
            <h1 className="mt-2 text-2xl font-semibold text-slate-50">{t('gym.trainingSessions')}</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="rounded-xl border border-slate-700 bg-slate-900/45 px-3 py-2 text-sm text-slate-300">
              <span className="text-slate-500">{t('gym.currentStreak')}</span>
              <span className="ml-2 font-semibold text-slate-100">{t('gym.currentWeekStreak', { count: weeklyStreak.currentStreak })}</span>
            </div>
            <div className="rounded-xl border border-slate-700 bg-slate-900/45 px-3 py-2 text-sm text-slate-300">
              <span className="text-slate-500">{t('gym.longestStreak')}</span>
              <span className="ml-2 font-semibold text-slate-100">{t('gym.currentWeekStreak', { count: weeklyStreak.longestStreak })}</span>
            </div>
            <div className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/45 px-3 py-2 text-sm text-slate-300">
              <Filter className="h-4 w-4" aria-hidden="true" />
              <select
                value={filter}
                onChange={(event) => setFilter(event.target.value)}
                className="bg-transparent text-slate-100 outline-none"
              >
                <option value="all">{t('gym.all')}</option>
                <option value="finished">{t('gym.finished')}</option>
                <option value="logged">{t('gym.loggedSets')}</option>
                {(activeProgram.days || []).map((day) => (
                  <option key={day.id} value={`day:${day.id}`}>
                    {formatGymDayLabel(t, day.label)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-2 text-center text-xs">
          {[0, 1, 2, 3, 4, 5, 6].map((weekday) => (
            <div key={weekday} className="py-1 text-slate-500">
              {formatGymWeekdayLabel(t, weekday)}
            </div>
          ))}
          {cells.map((date, index) =>
            date ? (
              (() => {
                const sessionForDate = sessionsByDate.get(date);
                const hasSession = Boolean(sessionForDate);
                return (
              <button
                key={date}
                type="button"
                onClick={() => {
                  const session = sessionsByDate.get(date);
                  if (session) setSelectedSessionId(session.id);
                }}
                className={`min-h-14 rounded-xl border px-2 py-2 ${
                  hasSession
                    ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-100'
                    : 'border-slate-700 bg-slate-900/45 text-slate-400'
                }`}
              >
                <span>{Number(date.slice(-2))}</span>
                <span className={`mx-auto mt-2 block h-2 w-2 rounded-full ${hasSession ? getDayTypeDotClass(sessionForDate) : 'bg-transparent'}`} />
              </button>
                );
              })()
            ) : (
              <div key={`blank-${index}`} />
            )
          )}
        </div>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[minmax(18rem,0.7fr)_minmax(0,1fr)]">
        <Card className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-100">
            <ListChecks className="h-4 w-4 text-emerald-300" aria-hidden="true" />
            {t('gym.sessions')}
          </div>
          <div className="space-y-2">
            {filteredSessions.length ? (
              filteredSessions.map((session) => (
                <button
                  key={session.id}
                  type="button"
                  onClick={() => setSelectedSessionId(session.id)}
                  className={`w-full rounded-xl border px-3 py-2 text-left text-sm ${
                    selectedSession?.id === session.id
                      ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-100'
                      : 'border-slate-700 bg-slate-900/45 text-slate-300'
                  }`}
                >
                  <p className="font-medium">{formatGymDayLabel(t, session.program_day?.label) || t('gym.workoutFallback')}</p>
                  <p className="mt-1 text-xs text-slate-400">{session.performed_at}</p>
                </button>
              ))
            ) : (
              <p className="text-sm text-slate-400">{t('gym.noSessions')}</p>
            )}
          </div>
        </Card>

        <Card className="space-y-4">
          {selectedSession ? (
            <>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-100">
                    <Dumbbell className="h-4 w-4 text-emerald-300" aria-hidden="true" />
                    {formatGymDayLabel(t, selectedSession.program_day?.label) || t('gym.workoutFallback')}
                  </div>
                  <p className="mt-1 text-sm text-slate-400">{selectedSession.performed_at}</p>
                </div>
                <Link to={`/gym/log/${selectedSession.id}`} className="dn-button dn-button-secondary inline-flex px-3 py-2 text-sm">
                  {t('gym.open')}
                </Link>
              </div>

              <div className="grid gap-3 sm:grid-cols-4">
                <div className="rounded-xl border border-slate-700 bg-slate-900/45 p-3">
                  <p className="text-xs uppercase tracking-wide text-slate-500">{t('gym.duration')}</p>
                  <p className="mt-1 text-lg font-semibold text-slate-50">{selectedSession.duration_min || 0} min</p>
                </div>
                <div className="rounded-xl border border-slate-700 bg-slate-900/45 p-3">
                  <p className="text-xs uppercase tracking-wide text-slate-500">{t('gym.setsLabel')}</p>
                  <p className="mt-1 text-lg font-semibold text-slate-50">{selectedSession.gym_set_logs?.length || 0}</p>
                </div>
                <div className="rounded-xl border border-slate-700 bg-slate-900/45 p-3">
                  <p className="text-xs uppercase tracking-wide text-slate-500">{t('gym.volume')}</p>
                  <p className="mt-1 text-lg font-semibold text-slate-50">{Math.round(calculateSessionVolume(selectedSession.gym_set_logs || []))} kg</p>
                </div>
                <div className="rounded-xl border border-slate-700 bg-slate-900/45 p-3">
                  <p className="text-xs uppercase tracking-wide text-slate-500">{t('gym.bodyweight')}</p>
                  <p className="mt-1 text-lg font-semibold text-slate-50">{selectedSession.bodyweight_kg ? `${selectedSession.bodyweight_kg} kg` : '-'}</p>
                </div>
              </div>

              {selectedSession.notes ? (
                <div className="rounded-xl border border-slate-700 bg-slate-900/45 px-3 py-2 text-sm text-slate-300">
                  {selectedSession.notes}
                </div>
              ) : null}

              <div className="space-y-2">
                {(selectedSession.gym_set_logs || []).map((set) => (
                  <div key={set.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-700 bg-slate-900/45 px-3 py-2 text-sm">
                    <span className="text-slate-200">
                      {t('gym.selectedSetLine', { exercise: set.exercise?.name || t('gym.exerciseFallback'), set: set.set_number })}
                    </span>
                    <span className="text-slate-400">
                      {t('gym.weightRepsLine', { weight: set.weight_kg || 0, reps: set.reps || 0 })}
                    </span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex min-h-48 items-center justify-center text-slate-400">
              <CalendarDays className="mr-2 h-4 w-4" aria-hidden="true" />
              {t('gym.noSessionSelected')}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
