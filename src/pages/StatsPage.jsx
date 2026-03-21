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
import Modal from '../components/ui/Modal';
import { StatsPageSkeleton } from '../components/ui/PageSkeletons';
import { useAuth } from '../contexts/AuthContext';
import { useBadges } from '../contexts/BadgeContext';
import { useLocale } from '../contexts/LocaleContext';
import { useToast } from '../contexts/ToastContext';
import { useHabits } from '../hooks/useHabits';
import { useStats } from '../hooks/useStats';
import { useWeeklyGoal } from '../hooks/useWeeklyGoal';
import { toISODate } from '../lib/dates';
import { getLocaleTag } from '../lib/i18n';
import { supabase } from '../lib/supabase';
import { getWeeklyReportStats } from '../lib/weeklyReport';

const REPORT_WIDTH = 540;
const REPORT_HEIGHT = 720;
const SHARE_LINK = 'https://donext.uz';

function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((value) => {
      if (value) resolve(value);
      else reject(new Error('Unable to generate report image.'));
    }, type, quality);
  });
}

function triggerDownload(url, filename) {
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
}

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
  const toast = useToast();
  const { getFocusStats, getHabitStats, getProjectStats } = useStats();
  const { freezeNotice, streak, fetchHabitLogs } = useHabits();
  const { badges, unlockedCount } = useBadges();
  const weeklyGoal = useWeeklyGoal();
  const reportRef = useRef(null);

  const [period, setPeriod] = useState('week');
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [shareLoading, setShareLoading] = useState(false);
  const [sharePreviewOpen, setSharePreviewOpen] = useState(false);
  const [sharePreviewError, setSharePreviewError] = useState('');
  const [sharePreviewAsset, setSharePreviewAsset] = useState(null);
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
    avgSessionsPerTask: 0,
    efficiencyRate: 0,
  });
  const [monthlyTrendRows, setMonthlyTrendRows] = useState([]);

  useEffect(() => {
    return () => {
      if (sharePreviewAsset?.url) {
        URL.revokeObjectURL(sharePreviewAsset.url);
      }
    };
  }, [sharePreviewAsset]);

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
          avgSessionsPerTask: 0,
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
        const report = await getWeeklyReportStats(user.id, currentStreak, getLocaleTag(locale));
        if (active) {
          setWeeklyReport(report);
        }
      } catch (reportError) {
        if (active) {
          toast.error(t('toasts.reportFailed'), reportError.message);
        }
      }
    }

    void loadWeeklyReport();
    return () => {
      active = false;
    };
  }, [currentStreak, locale, toast, user]);

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

  async function buildShareAsset() {
    if (!reportRef.current) {
      throw new Error(t('stats.shareFailed'));
    }

    if (document.fonts?.ready) {
      await document.fonts.ready;
    }
    await new Promise((resolve) => window.requestAnimationFrame(() => window.requestAnimationFrame(resolve)));
    await new Promise((resolve) => window.setTimeout(resolve, 120));
    const canvas = await html2canvas(reportRef.current, {
      scale: 2,
      backgroundColor: '#0A1222',
      useCORS: true,
      width: REPORT_WIDTH,
      height: REPORT_HEIGHT,
      windowWidth: REPORT_WIDTH,
      windowHeight: REPORT_HEIGHT,
    });

    const pngBlob = await canvasToBlob(canvas, 'image/png');
    let blob = pngBlob;
    let type = 'image/png';
    let filename = 'donext-weekly-report.png';

    if (pngBlob.size > 500 * 1024) {
      const jpegBlob = await canvasToBlob(canvas, 'image/jpeg', 0.92);
      if (jpegBlob.size < pngBlob.size) {
        blob = jpegBlob;
        type = 'image/jpeg';
        filename = 'donext-weekly-report.jpg';
      }
    }

    const file = new File([blob], filename, { type });
    const url = URL.createObjectURL(blob);
    return { blob, file, filename, mimeType: type, size: blob.size, url };
  }

  async function ensureShareAsset() {
    if (sharePreviewAsset) return sharePreviewAsset;

    const nextAsset = await buildShareAsset();
    setSharePreviewAsset((currentAsset) => {
      if (currentAsset?.url) {
        URL.revokeObjectURL(currentAsset.url);
      }
      return nextAsset;
    });
    return nextAsset;
  }

  async function openSharePreview() {
    if (!weeklyReport?.hasShareableData) return;

    setSharePreviewOpen(true);
    setSharePreviewError('');
    setSharePreviewAsset((currentAsset) => {
      if (currentAsset?.url) {
        URL.revokeObjectURL(currentAsset.url);
      }
      return null;
    });
    setShareLoading(true);

    try {
      const nextAsset = await buildShareAsset();
      setSharePreviewAsset((currentAsset) => {
        if (currentAsset?.url) {
          URL.revokeObjectURL(currentAsset.url);
        }
        return nextAsset;
      });
    } catch (shareIssue) {
      setSharePreviewError(shareIssue.message || t('stats.sharePreviewOpenFailed'));
      toast.error(t('stats.shareTitle'), shareIssue.message || t('stats.shareFailed'));
    } finally {
      setShareLoading(false);
    }
  }

  function supportsNativeShare(asset) {
    if (!asset || !navigator.share) return false;
    try {
      if (typeof navigator.canShare === 'function') {
        return navigator.canShare({ files: [asset.file] });
      }
      return true;
    } catch {
      return false;
    }
  }

  async function handleDownloadShare() {
    setShareLoading(true);
    try {
      const asset = await ensureShareAsset();
      triggerDownload(asset.url, asset.filename);
      toast.success(t('stats.shareTitle'), t('stats.shareDownloaded'));
    } catch (shareIssue) {
      toast.error(t('stats.shareTitle'), shareIssue.message || t('stats.shareFailed'));
    } finally {
      setShareLoading(false);
    }
  }

  async function handleNativeShare() {
    setShareLoading(true);
    try {
      const asset = await ensureShareAsset();
      await navigator.share({
        files: [asset.file],
        title: `${t('common.appName')} · ${t('stats.reportTitle')}`,
        text: SHARE_LINK,
      });
      toast.success(t('stats.shareTitle'), t('stats.shareShared'));
      setSharePreviewOpen(false);
    } catch (shareIssue) {
      if (shareIssue?.name !== 'AbortError') {
        toast.error(t('stats.shareTitle'), shareIssue.message || t('stats.shareFailed'));
      }
    } finally {
      setShareLoading(false);
    }
  }

  async function handleCopyShareLink() {
    try {
      await navigator.clipboard.writeText(SHARE_LINK);
      toast.success(t('stats.shareTitle'), t('stats.shareLinkCopied'));
    } catch (copyIssue) {
      toast.error(t('stats.shareTitle'), copyIssue.message || t('stats.shareFailed'));
    }
  }

  const bestHabit = habitData.perHabit?.[0] || null;
  const worstHabit = habitData.perHabit?.[habitData.perHabit.length - 1] || null;
  const deltaMinutes = (focusData.focusMinutes || 0) - (prevFocusData.focusMinutes || 0);

  const currentChunk = monthlyTrendRows.slice(-4);
  const previousChunk = monthlyTrendRows.slice(-8, -4);
  const thisMonthTotal = currentChunk.reduce((sum, row) => sum + row.minutes, 0);
  const previousMonthTotal = previousChunk.reduce((sum, row) => sum + row.minutes, 0);
  const trendPercent = previousMonthTotal ? ((thisMonthTotal - previousMonthTotal) / previousMonthTotal) * 100 : 0;
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

  const summaryMetrics = [
    { label: t('stats.metricFocusTime'), value: `${focusData.focusMinutes || 0}m` },
    { label: t('stats.metricTasksDone'), value: `${projectData.tasksCompleted || 0}` },
    { label: t('stats.metricHabitRate'), value: `${habitData.overallRate || 0}%` },
    { label: t('stats.metricStreak'), value: `${currentStreak || 0}d` },
  ];

  const tabs = [
    { id: 'overview', label: t('stats.tabOverview') },
    { id: 'focus', label: t('stats.tabFocus') },
    { id: 'habits', label: t('stats.tabHabits') },
    { id: 'achievements', label: t('stats.tabAchievements') },
  ];
  const canUseNativeShare =
    typeof navigator !== 'undefined' &&
    typeof navigator.share === 'function' &&
    (!sharePreviewAsset || supportsNativeShare(sharePreviewAsset));

  if (loading) return <StatsPageSkeleton />;

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-slate-50">{t('stats.title')}</h1>
            <p className="mt-1 text-sm text-slate-400">{period === 'week' ? t('stats.labelThisWeek') : t('stats.labelThisMonth')}</p>
          </div>
            <div className="flex flex-wrap items-center gap-2">
              {period === 'week' && weeklyReport?.hasShareableData ? (
                <Button variant="secondary" onClick={() => void openSharePreview()} disabled={shareLoading}>
                  {shareLoading ? t('stats.shareGenerating') : t('stats.shareAction')}
                </Button>
              ) : null}
            <div className="rounded-lg bg-slate-800 p-1 text-sm">
              <button
                type="button"
                onClick={() => setPeriod('week')}
                className={`rounded-md px-3 py-1.5 ${period === 'week' ? 'bg-slate-700 text-slate-100' : 'text-slate-400'}`}
              >
                {t('stats.thisWeek')}
              </button>
              <button
                type="button"
                onClick={() => setPeriod('month')}
                className={`rounded-md px-3 py-1.5 ${period === 'month' ? 'bg-slate-700 text-slate-100' : 'text-slate-400'}`}
              >
                {t('stats.thisMonth')}
              </button>
            </div>
          </div>
        </div>
      </Card>

      {error ? <Card className="border-red-500/30 bg-red-500/10 text-sm text-red-200">{error}</Card> : null}
      {freezeNotice ? <Card className="dn-banner-info text-sm">{freezeNoticeText}</Card> : null}

      {!hasMeaningfulStats ? (
        <EmptyState title={t('stats.emptyTitle')} message={t('stats.emptyMessage')} />
      ) : (
        <>
          <Card>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {summaryMetrics.map((metric) => (
                <div key={metric.label} className="rounded-2xl border border-slate-700 bg-slate-900/40 px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{metric.label}</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-100">{metric.value}</p>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <div className="flex flex-wrap gap-2" role="tablist">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={activeTab === tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition-all duration-200 ${
                    activeTab === tab.id
                      ? 'bg-slate-700 text-slate-100 shadow-sm'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-slate-300'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </Card>

          {activeTab === 'overview' ? (
            <div className="space-y-4">
              {period === 'week' && weeklyGoal.goal ? (
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
              ) : null}
              <FocusTimeChart
                focusMinutes={focusData.focusMinutes || 0}
                totalMinutes={focusData.totalMinutes || 0}
                overheadMinutes={focusData.overheadMinutes || 0}
                efficiencyRate={focusData.efficiencyRate || 0}
                deltaMinutes={deltaMinutes}
                label={period === 'week' ? t('stats.labelThisWeek') : t('stats.labelThisMonth')}
              />
              <WeeklyOverviewCard
                overallRate={habitData.overallRate || 0}
                bestHabit={bestHabit}
                worstHabit={worstHabit}
                streak={currentStreak}
              />
              <MonthlyOverviewCard rows={monthlyTrendRows} trendPercent={trendPercent} />
              <AllTimeStatsCard stats={projectData} />
              <Card>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-semibold text-slate-100">{t('stats.achievementsTitle')}</h3>
                    <p className="mt-1 text-sm text-slate-400">
                      {unlockedCount}/{badges.length}
                    </p>
                  </div>
                  <Button variant="secondary" onClick={() => setActiveTab('achievements')}>
                    {t('stats.tabAchievements')}
                  </Button>
                </div>
              </Card>
            </div>
          ) : null}

          {activeTab === 'focus' ? (
            <div className="space-y-4">
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
              <MonthlyOverviewCard rows={monthlyTrendRows} trendPercent={trendPercent} />
            </div>
          ) : null}

          {activeTab === 'habits' ? (
            <div className="space-y-4">
              {period === 'week' && weeklyGoal.goal ? (
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
              ) : null}
              <WeeklyOverviewCard
                overallRate={habitData.overallRate || 0}
                bestHabit={bestHabit}
                worstHabit={worstHabit}
                streak={currentStreak}
              />
              {period === 'month' && weeklyGoal.historyRows.length > 0 ? (
                <WeeklyGoalHistoryTable
                  rows={weeklyGoal.historyRows}
                  formatMinutes={weeklyGoal.formatGoalMinutes}
                  localeTag={getLocaleTag(locale)}
                  t={t}
                />
              ) : null}
            </div>
          ) : null}

          {activeTab === 'achievements' ? (
            <BadgeGrid badges={badges} unlockedCount={unlockedCount} title={t('stats.achievementsTitle')} defaultExpanded={false} />
          ) : null}
        </>
      )}

      <Modal
        open={sharePreviewOpen}
        onClose={() => {
          setSharePreviewOpen(false);
          setSharePreviewError('');
        }}
        title={t('stats.sharePreviewTitle')}
        panelClassName="max-w-[680px]"
        bodyClassName="space-y-4"
        footer={
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="ghost" onClick={() => setSharePreviewOpen(false)} disabled={shareLoading}>
              {t('stats.shareCancel')}
            </Button>
            <Button variant="secondary" onClick={() => void handleDownloadShare()} disabled={shareLoading || !sharePreviewAsset}>
              {t('stats.shareDownload')}
            </Button>
            {canUseNativeShare ? (
              <Button onClick={() => void handleNativeShare()} disabled={shareLoading || !sharePreviewAsset}>
                {t('stats.shareConfirm')}
              </Button>
            ) : (
              <Button onClick={() => void handleCopyShareLink()} disabled={shareLoading}>
                {t('stats.shareCopyLink')}
              </Button>
            )}
          </div>
        }
      >
        {shareLoading && !sharePreviewAsset ? (
          <div className="rounded-2xl border border-slate-700 bg-slate-900/50 px-4 py-8 text-center text-sm text-slate-300">
            {t('stats.sharePreviewLoading')}
          </div>
        ) : null}
        {sharePreviewError ? (
          <div className="space-y-3 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-4 text-sm text-red-200">
            <p>{sharePreviewError}</p>
            <Button variant="secondary" onClick={() => void openSharePreview()} disabled={shareLoading}>
              {t('stats.sharePreviewRetry')}
            </Button>
          </div>
        ) : null}
        {sharePreviewAsset ? (
          <div className="space-y-3">
            <p className="text-sm text-slate-400">{t('stats.shareBody')}</p>
            <div className="overflow-hidden rounded-[28px] border border-slate-700 bg-slate-950">
              <img src={sharePreviewAsset.url} alt={t('stats.shareTitle')} className="block h-auto w-full" />
            </div>
          </div>
        ) : null}
      </Modal>

      {weeklyReport?.hasShareableData ? (
        <div
          style={{
            position: 'fixed',
            left: 0,
            top: 0,
            width: REPORT_WIDTH,
            height: REPORT_HEIGHT,
            opacity: 1,
            pointerEvents: 'none',
            transform: 'translateX(-200vw)',
            zIndex: -1,
          }}
        >
          <WeeklyReportCard ref={reportRef} stats={weeklyReport} t={t} />
        </div>
      ) : null}
    </div>
  );
}
