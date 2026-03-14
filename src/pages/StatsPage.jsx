import { useEffect, useMemo, useRef, useState } from 'react';
import html2canvas from 'html2canvas';
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
import BadgeGrid from '../components/badges/BadgeGrid';
import AllTimeStatsCard from '../components/stats/AllTimeStatsCard';
import DailyFocusBar from '../components/stats/DailyFocusBar';
import FocusTimeChart from '../components/stats/FocusTimeChart';
import MonthlyOverviewCard from '../components/stats/MonthlyOverviewCard';
import ProjectProgressChart from '../components/stats/ProjectProgressChart';
import WeeklyGoalCard from '../components/stats/WeeklyGoalCard';
import WeeklyGoalHistoryTable from '../components/stats/WeeklyGoalHistoryTable';
import WeeklyOverviewCard from '../components/stats/WeeklyOverviewCard';
import WeeklyReportCard from '../components/stats/WeeklyReportCard';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import EmptyState from '../components/ui/EmptyState';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { useAuth } from '../contexts/AuthContext';
import { useBadges } from '../contexts/BadgeContext';
import { useLocale } from '../contexts/LocaleContext';
import { useHabits } from '../hooks/useHabits';
import { useStats } from '../hooks/useStats';
import { useWeeklyGoal } from '../hooks/useWeeklyGoal';
import { toISODate } from '../lib/dates';
import { getLocaleTag } from '../lib/i18n';
import { supabase } from '../lib/supabase';
import { getWeeklyReportStats } from '../lib/weeklyReport';

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
  const { user } = useAuth();
  const { locale, t } = useLocale();
  const { getFocusStats, getHabitStats, getProjectStats } = useStats();
  const { freezeNotice, streak, fetchHabitLogs } = useHabits();
  const { badges, unlockedCount } = useBadges();
  const weeklyGoal = useWeeklyGoal();
  const reportRef = useRef(null);

  const [period, setPeriod] = useState('week');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [shareLoading, setShareLoading] = useState(false);
  const [shareError, setShareError] = useState('');
  const [weeklyReport, setWeeklyReport] = useState(null);
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
        const weekStart = startOfWeek(parseISO(row.date), { weekStartsOn: 1 });
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

  const currentStreak = streak.current;

  useEffect(() => {
    let active = true;

    async function loadWeeklyReport() {
      if (!user) {
        setWeeklyReport(null);
        return;
      }

      try {
        const report = await getWeeklyReportStats(user.id, currentStreak);
        if (active) {
          setWeeklyReport(report);
        }
      } catch (reportError) {
        if (active) {
          setShareError(reportError.message);
        }
      }
    }

    void loadWeeklyReport();
    return () => {
      active = false;
    };
  }, [currentStreak, user]);

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

  async function handleShareWeek() {
    if (!weeklyReport?.hasShareableData || !reportRef.current) return;

    setShareLoading(true);
    setShareError('');
    try {
      await new Promise((resolve) => window.requestAnimationFrame(resolve));
      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        backgroundColor: null,
        useCORS: true,
        width: 540,
        height: 675,
      });
      const blob = await new Promise((resolve, reject) => {
        canvas.toBlob((value) => {
          if (value) resolve(value);
          else reject(new Error('Unable to generate report image.'));
        }, 'image/png');
      });

      const file = new File([blob], 'donext-weekly-report.png', { type: 'image/png' });
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'My DoNext Weekly Report',
          text: 'My week on DoNext - donext.uz',
        });
      } else {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'donext-weekly-report.png';
        link.click();
        URL.revokeObjectURL(url);
      }
    } catch (shareIssue) {
      if (shareIssue?.name !== 'AbortError') {
        setShareError(shareIssue.message || t('stats.shareFailed'));
      }
    } finally {
      setShareLoading(false);
    }
  }

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
      ? t('habits.freezeNoticeYesterday', {
          streak: freezeNotice.streakDays,
          remaining: freezeNotice.remaining,
          total: freezeNotice.total,
        })
      : t('habits.freezeNoticeDate', {
          streak: freezeNotice.streakDays,
          remaining: freezeNotice.remaining,
          total: freezeNotice.total,
          date: new Intl.DateTimeFormat(getLocaleTag(locale), { month: 'short', day: 'numeric' }).format(parseISO(freezeNotice.date)),
        })
    : '';
  const hasMeaningfulStats =
    (focusData.focusMinutes || 0) > 0 ||
    (focusData.totalMinutes || 0) > 0 ||
    (habitData.perHabit?.length || 0) > 0 ||
    (projectData.tasksCompleted || 0) > 0;

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
      {!hasMeaningfulStats && <EmptyState title={t('stats.emptyTitle')} message={t('stats.emptyMessage')} />}

      {period === 'week' && weeklyGoal.goal && (
        <WeeklyGoalCard
          goal={weeklyGoal.goal}
          progressMinutes={weeklyGoal.progressMinutes}
          percentage={weeklyGoal.percentage}
          percentageRaw={weeklyGoal.percentageRaw}
          remainingMinutes={weeklyGoal.remainingMinutes}
          daysLeft={weeklyGoal.daysLeft}
          minutesPerDay={weeklyGoal.minutesPerDay}
          formatMinutes={weeklyGoal.formatGoalMinutes}
          t={t}
        />
      )}

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
        streak={currentStreak}
      />

      {period === 'week' && weeklyReport?.hasShareableData && (
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold text-slate-100">{t('stats.shareTitle')}</h3>
              <p className="mt-1 text-sm text-slate-400">{t('stats.shareBody')}</p>
            </div>
            <Button variant="secondary" onClick={() => void handleShareWeek()} disabled={shareLoading}>
              {shareLoading ? t('stats.shareGenerating') : t('stats.shareAction')}
            </Button>
          </div>
          {shareError && <p className="mt-3 text-sm text-red-400">{shareError}</p>}
        </Card>
      )}

      <MonthlyOverviewCard rows={monthlyTrendRows} trendPercent={trendPercent} />
      {period === 'month' && weeklyGoal.historyRows.length > 0 && (
        <WeeklyGoalHistoryTable
          rows={weeklyGoal.historyRows}
          formatMinutes={weeklyGoal.formatGoalMinutes}
          localeTag={getLocaleTag(locale)}
          t={t}
        />
      )}
      <AllTimeStatsCard stats={projectData} />
      <BadgeGrid badges={badges} unlockedCount={unlockedCount} title={t('stats.achievementsTitle')} />

      {weeklyReport?.hasShareableData && (
        <div className="pointer-events-none fixed -left-[9999px] top-0 opacity-0">
          <WeeklyReportCard ref={reportRef} stats={weeklyReport} />
        </div>
      )}
    </div>
  );
}
