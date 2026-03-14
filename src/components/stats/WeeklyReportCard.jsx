import { forwardRef } from 'react';
import { formatMinutesHuman } from '../../lib/dates';

const CARD_WIDTH = 600;
const MIN_CARD_HEIGHT = 740;

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

function breakdownRowStyle(item, totalMinutes, accentColor) {
  return {
    width: `${totalMinutes > 0 ? Math.max(14, Math.round((item.minutes / totalMinutes) * 100)) : 0}%`,
    background: `linear-gradient(90deg, ${item.color || accentColor} 0%, ${accentColor} 100%)`,
    height: 10,
    borderRadius: 999,
  };
}

function StatTile({ label, value, sublabel }) {
  return (
    <div
      style={{
        border: '1px solid rgba(255,255,255,0.10)',
        background: 'linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 100%)',
        borderRadius: 24,
        padding: '18px 18px 16px',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
      }}
    >
      <p style={{ margin: 0, fontSize: 12, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#93A4BE' }}>{label}</p>
      <p style={{ margin: '10px 0 0', fontSize: 32, fontWeight: 800, letterSpacing: '-0.04em', color: '#F8FAFC' }}>{value}</p>
      <p style={{ margin: '8px 0 0', fontSize: 13, color: '#A9B6CB' }}>{sublabel}</p>
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
        padding: '14px 14px 12px',
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.035)',
        border: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) auto',
          gap: 14,
          alignItems: 'start',
        }}
      >
        <div style={{ minWidth: 0 }}>
          <p
            style={{
              margin: 0,
              fontSize: 17,
              fontWeight: 650,
              color: '#F8FAFC',
              lineHeight: 1.3,
              whiteSpace: 'normal',
              overflowWrap: 'anywhere',
            }}
          >
            {item.name}
          </p>
          <p style={{ margin: '6px 0 0', fontSize: 13, color: '#8DA1BE' }}>{share}% of focus time</p>
        </div>
        <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#D9E3F0', whiteSpace: 'nowrap' }}>
          {formatMinutesHuman(item.minutes)}
        </p>
      </div>
      <div
        style={{
          height: 10,
          borderRadius: 999,
          backgroundColor: 'rgba(255,255,255,0.10)',
          overflow: 'hidden',
        }}
      >
        <div style={breakdownRowStyle(item, totalMinutes, accentColor)} />
      </div>
    </div>
  );
}

const WeeklyReportCard = forwardRef(function WeeklyReportCard({ stats }, ref) {
  const breakdownRows = (stats.projectBreakdown || []).slice(0, 3);
  const topProject = breakdownRows[0] || null;
  const accentColor = topProject?.color || '#4ADE80';
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
        padding: 34,
        borderRadius: 36,
        color: '#FFFFFF',
        fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
        background: 'linear-gradient(145deg, #081425 0%, #121739 52%, #24153E 100%)',
        boxShadow: '0 30px 90px rgba(2, 6, 23, 0.45)',
      }}
    >
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          background: `
            radial-gradient(circle at top right, rgba(45, 212, 191, 0.22), transparent 34%),
            radial-gradient(circle at bottom left, rgba(249, 115, 22, 0.16), transparent 28%),
            linear-gradient(rgba(255,255,255,0.045) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.045) 1px, transparent 1px)
          `,
          backgroundSize: 'auto, auto, 32px 32px, 32px 32px',
          backgroundPosition: '0 0, 0 0, -1px -1px, -1px -1px',
          opacity: 0.55,
        }}
      />

      <div style={{ position: 'relative', zIndex: 1, display: 'grid', gap: 20 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: 18,
                background: 'linear-gradient(135deg, #34D399 0%, #10B981 100%)',
                color: '#05201A',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 18,
                fontWeight: 900,
                letterSpacing: '0.08em',
                boxShadow: '0 12px 28px rgba(16, 185, 129, 0.28)',
              }}
            >
              DN
            </div>
            <div>
              <p style={{ margin: 0, fontSize: 16, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#8EA0BC' }}>
                DoNext
              </p>
              <p style={{ margin: '4px 0 0', fontSize: 34, fontWeight: 800, lineHeight: 1.05, letterSpacing: '-0.05em', color: '#F8FAFC' }}>
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
              color: '#D5DFEC',
              whiteSpace: 'nowrap',
            }}
          >
            {stats.weekLabel}
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1.45fr) minmax(210px, 0.95fr)',
            gap: 16,
          }}
        >
          <div
            style={{
              borderRadius: 30,
              padding: '24px 24px 22px',
              border: '1px solid rgba(255,255,255,0.10)',
              background: 'linear-gradient(180deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.04) 100%)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)',
            }}
          >
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#91A3BD' }}>
              {tone}
            </p>
            <p style={{ margin: '10px 0 0', fontSize: 58, fontWeight: 850, lineHeight: 0.95, letterSpacing: '-0.06em', color: '#F8FAFC' }}>
              {formatMinutesHuman(stats.focusMinutes)}
            </p>
            <p style={{ margin: '12px 0 0', fontSize: 18, lineHeight: 1.45, color: '#DBE7F3' }}>{narrative}</p>
            <div style={{ marginTop: 18, display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              <div
                style={{
                  borderRadius: 999,
                  padding: '8px 12px',
                  backgroundColor: 'rgba(9, 18, 36, 0.50)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  fontSize: 13,
                  color: '#D7E2EE',
                }}
              >
                {stats.tasksCompleted} tasks closed
              </div>
              <div
                style={{
                  borderRadius: 999,
                  padding: '8px 12px',
                  backgroundColor: 'rgba(9, 18, 36, 0.50)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  fontSize: 13,
                  color: '#D7E2EE',
                }}
              >
                {Math.round(stats.habitRate)}% habit consistency
              </div>
            </div>
          </div>

          <div
            style={{
              borderRadius: 30,
              padding: '22px 20px',
              border: '1px solid rgba(255,255,255,0.10)',
              background: 'linear-gradient(180deg, rgba(11, 18, 38, 0.78) 0%, rgba(11, 18, 38, 0.46) 100%)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              minHeight: 0,
            }}
          >
            <div>
              <p style={{ margin: 0, fontSize: 12, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#8FA1BB' }}>
                Spotlight
              </p>
              <p style={{ margin: '12px 0 0', fontSize: 15, color: '#8FA1BB' }}>Top project</p>
              <p
                style={{
                  margin: '8px 0 0',
                  fontSize: 26,
                  fontWeight: 760,
                  lineHeight: 1.1,
                  letterSpacing: '-0.04em',
                  color: '#F8FAFC',
                  overflowWrap: 'anywhere',
                }}
              >
                {topProject?.name || 'No project logged'}
              </p>
            </div>
            <div
              style={{
                marginTop: 20,
                borderRadius: 24,
                padding: '16px 16px 14px',
                background: 'linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.04) 100%)',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              <p style={{ margin: 0, fontSize: 14, color: '#9FB0C7' }}>Share of focus</p>
              <p style={{ margin: '4px 0 0', fontSize: 36, fontWeight: 820, letterSpacing: '-0.05em', color: '#F8FAFC' }}>
                {topProject ? `${topProjectShare}%` : '0%'}
              </p>
              <div style={{ marginTop: 12, height: 10, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                <div
                  style={{
                    width: `${topProject ? Math.max(16, topProjectShare) : 0}%`,
                    height: '100%',
                    borderRadius: 999,
                    background: `linear-gradient(90deg, ${accentColor} 0%, #F97316 100%)`,
                  }}
                />
              </div>
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
            background: 'linear-gradient(180deg, rgba(8, 18, 36, 0.72) 0%, rgba(8, 18, 36, 0.42) 100%)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <div>
              <p style={{ margin: 0, fontSize: 12, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#8EA0BC' }}>
                Focus breakdown
              </p>
              <p style={{ margin: '8px 0 0', fontSize: 18, color: '#D7E2EE' }}>
                Where attention actually went this week.
              </p>
            </div>
            <div
              style={{
                borderRadius: 999,
                padding: '10px 14px',
                backgroundColor: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.08)',
                fontSize: 14,
                color: '#E5EDF6',
                whiteSpace: 'nowrap',
              }}
            >
              {formatMinutesHuman(stats.focusMinutes)} total
            </div>
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
                  color: '#9DB0C7',
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
          <p style={{ margin: 0, fontSize: 14, color: '#94A7C2' }}>Focused beats busy.</p>
          <p style={{ margin: 0, fontSize: 14, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#61738F' }}>donext.uz</p>
        </div>
      </div>
    </div>
  );
});

export default WeeklyReportCard;
