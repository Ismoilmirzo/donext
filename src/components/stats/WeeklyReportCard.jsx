import { forwardRef } from 'react';
import { formatMinutesHuman } from '../../lib/dates';

const CARD_WIDTH = 600;
const MIN_CARD_HEIGHT = 760;

function getWeeklyTone(stats) {
  if (stats.focusMinutes >= 240) return 'Strong focus week';
  if (stats.tasksCompleted >= 7) return 'Execution week';
  if (stats.habitRate >= 80) return 'Consistency week';
  if (stats.focusMinutes >= 60 || stats.tasksCompleted > 0 || stats.habitRate > 0) return 'Momentum kept alive';
  return 'Fresh momentum';
}

function getWeeklyNarrative(stats, topProject) {
  if (topProject && stats.focusMinutes > 0) {
    return `${formatMinutesHuman(stats.focusMinutes)} of focus with most of the week spent on ${topProject.name}.`;
  }
  if (stats.tasksCompleted > 0) {
    return `${stats.tasksCompleted} completed tasks moved the week forward.`;
  }
  if (stats.habitRate > 0) {
    return `${Math.round(stats.habitRate)}% habit consistency kept the routine in motion.`;
  }
  return 'Small wins still count. Show up again next week.';
}

function StatTile({ label, value, sublabel }) {
  return (
    <div
      style={{
        border: '1px solid rgba(255,255,255,0.08)',
        background: 'linear-gradient(180deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.03) 100%)',
        borderRadius: 24,
        padding: '18px 18px 16px',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
      }}
    >
      <p style={{ margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#8EA2BE' }}>{label}</p>
      <p style={{ margin: '10px 0 0', fontSize: 31, fontWeight: 820, lineHeight: 1, letterSpacing: '-0.04em', color: '#F8FAFC' }}>{value}</p>
      <p style={{ margin: '8px 0 0', fontSize: 13, color: '#A5B3C7' }}>{sublabel}</p>
    </div>
  );
}

function SummaryChip({ children, emphasize = false }) {
  return (
    <div
      style={{
        borderRadius: 999,
        padding: emphasize ? '10px 14px' : '8px 12px',
        backgroundColor: emphasize ? 'rgba(5, 12, 28, 0.54)' : 'rgba(255,255,255,0.08)',
        border: emphasize ? '1px solid rgba(255,255,255,0.12)' : '1px solid rgba(255,255,255,0.08)',
        fontSize: 13,
        color: '#D9E5F1',
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </div>
  );
}

function BreakdownRow({ item, totalMinutes, accentColor }) {
  const share = totalMinutes > 0 ? Math.round((item.minutes / totalMinutes) * 100) : 0;

  return (
    <div
      style={{
        display: 'grid',
        gap: 10,
        padding: '16px 16px 14px',
        borderRadius: 22,
        backgroundColor: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.07)',
      }}
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) auto',
          alignItems: 'start',
          gap: 14,
        }}
      >
        <div style={{ minWidth: 0 }}>
          <p
            style={{
              margin: 0,
              fontSize: 18,
              fontWeight: 700,
              lineHeight: 1.25,
              letterSpacing: '-0.03em',
              color: '#F8FAFC',
              overflowWrap: 'anywhere',
            }}
          >
            {item.name}
          </p>
          <p style={{ margin: '6px 0 0', fontSize: 13, color: '#91A5C0' }}>{share}% of focus time</p>
        </div>
        <p style={{ margin: 0, fontSize: 17, fontWeight: 750, color: '#E5EDF7', whiteSpace: 'nowrap' }}>
          {formatMinutesHuman(item.minutes)}
        </p>
      </div>
      <div
        style={{
          height: 10,
          borderRadius: 999,
          backgroundColor: 'rgba(255,255,255,0.08)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${totalMinutes > 0 ? Math.max(16, Math.round((item.minutes / totalMinutes) * 100)) : 0}%`,
            height: '100%',
            borderRadius: 999,
            background: `linear-gradient(90deg, ${item.color || accentColor} 0%, ${accentColor} 100%)`,
          }}
        />
      </div>
    </div>
  );
}

const WeeklyReportCard = forwardRef(function WeeklyReportCard({ stats }, ref) {
  const breakdownRows = (stats.projectBreakdown || []).slice(0, 3);
  const topProject = breakdownRows[0] || null;
  const accentColor = topProject?.color || '#34D399';
  const topProjectShare = topProject && stats.focusMinutes > 0 ? Math.round((topProject.minutes / stats.focusMinutes) * 100) : 0;
  const tone = getWeeklyTone(stats);
  const narrative = getWeeklyNarrative(stats, topProject);

  return (
    <div
      ref={ref}
      style={{
        position: 'relative',
        overflow: 'hidden',
        width: CARD_WIDTH,
        minHeight: MIN_CARD_HEIGHT,
        padding: 32,
        borderRadius: 36,
        color: '#FFFFFF',
        fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
        background: 'linear-gradient(180deg, #0A1222 0%, #111A34 46%, #1D1840 100%)',
        boxShadow: '0 30px 90px rgba(2, 6, 23, 0.45)',
      }}
    >
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          background: `
            radial-gradient(circle at 15% 12%, rgba(52, 211, 153, 0.22), transparent 22%),
            radial-gradient(circle at 86% 10%, rgba(59, 130, 246, 0.24), transparent 26%),
            radial-gradient(circle at 50% 100%, rgba(249, 115, 22, 0.16), transparent 28%)
          `,
        }}
      />
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          background: 'repeating-linear-gradient(135deg, rgba(255,255,255,0.018) 0 1px, transparent 1px 18px)',
          opacity: 0.35,
        }}
      />

      <div style={{ position: 'relative', zIndex: 1, display: 'grid', gap: 18 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div
              style={{
                width: 50,
                height: 50,
                borderRadius: 18,
                background: 'linear-gradient(135deg, #34D399 0%, #10B981 100%)',
                color: '#05241A',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 18,
                fontWeight: 900,
                letterSpacing: '0.08em',
                boxShadow: '0 14px 30px rgba(16, 185, 129, 0.25)',
              }}
            >
              DN
            </div>
            <div>
              <p style={{ margin: 0, fontSize: 15, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#8EA2BE' }}>
                DoNext
              </p>
              <p style={{ margin: '4px 0 0', fontSize: 28, fontWeight: 820, lineHeight: 1.04, letterSpacing: '-0.05em', color: '#F8FAFC' }}>
                Weekly Report
              </p>
            </div>
          </div>
          <div
            style={{
              borderRadius: 999,
              padding: '10px 14px',
              border: '1px solid rgba(255,255,255,0.10)',
              backgroundColor: 'rgba(255,255,255,0.06)',
              fontSize: 14,
              fontWeight: 600,
              color: '#D3DDED',
              whiteSpace: 'nowrap',
            }}
          >
            {stats.weekLabel}
          </div>
        </div>

        <div
          style={{
            position: 'relative',
            overflow: 'hidden',
            borderRadius: 32,
            padding: '28px 26px 24px',
            border: '1px solid rgba(255,255,255,0.11)',
            background: 'linear-gradient(135deg, rgba(255,255,255,0.11) 0%, rgba(255,255,255,0.04) 42%, rgba(5, 12, 28, 0.24) 100%)',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)',
          }}
        >
          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              right: -48,
              top: -56,
              width: 220,
              height: 220,
              borderRadius: '50%',
              background: `radial-gradient(circle, ${accentColor}55 0%, transparent 68%)`,
            }}
          />
          <div style={{ position: 'relative', zIndex: 1, display: 'grid', gap: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap' }}>
              <SummaryChip emphasize>{tone}</SummaryChip>
              {topProject ? <SummaryChip>{topProjectShare}% top share</SummaryChip> : null}
            </div>

            <div>
              <p style={{ margin: 0, fontSize: 76, fontWeight: 860, lineHeight: 0.92, letterSpacing: '-0.07em', color: '#F8FAFC' }}>
                {formatMinutesHuman(stats.focusMinutes)}
              </p>
              <p style={{ margin: '10px 0 0', fontSize: 18, fontWeight: 600, color: '#D8E4F3' }}>focused this week</p>
            </div>

            <p style={{ margin: 0, maxWidth: 460, fontSize: 20, lineHeight: 1.45, color: '#D5E0ED' }}>{narrative}</p>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              <SummaryChip>{stats.tasksCompleted} tasks closed</SummaryChip>
              <SummaryChip>{Math.round(stats.habitRate)}% habit consistency</SummaryChip>
              {topProject ? <SummaryChip>{topProjectShare}% of focus on top project</SummaryChip> : null}
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <StatTile label="Streak" value={`${stats.streak} days`} sublabel="Current momentum run" />
          <StatTile label="Tasks" value={String(stats.tasksCompleted)} sublabel="Completed this week" />
          <StatTile label="Projects" value={String(stats.projectsWorked)} sublabel="Projects moved forward" />
          <StatTile label="Habits" value={`${Math.round(stats.habitRate)}%`} sublabel="Completion rate" />
        </div>

        <div
          style={{
            borderRadius: 30,
            padding: 22,
            border: '1px solid rgba(255,255,255,0.10)',
            background: 'linear-gradient(180deg, rgba(8, 18, 36, 0.70) 0%, rgba(8, 18, 36, 0.42) 100%)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <div>
              <p style={{ margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#8EA2BE' }}>
                Focus breakdown
              </p>
              <p style={{ margin: '8px 0 0', fontSize: 18, color: '#D6E1EE' }}>Where attention actually went this week.</p>
            </div>
            <SummaryChip>{formatMinutesHuman(stats.focusMinutes)} total</SummaryChip>
          </div>

          <div style={{ marginTop: 18, display: 'grid', gap: 14 }}>
            {breakdownRows.length ? (
              breakdownRows.map((item) => (
                <BreakdownRow key={item.name} item={item} totalMinutes={stats.focusMinutes} accentColor={accentColor} />
              ))
            ) : (
              <div
                style={{
                  padding: '24px 18px',
                  borderRadius: 22,
                  border: '1px dashed rgba(255,255,255,0.14)',
                  color: '#9CB0C7',
                  fontSize: 15,
                  textAlign: 'center',
                }}
              >
                No focus breakdown yet. The first session will shape next week&apos;s card.
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <p style={{ margin: 0, fontSize: 14, color: '#96AAC4' }}>Focused beats busy.</p>
          <p style={{ margin: 0, fontSize: 13, letterSpacing: '0.22em', textTransform: 'uppercase', color: '#627591' }}>donext.uz</p>
        </div>
      </div>
    </div>
  );
});

export default WeeklyReportCard;
