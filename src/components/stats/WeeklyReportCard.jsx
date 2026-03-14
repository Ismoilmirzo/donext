import { forwardRef } from 'react';
import { formatMinutesHuman } from '../../lib/dates';

const CARD_WIDTH = 540;
const CARD_HEIGHT = 960;

function getToneKey(stats) {
  if (stats.focusMinutes >= 240) return 'stats.reportToneStrongFocus';
  if (stats.tasksCompleted >= 7) return 'stats.reportToneExecution';
  if (stats.habitRate >= 80) return 'stats.reportToneConsistency';
  if (stats.focusMinutes >= 60 || stats.tasksCompleted > 0 || stats.habitRate > 0) return 'stats.reportToneMomentum';
  return 'stats.reportToneFresh';
}

function statTileStyle() {
  return {
    borderRadius: 16,
    border: '1px solid #1E2D45',
    backgroundColor: '#141E30',
    padding: '18px 16px 16px',
  };
}

function StatTile({ icon, value, label }) {
  return (
    <div style={statTileStyle()}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 22, lineHeight: 1 }}>{icon}</span>
        <span
          style={{
            fontFamily: 'Inter, system-ui, sans-serif',
            fontSize: 28,
            fontWeight: 800,
            letterSpacing: '-0.04em',
            color: '#F8FAFC',
            lineHeight: 1,
          }}
        >
          {value}
        </span>
      </div>
      <p
        style={{
          margin: '10px 0 0',
          fontFamily: 'Inter, system-ui, sans-serif',
          fontSize: 12,
          fontWeight: 700,
          letterSpacing: '0.16em',
          textTransform: 'uppercase',
          color: '#8EA2BE',
        }}
      >
        {label}
      </p>
    </div>
  );
}

function BreakdownRow({ item }) {
  return (
    <div style={{ display: 'grid', gap: 10 }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) auto',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <p
          style={{
            margin: 0,
            minWidth: 0,
            fontFamily: 'Inter, system-ui, sans-serif',
            fontSize: 16,
            fontWeight: 700,
            color: '#F8FAFC',
            lineHeight: 1.3,
            wordBreak: 'break-word',
          }}
        >
          {item.name}
        </p>
        <p
          style={{
            margin: 0,
            fontFamily: 'Inter, system-ui, sans-serif',
            fontSize: 16,
            fontWeight: 600,
            color: '#D7E2EE',
            whiteSpace: 'nowrap',
          }}
        >
          {formatMinutesHuman(item.minutes)}
        </p>
      </div>
      <div style={{ height: 8, borderRadius: 999, backgroundColor: '#1E2D45', overflow: 'hidden' }}>
        <div
          style={{
            width: `${Math.max(8, Math.round(item.share || 0))}%`,
            height: '100%',
            borderRadius: 999,
            backgroundColor: item.color || '#34D399',
          }}
        />
      </div>
    </div>
  );
}

const WeeklyReportCard = forwardRef(function WeeklyReportCard({ stats, t }, ref) {
  const breakdownRows = (stats.projectBreakdown || []).slice(0, 3).map((item) => ({
    ...item,
    share: stats.focusMinutes > 0 ? (item.minutes / stats.focusMinutes) * 100 : 0,
  }));
  const accentColor = breakdownRows[0]?.color || '#34D399';
  const tone = t(getToneKey(stats));

  return (
    <div
      ref={ref}
      style={{
        position: 'relative',
        width: CARD_WIDTH,
        height: CARD_HEIGHT,
        boxSizing: 'border-box',
        overflow: 'hidden',
        padding: 30,
        borderRadius: 34,
        color: '#FFFFFF',
        fontFamily: 'Inter, system-ui, sans-serif',
        WebkitFontSmoothing: 'antialiased',
        background: `radial-gradient(circle at 84% 14%, ${accentColor}1F 0%, transparent 26%), linear-gradient(170deg, #0C1B2E 0%, #0F1A30 40%, #16132E 100%)`,
      }}
    >
      <div style={{ display: 'flex', height: '100%', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
          <div
            style={{
              width: 50,
              height: 50,
              borderRadius: 16,
              background: 'linear-gradient(135deg, #34D399 0%, #10B981 100%)',
              color: '#05241A',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: 'Inter, system-ui, sans-serif',
              fontSize: 18,
              fontWeight: 800,
              letterSpacing: '0.08em',
            }}
          >
            DN
          </div>
          <div>
            <p
              style={{
                margin: 0,
                fontFamily: 'Inter, system-ui, sans-serif',
                fontSize: 15,
                fontWeight: 700,
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
                color: '#8EA2BE',
              }}
            >
              {t('common.appName')}
            </p>
            <p
              style={{
                margin: '4px 0 0',
                fontFamily: 'Inter, system-ui, sans-serif',
                fontSize: 24,
                fontWeight: 800,
                letterSpacing: '-0.04em',
                color: '#F8FAFC',
              }}
            >
              {t('stats.reportTitle')}
            </p>
            <p
              style={{
                margin: '8px 0 0',
                fontFamily: 'Inter, system-ui, sans-serif',
                fontSize: 14,
                fontWeight: 500,
                color: '#8EA2BE',
              }}
            >
              {stats.weekLabel}
            </p>
          </div>
        </div>

        <div style={{ marginTop: 24, height: 1, backgroundColor: '#1E2D45' }} />

        <div style={{ marginTop: 34, textAlign: 'center' }}>
          <p
            style={{
              margin: 0,
              fontFamily: 'Inter, system-ui, sans-serif',
              fontSize: 18,
              fontWeight: 700,
              color: '#F59E0B',
            }}
          >
            {t('stats.reportStreakLine', { count: stats.streak })}
          </p>
          <p
            style={{
              margin: '22px 0 0',
              fontFamily: 'Inter, system-ui, sans-serif',
              fontSize: 72,
              fontWeight: 800,
              letterSpacing: '-0.04em',
              lineHeight: 0.92,
              color: '#F8FAFC',
            }}
          >
            {formatMinutesHuman(stats.focusMinutes)}
          </p>
          <p
            style={{
              margin: '10px 0 0',
              fontFamily: 'Inter, system-ui, sans-serif',
              fontSize: 16,
              fontWeight: 500,
              color: '#8EA2BE',
            }}
          >
            {t('stats.reportFocusedThisWeek')}
          </p>
        </div>

        <div style={{ marginTop: 34, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <StatTile icon="✅" value={String(stats.tasksCompleted)} label={t('stats.reportTasksDone')} />
          <StatTile icon="📋" value={String(stats.projectsWorked)} label={t('stats.reportProjects')} />
          <StatTile icon="✓" value={`${Math.round(stats.habitRate)}%`} label={t('stats.reportHabits')} />
          <StatTile icon="⚡" value={String(stats.sessionsCount || 0)} label={t('stats.reportSessions')} />
        </div>

        <div
          style={{
            marginTop: 28,
            flex: 1,
            borderRadius: 22,
            border: '1px solid #1E2D45',
            backgroundColor: '#0E1825',
            padding: 20,
          }}
        >
          <p
            style={{
              margin: 0,
              fontFamily: 'Inter, system-ui, sans-serif',
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: '#8EA2BE',
            }}
          >
            {t('stats.reportBreakdown')}
          </p>
          <div style={{ marginTop: 18, display: 'grid', gap: 18 }}>
            {breakdownRows.length ? (
              breakdownRows.map((item) => <BreakdownRow key={item.name} item={item} />)
            ) : (
              <p
                style={{
                  margin: '34px 0 0',
                  textAlign: 'center',
                  fontFamily: 'Inter, system-ui, sans-serif',
                  fontSize: 15,
                  color: '#8EA2BE',
                }}
              >
                {t('stats.reportEmpty')}
              </p>
            )}
          </div>
        </div>

        <div style={{ marginTop: 26, textAlign: 'center' }}>
          <div
            style={{
              display: 'inline-block',
              borderRadius: 999,
              border: '1px solid #2A3B56',
              backgroundColor: '#141E30',
              padding: '10px 16px',
              fontFamily: 'Inter, system-ui, sans-serif',
              fontSize: 14,
              fontWeight: 600,
              lineHeight: 1.1,
              color: '#D6E1EE',
            }}
          >
            {`✨ ${tone}`}
          </div>
          <p
            style={{
              margin: '18px 0 0',
              fontFamily: 'Inter, system-ui, sans-serif',
              fontSize: 16,
              fontWeight: 600,
              letterSpacing: '0.15em',
              color: '#627591',
            }}
          >
            donext.uz
          </p>
        </div>
      </div>
    </div>
  );
});

export default WeeklyReportCard;
