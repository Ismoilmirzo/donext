import { forwardRef } from 'react';

const CARD_WIDTH = 540;
const CARD_HEIGHT = 720;
const DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const FALLBACK_PROJECT_GRADIENTS = {
  '#6366f1': ['#6366f1', '#818cf8'],
  '#f59e0b': ['#f59e0b', '#fbbf24'],
  '#10b981': ['#10b981', '#34d399'],
  '#ef4444': ['#ef4444', '#f87171'],
  '#ec4899': ['#ec4899', '#f472b6'],
  '#3b82f6': ['#3b82f6', '#60a5fa'],
};

function formatDuration(minutes) {
  const totalMinutes = Math.max(0, Math.round(Number(minutes) || 0));
  if (totalMinutes === 0) return '0m';

  const hours = Math.floor(totalMinutes / 60);
  const remainingMinutes = totalMinutes % 60;
  if (!hours) return `${remainingMinutes}m`;
  if (!remainingMinutes) return `${hours}h`;
  return `${hours}h ${remainingMinutes}m`;
}

function truncateProjectName(value, maxLength = 34) {
  const text = String(value || '').trim();
  if (text.length <= maxLength) return text;
  return `${text.slice(0, Math.max(0, maxLength - 3)).trimEnd()}...`;
}

function normalizeHex(value, fallback = '#10b981') {
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(trimmed)) return trimmed.toLowerCase();
  return fallback;
}

function lightenColor(hex, amount = 0.2) {
  const normalized = normalizeHex(hex);
  const channels = [1, 3, 5].map((index) => parseInt(normalized.slice(index, index + 2), 16));
  const [r, g, b] = channels.map((channel) => Math.min(255, Math.round(channel + (255 - channel) * amount)));
  return `#${[r, g, b].map((channel) => channel.toString(16).padStart(2, '0')).join('')}`;
}

function getGradientColors(color) {
  const normalized = normalizeHex(color);
  return FALLBACK_PROJECT_GRADIENTS[normalized] || [normalized, lightenColor(normalized, 0.2)];
}

function StatCell({ children, label, highlight = false }) {
  return (
    <div
      style={{
        background: 'rgba(255,255,255,0.04)',
        border: '0.5px solid rgba(255,255,255,0.06)',
        borderRadius: 12,
        padding: '14px 12px',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          fontSize: 24,
          fontWeight: 700,
          lineHeight: 1.05,
          color: highlight ? '#f59e0b' : '#f8fafc',
        }}
      >
        {children}
      </div>
      <div
        style={{
          marginTop: 4,
          fontSize: 11,
          fontWeight: 500,
          letterSpacing: '0.05em',
          color: '#7f8fa8',
        }}
      >
        {label}
      </div>
    </div>
  );
}

function HeroValue({ value }) {
  return (
    <svg width="360" height="72" viewBox="0 0 360 72" role="img" aria-label={value}>
      <defs>
        <linearGradient id="weekly-report-hero-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#10b981" />
          <stop offset="100%" stopColor="#34d399" />
        </linearGradient>
      </defs>
      <text
        x="180"
        y="52"
        textAnchor="middle"
        fill="url(#weekly-report-hero-gradient)"
        fontFamily="Inter, system-ui, -apple-system, sans-serif"
        fontSize="56"
        fontWeight="700"
        letterSpacing="-3"
      >
        {value}
      </text>
    </svg>
  );
}

const WeeklyReportCard = forwardRef(function WeeklyReportCard({ stats, t }, ref) {
  const translate = typeof t === 'function' ? t : (value) => value;
  const dailyFocusMinutes = Array.isArray(stats.dailyFocusMinutes)
    ? stats.dailyFocusMinutes.slice(0, 7)
    : Array(7).fill(0);
  const maxDailyMinutes = Math.max(...dailyFocusMinutes, 1);
  const topProjects = (stats.projectBreakdown || []).slice(0, 3);
  const totalProjectMinutes = Math.max(0, Number(stats.focusMinutes) || 0);
  const todayIndex = Number.isFinite(stats.todayIndex) ? stats.todayIndex : 6;

  return (
    <div
      ref={ref}
      style={{
        width: CARD_WIDTH,
        height: CARD_HEIGHT,
        boxSizing: 'border-box',
        position: 'relative',
        overflow: 'hidden',
        padding: '34px 30px 28px',
        borderRadius: 34,
        background: 'linear-gradient(165deg, #0f172a 0%, #1a1040 40%, #0f2030 100%)',
        color: '#f8fafc',
        fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
        WebkitFontSmoothing: 'antialiased',
      }}
    >
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: -60,
          right: -60,
          width: 200,
          height: 200,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(16,185,129,0.08) 0%, transparent 70%)',
        }}
      />
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          bottom: -40,
          left: -40,
          width: 160,
          height: 160,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(99,102,241,0.06) 0%, transparent 70%)',
        }}
      />

      <div style={{ position: 'relative', display: 'flex', height: '100%', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: '#10b981',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 13,
              fontWeight: 600,
              letterSpacing: '-0.04em',
            }}
          >
            DN
          </div>
          <div>
            <div
              style={{
                fontSize: 12,
                fontWeight: 600,
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                color: '#94a3b8',
              }}
            >
              {translate('stats.reportHeader')}
            </div>
            <div style={{ marginTop: 4, fontSize: 14, color: '#7f8fa8' }}>{stats.weekLabel}</div>
          </div>
        </div>

        <div style={{ marginTop: 20, textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <HeroValue value={formatDuration(stats.focusMinutes)} />
          </div>
          <div style={{ marginTop: -2, fontSize: 14, color: '#a4b2c7' }}>{translate('stats.reportTotalFocusTime')}</div>
        </div>

        <div style={{ marginTop: 22, display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10 }}>
          <StatCell label={translate('stats.reportStatTasks')}>{stats.tasksCompleted || 0}</StatCell>
          <StatCell label={translate('stats.reportStatHabits')}>
            <>
              {Math.round(stats.habitRate || 0)}
              <span style={{ fontSize: 14, color: '#94a3b8' }}>%</span>
            </>
          </StatCell>
          <StatCell label={translate('stats.reportStatDayStreak')} highlight>
            {stats.streak || 0}
          </StatCell>
        </div>

        <div style={{ marginTop: 22 }}>
          <div
            style={{
              marginBottom: 12,
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              color: '#8393ac',
            }}
          >
            {translate('stats.reportDailyFocus')}
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 80 }}>
            {dailyFocusMinutes.map((minutes, index) => {
              const isFuture = index > todayIndex;
              const isBestDay = minutes > 0 && minutes === maxDailyMinutes;
              const barHeight = isFuture ? 4 : Math.max(4, Math.round((Math.max(0, minutes) / maxDailyMinutes) * 80));
              const barColor =
                isFuture || minutes === 0 ? 'rgba(255,255,255,0.14)' : isBestDay ? '#34d399' : '#10b981';

              return (
                <div
                  key={`${DAYS[index]}-${index}`}
                  style={{
                    flex: 1,
                    display: 'flex',
                    minWidth: 0,
                    flexDirection: 'column',
                    justifyContent: 'flex-end',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <div
                    style={{
                      width: '100%',
                      height: barHeight,
                      borderRadius: '4px 4px 0 0',
                      background: barColor,
                    }}
                  />
                  <span style={{ fontSize: 10, fontWeight: 500, color: isFuture ? '#667892' : '#8090aa' }}>{DAYS[index]}</span>
                </div>
              );
            })}
          </div>
        </div>

        {topProjects.length > 0 ? (
          <div style={{ marginTop: 22 }}>
            <div
              style={{
                marginBottom: 12,
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
                color: '#8393ac',
              }}
            >
              {translate('stats.reportProjectsHeader')}
            </div>
            <div style={{ display: 'grid', gap: 14 }}>
              {topProjects.map((project, index) => {
                const [baseColor, lighterColor] = getGradientColors(project.color);
                const widthPercent = totalProjectMinutes > 0 ? (project.minutes / totalProjectMinutes) * 100 : 0;

                return (
                  <div key={`${project.name}-${index}`}>
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'minmax(0, 1fr) auto',
                        alignItems: 'center',
                        gap: 12,
                        marginBottom: 8,
                      }}
                    >
                      <span
                        style={{
                          display: 'block',
                          minWidth: 0,
                          paddingRight: 8,
                          whiteSpace: 'nowrap',
                          lineHeight: '20px',
                          paddingTop: 2,
                          fontSize: 14,
                          fontWeight: 600,
                          color: '#e2e8f0',
                        }}
                      >
                        {truncateProjectName(project.name)}
                      </span>
                      <span
                        style={{
                          flexShrink: 0,
                          fontSize: 12,
                          fontWeight: 600,
                          color: '#a4b2c7',
                          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                        }}
                      >
                        {formatDuration(project.minutes)}
                      </span>
                    </div>
                    <div
                      style={{
                        height: 7,
                        borderRadius: 3,
                        overflow: 'hidden',
                        background: 'rgba(255,255,255,0.06)',
                      }}
                    >
                      <div
                        style={{
                          height: '100%',
                          width: `${Math.max(0, Math.min(100, widthPercent))}%`,
                          borderRadius: 3,
                          background: `linear-gradient(90deg, ${baseColor}, ${lighterColor})`,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}

        <div
          style={{
            marginTop: 'auto',
            paddingTop: 12,
            textAlign: 'center',
            fontSize: 12,
            fontWeight: 500,
            letterSpacing: '0.1em',
            color: '#6d7e98',
          }}
        >
          donext.uz
        </div>
      </div>
    </div>
  );
});

export default WeeklyReportCard;
