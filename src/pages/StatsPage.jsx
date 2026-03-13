import { useEffect, useMemo, useState } from 'react';
import {
  addDays,
  endOfMonth,
  endOfWeek,
  isYesterday,
  parseISO,
  startOfMonth,
  startOfWeek,
  subMonths,
  subWeeks,
} from 'date-fns';
import AllTimeStatsCard from '../components/stats/AllTimeStatsCard';
import DailyFocusBar from '../components/stats/DailyFocusBar';
import FocusTimeChart from '../components/stats/FocusTimeChart';
import MonthlyOverviewCard from '../components/stats/MonthlyOverviewCard';
import ProjectProgressChart from '../components/stats/ProjectProgressChart';
import WeeklyOverviewCard from '../components/stats/WeeklyOverviewCard';
import Card from '../components/ui/Card';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { useLocale } from '../contexts/LocaleContext';
import { useHabits } from '../hooks/useHabits';
import { useStats } from '../hooks/useStats';
import { getLocaleTag } from '../lib/i18n';
import { supabase } from '../lib/supabase';
import { toISODate } from '../lib/dates';

function getPeriodDates(mode) {
  const now = new Date();
  if (mode === 'month') {
    return {
      start: startOfMonth(now),
      end: endOfMonth(now),
      prevStart: startOfMonth(subMonths(now, 1)),
      prevEnd: endOfMonth(subMonths(now, 1)),
    };
  }

  return {
    start: startOfWeek(now, { weekStartsOn: 1 }),
    end: endOfWeek(now, { weekStartsOn: 1 }),
    prevStart: startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 }),
    prevEnd: endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 }),
  };
}

export default function StatsPage() {
  const { locale, t } = useLocale();
  const { getFocusStats, getHabitStats, getProjectStats } = useStats();
  const { freezeNotice, streak, fetchHabitLogs } = useHabits();
  const [period, setPeriod] = useState('week');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [focusData, setFocusData] = useState({
    focusMinutes: 0,
    totalMinutes: 0,
    overheadMinutes: 0,
    efficiencyRate: 0,
    byDate: {},
    byProject: [],
  });
  const [prevFocusData, setPrevFocusData] = useState({ focusMinutes: 0 });
  const [habitData, setHabitData] = useState({ overallRate: 0, perHabit: [] });
  const [projectData, setProjectData] = useState({
    activeCount: 0,
    completedThisMonth: 0,
    tasksCompleted: 0,
    avgFocusTimePerTask: 0,
    avgTotalTimePerTask: 0,
    efficiencyRate: 0,
  });
  const [monthlyTrendRows, setMonthlyTrendRows] = useState([]);

  useEffect(() => {
    let mounted = true;

    async function loadStats() {
      setLoading(true);
      const range = getPeriodDates(period);
      const startIso = toISODate(range.start);
      const endIso = toISODate(range.end);
      const prevStartIso = toISODate(range.prevStart);
      const prevEndIso = toISODate(range.prevEnd);

      const [focusRes, prevFocusRes, habitRes, projectRes] = await Promise.all([
        getFocusStats(startIso, endIso),
        getFocusStats(prevStartIso, prevEndIso),
        getHabitStats(startIso, endIso),
        getProjectStats(),
      ]);

      await fetchHabitLogs(startIso, endIso);

      const trendStart = toISODate(addDays(new Date(), -56));
      const trendEnd = toISODate(new Date());
      const trendRes = await supabase
        .from('focus_sessions')
        .select('date,duration_minutes')
        .gte('date', trendStart)
        .lte('date', trendEnd);

      if (!mounted) return;
      const firstError = focusRes.error || prevFocusRes.error || habitRes.error || projectRes.error || trendRes.error;
      setError(firstError?.message || '');
      setFocusData(
        focusRes.data || {
          focusMinutes: 0,
          totalMinutes: 0,
          overheadMinutes: 0,
          efficiencyRate: 0,
          byDate: {},
          byProject: [],
        }
      );
      setPrevFocusData(prevFocusRes.data || { focusMinutes: 0 });
      setHabitData(habitRes.data || { overallRate: 0, perHabit: [] });
      setProjectData(
        projectRes.data || {
          activeCount: 0,
          completedThisMonth: 0,
          tasksCompleted: 0,
          avgFocusTimePerTask: 0,
          avgTotalTimePerTask: 0,
          efficiencyRate: 0,
        }
      );

      const weeklyMap = {};
      (trendRes.data || []).forEach((row) => {
        const weekStart = startOfWeek(new Date(row.date), { weekStartsOn: 1 });
        const key = toISODate(weekStart);
        if (!weeklyMap[key]) {
          weeklyMap[key] = {
            label: new Intl.DateTimeFormat(getLocaleTag(locale), { month: 'short', day: 'numeric' }).format(weekStart),
            minutes: 0,
          };
        }
        weeklyMap[key].minutes += row.duration_minutes || 0;
      });
      setMonthlyTrendRows(
        Object.entries(weeklyMap)
          .sort(([a], [b]) => (a < b ? -1 : 1))
          .map(([, value]) => value)
      );
      setLoading(false);
    }

    void loadStats();
    return () => {
      mounted = false;
    };
  }, [fetchHabitLogs, getFocusStats, getHabitStats, getProjectStats, locale, period]);

  const dailyRows = useMemo(() => {
    const range = getPeriodDates(period);
    const rows = [];
    let cursor = range.start;
    while (cursor <= range.end) {
      const iso = toISODate(cursor);
      rows.push({
        label:
          period === 'month'
            ? new Intl.DateTimeFormat(getLocaleTag(locale), { day: 'numeric' }).format(cursor)
            : new Intl.DateTimeFormat(getLocaleTag(locale), { weekday: 'short' }).format(cursor),
        focusMinutes: focusData.byDate?.[iso]?.focusMinutes || 0,
        totalMinutes: focusData.byDate?.[iso]?.totalMinutes || 0,
        overheadMinutes: focusData.byDate?.[iso]?.overheadMinutes || 0,
      });
      cursor = addDays(cursor, 1);
    }
    return rows;
  }, [focusData.byDate, locale, period]);

  const bestHabit = habitData.perHabit?.[0] || null;
  const worstHabit = habitData.perHabit?.[habitData.perHabit.length - 1] || null;
  const deltaMinutes = (focusData.focusMinutes || 0) - (prevFocusData.focusMinutes || 0);

  const currentChunk = monthlyTrendRows.slice(-4);
  const previousChunk = monthlyTrendRows.slice(-8, -4);
  const thisMonthTotal = currentChunk.reduce((sum, row) => sum + row.minutes, 0);
  const previousMonthTotal = previousChunk.reduce((sum, row) => sum + row.minutes, 0);
  const trendPercent = previousMonthTotal
    ? ((thisMonthTotal - previousMonthTotal) / previousMonthTotal) * 100
    : 0;
  const freezeNoticeText = freezeNotice
    ? isYesterday(parseISO(freezeNotice.date))
      ? t('habits.freezeNoticeYesterday', { streak: freezeNotice.streakDays })
      : t('habits.freezeNoticeDate', {
          streak: freezeNotice.streakDays,
          date: new Intl.DateTimeFormat(getLocaleTag(locale), { month: 'short', day: 'numeric' }).format(parseISO(freezeNotice.date)),
        })
    : '';

  if (loading) return <LoadingSpinner label={t('stats.loading')} />;

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-slate-50">{t('stats.title')}</h1>
          <div className="rounded-lg bg-slate-800 p-1 text-sm">
            <button
              onClick={() => setPeriod('week')}
              className={`rounded-md px-3 py-1.5 ${period === 'week' ? 'bg-slate-700 text-slate-100' : 'text-slate-400'}`}
            >
              {t('stats.thisWeek')}
            </button>
            <button
              onClick={() => setPeriod('month')}
              className={`rounded-md px-3 py-1.5 ${period === 'month' ? 'bg-slate-700 text-slate-100' : 'text-slate-400'}`}
            >
              {t('stats.thisMonth')}
            </button>
          </div>
        </div>
      </Card>
      {error && <Card className="border-red-500/30 bg-red-500/10 text-sm text-red-200">{error}</Card>}
      {freezeNotice && <Card className="border-sky-500/30 bg-sky-500/10 text-sm text-sky-100">{freezeNoticeText}</Card>}

      <FocusTimeChart
        focusMinutes={focusData.focusMinutes || 0}
        totalMinutes={focusData.totalMinutes || 0}
        overheadMinutes={focusData.overheadMinutes || 0}
        efficiencyRate={focusData.efficiencyRate || 0}
        deltaMinutes={deltaMinutes}
        label={period === 'week' ? t('stats.labelThisWeek') : t('stats.labelThisMonth')}
      />
      <DailyFocusBar rows={dailyRows} />
      <ProjectProgressChart projects={focusData.byProject || []} />
      <WeeklyOverviewCard
        overallRate={habitData.overallRate || 0}
        bestHabit={bestHabit}
        worstHabit={worstHabit}
        streak={streak.current}
      />
      <MonthlyOverviewCard rows={monthlyTrendRows} trendPercent={trendPercent} />
      <AllTimeStatsCard stats={projectData} />
    </div>
  );
}
