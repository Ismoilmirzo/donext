import { forwardRef } from 'react';
import { formatMinutesHuman } from '../../lib/dates';

function breakdownRowStyle(item, totalMinutes) {
  return {
    width: `${totalMinutes > 0 ? Math.max(12, Math.round((item.minutes / totalMinutes) * 100)) : 0}%`,
    backgroundColor: item.color || '#10B981',
    height: 8,
    borderRadius: 999,
  };
}

function BreakdownRow({ item, totalMinutes }) {
  return (
    <div style={{ display: 'grid', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, fontSize: 14 }}>
        <span
          style={{
            color: '#E2E8F0',
            flex: 1,
            minWidth: 0,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {item.name}
        </span>
        <span style={{ color: '#94A3B8', fontWeight: 600 }}>{formatMinutesHuman(item.minutes)}</span>
      </div>
      <div style={{ height: 8, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.10)', overflow: 'hidden' }}>
        <div style={breakdownRowStyle(item, totalMinutes)} />
      </div>
    </div>
  );
}

const statCardStyle = {
  border: '1px solid rgba(255,255,255,0.10)',
  backgroundColor: 'rgba(255,255,255,0.05)',
  borderRadius: 24,
  padding: '16px 18px',
};

const statLabelStyle = {
  fontSize: 14,
  color: '#94A3B8',
};

const statValueStyle = {
  marginTop: 6,
  fontSize: 24,
  fontWeight: 700,
  color: '#F8FAFC',
};

const WeeklyReportCard = forwardRef(function WeeklyReportCard({ stats }, ref) {
  return (
    <div
      ref={ref}
      style={{
        position: 'relative',
        overflow: 'hidden',
        width: 540,
        height: 675,
        padding: 40,
        borderRadius: 32,
        color: '#FFFFFF',
        fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
        background: 'linear-gradient(180deg, #0F172A 0%, #1A1A3E 100%)',
      }}
    >
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(circle at top right, rgba(16,185,129,0.20), transparent 35%)',
        }}
      />

      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 18,
              backgroundColor: '#10B981',
              color: '#020617',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 24,
              fontWeight: 700,
            }}
          >
            ⚡
          </div>
          <div>
            <p style={{ margin: 0, fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', color: '#F8FAFC' }}>
              DoNext · Weekly Report
            </p>
            <p style={{ margin: '4px 0 0', fontSize: 14, color: '#94A3B8' }}>{stats.weekLabel}</p>
          </div>
        </div>

        <div style={{ marginTop: 28, display: 'grid', gap: 12 }}>
          <div style={statCardStyle}>
            <span style={statLabelStyle}>🔥 Streak</span>
            <p style={{ ...statValueStyle, fontSize: 30 }}>{stats.streak}-day streak</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={statCardStyle}>
              <span style={statLabelStyle}>⏱ Focused</span>
              <p style={statValueStyle}>{formatMinutesHuman(stats.focusMinutes)}</p>
            </div>
            <div style={statCardStyle}>
              <span style={statLabelStyle}>✅ Tasks</span>
              <p style={statValueStyle}>{stats.tasksCompleted}</p>
            </div>
            <div style={statCardStyle}>
              <span style={statLabelStyle}>📋 Projects</span>
              <p style={statValueStyle}>{stats.projectsWorked}</p>
            </div>
            <div style={statCardStyle}>
              <span style={statLabelStyle}>✓ Habits</span>
              <p style={statValueStyle}>{Math.round(stats.habitRate)}%</p>
            </div>
          </div>
        </div>

        <div
          style={{
            marginTop: 32,
            flex: 1,
            borderRadius: 28,
            border: '1px solid rgba(255,255,255,0.10)',
            backgroundColor: 'rgba(2,6,23,0.22)',
            padding: 20,
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              color: '#94A3B8',
            }}
          >
            Focus Breakdown
          </p>
          <div style={{ marginTop: 16, display: 'grid', gap: 16 }}>
            {stats.projectBreakdown.length ? (
              stats.projectBreakdown.slice(0, 3).map((item) => (
                <BreakdownRow key={item.name} item={item} totalMinutes={stats.focusMinutes} />
              ))
            ) : (
              <p
                style={{
                  margin: 0,
                  padding: '24px 16px',
                  borderRadius: 24,
                  border: '1px dashed rgba(255,255,255,0.12)',
                  color: '#94A3B8',
                  fontSize: 14,
                  textAlign: 'center',
                }}
              >
                No focus breakdown this week yet.
              </p>
            )}
          </div>
        </div>

        <p
          style={{
            margin: '24px 0 0',
            textAlign: 'center',
            fontSize: 14,
            letterSpacing: '0.18em',
            color: '#64748B',
          }}
        >
          donext.uz
        </p>
      </div>
    </div>
  );
});

export default WeeklyReportCard;
