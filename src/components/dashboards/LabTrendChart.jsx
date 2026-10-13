/**
 * LabTrendChart.jsx — Phase 4 Update
 *
 * Now consumes healthTrendEngine so both Doctor and Patient views share the
 * same status-color and direction logic. The chart line color reflects the
 * engine-derived status instead of a hardcoded purple.
 *
 * IMPORTANT: This component does NOT make clinical judgments.
 * Status color comes exclusively from healthTrendEngine.js.
 */

import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import {
  analyzeObservations,
  statusLabel,
  directionArrow,
  STATUS_COLORS,
} from '../../utils/healthTrendEngine';

// ─── Custom Tooltip ───────────────────────────────────────────────────────────
function CustomTooltip({ active, payload, label, unit }) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div style={tooltipStyles.container}>
      <p style={tooltipStyles.date}>{label}</p>
      <p style={tooltipStyles.value}>
        {payload[0].value} {unit}
      </p>
    </div>
  );
}

// ─── Status Badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const colors = STATUS_COLORS[status] || STATUS_COLORS.unknown;
  return (
    <span style={{
      ...badgeStyles.base,
      backgroundColor: colors.badge,
      border: `1px solid ${colors.badgeBorder}`,
      color: colors.label,
    }}>
      {statusLabel(status)}
    </span>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function LabTrendChart({ data, unit: unitProp, referenceRange: refRangeProp, parameterName }) {

  // Run the shared engine on the raw observations
  const analysis = analyzeObservations(data || []);

  const {
    latestValue,
    previousValue,
    absoluteChange,
    percentChange,
    direction,
    status,
    colors,
    referenceRange,
    parsedRange,
    unit,
    observationCount,
    sortedObservations,
  } = analysis;

  // ── Empty state ──────────────────────────────────────────────────────────
  if (observationCount === 0) {
    return (
      <div style={chartStyles.container} aria-label={`${parameterName}: Historical trend unavailable`}>
        <p style={chartStyles.empty}>Historical trend unavailable</p>
      </div>
    );
  }

  // ── Single observation ────────────────────────────────────────────────────
  if (observationCount === 1) {
    return (
      <div style={chartStyles.container}>
        <div style={chartStyles.header}>
          <h4 style={chartStyles.title}>{parameterName}</h4>
          <StatusBadge status={status} />
        </div>

        <div style={chartStyles.singleBox} aria-label={analysis.dataLabel}>
          <span style={chartStyles.singleValue}>{latestValue} {unit}</span>
          <span style={chartStyles.singleDate}>
            {sortedObservations[0].date
              ? new Date(sortedObservations[0].date).toLocaleDateString()
              : 'Date unknown'}
          </span>
        </div>

        <p style={chartStyles.singleNote}>
          Historical trend unavailable — requires at least 2 observations.
        </p>

        {referenceRange ? (
          <p style={chartStyles.refLine}>Reference: {referenceRange} {unit}</p>
        ) : (
          <p style={chartStyles.refLine}>Reference range unavailable</p>
        )}
      </div>
    );
  }

  // ── Multi-point chart ─────────────────────────────────────────────────────
  const chartData = sortedObservations.map(d => ({
    date: d.date
      ? new Date(d.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
      : 'Unknown',
    value: Number(d.value),
    rawDate: new Date(d.date),
  }));

  const yPadding = parsedRange
    ? Math.max((parsedRange.high - parsedRange.low) * 0.3, 0.5)
    : 0;

  const yDomain = parsedRange
    ? [Math.min(parsedRange.low - yPadding, ...chartData.map(d => d.value)),
       Math.max(parsedRange.high + yPadding, ...chartData.map(d => d.value))]
    : ['auto', 'auto'];

  return (
    <div style={chartStyles.container} aria-label={`${parameterName}: ${analysis.dataLabel}`}>

      {/* ── Header row ─────────────────────────────────────────────── */}
      <div style={chartStyles.header}>
        <h4 style={chartStyles.title}>{parameterName}</h4>
        <StatusBadge status={status} />
      </div>

      {/* ── Factual change summary (accessible text, not color-only) ── */}
      <div style={chartStyles.changeSummary}>
        <span style={chartStyles.changeArrow} aria-hidden="true">
          {directionArrow(direction)}
        </span>
        <span style={chartStyles.changeText}>
          {direction}
          {absoluteChange !== null
            ? ` (${absoluteChange >= 0 ? '+' : ''}${absoluteChange} ${unit}${percentChange ? ', ' + percentChange : ''})`
            : ''}
        </span>
        <span style={chartStyles.changePrev} aria-label="Previous to latest">
          {previousValue} → {latestValue} {unit}
        </span>
      </div>

      {/* ── Reference range line ────────────────────────────────────── */}
      {referenceRange ? (
        <p style={chartStyles.refLine}>Reference: {referenceRange} {unit}</p>
      ) : (
        <p style={chartStyles.refLine}>Reference range unavailable</p>
      )}

      {/* ── Line chart ─────────────────────────────────────────────── */}
      <div style={chartStyles.chartWrapper}>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={chartData} margin={{ top: 10, right: 16, left: -24, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11, fill: '#6B7280' }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: '#6B7280' }}
              tickLine={false}
              axisLine={false}
              domain={yDomain}
            />
            <Tooltip content={<CustomTooltip unit={unit} />} />

            {/* Reference range band — only if we can parse the stored range */}
            {parsedRange && (
              <>
                <ReferenceLine
                  y={parsedRange.high}
                  stroke={STATUS_COLORS.borderline.stroke}
                  strokeDasharray="4 4"
                  strokeWidth={1}
                  label={{ value: `High ${parsedRange.high}`, position: 'right', fontSize: 10, fill: STATUS_COLORS.borderline.label }}
                />
                <ReferenceLine
                  y={parsedRange.low}
                  stroke={STATUS_COLORS.borderline.stroke}
                  strokeDasharray="4 4"
                  strokeWidth={1}
                  label={{ value: `Low ${parsedRange.low}`, position: 'right', fontSize: 10, fill: STATUS_COLORS.borderline.label }}
                />
              </>
            )}

            {/* The line color comes from the engine, not hardcoded */}
            <Line
              type="monotone"
              dataKey="value"
              stroke={colors.stroke}
              strokeWidth={3}
              dot={{ r: 5, strokeWidth: 2, fill: '#FFFFFF', stroke: colors.stroke }}
              activeDot={{ r: 7, fill: colors.stroke }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────

const chartStyles = {
  container: {
    backgroundColor: '#FFFFFF',
    border: '1px solid #E5E7EB',
    borderRadius: '12px',
    padding: '16px',
    marginBottom: '16px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
    flexWrap: 'wrap',
    gap: '8px',
  },
  title: {
    margin: 0,
    fontSize: '1rem',
    fontWeight: '700',
    color: '#1F2937',
  },
  changeSummary: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '4px',
  },
  changeArrow: {
    fontSize: '1.2rem',
    color: '#374151',
  },
  changeText: {
    fontSize: '0.85rem',
    fontWeight: '700',
    color: '#374151',
  },
  changePrev: {
    fontSize: '0.8rem',
    color: '#6B7280',
  },
  refLine: {
    margin: '4px 0 10px 0',
    fontSize: '0.78rem',
    color: '#9CA3AF',
  },
  chartWrapper: {
    width: '100%',
    height: '200px',
  },
  singleBox: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '12px',
    backgroundColor: '#F9FAFB',
    borderRadius: '8px',
    marginBottom: '8px',
  },
  singleValue: {
    fontSize: '1.4rem',
    fontWeight: '800',
    color: '#0F172A',
  },
  singleDate: {
    fontSize: '0.8rem',
    color: '#6B7280',
    marginTop: '4px',
  },
  singleNote: {
    margin: '0 0 4px 0',
    fontSize: '0.82rem',
    color: '#9CA3AF',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  empty: {
    margin: 0,
    fontSize: '0.85rem',
    color: '#9CA3AF',
    fontStyle: 'italic',
    textAlign: 'center',
    padding: '12px 0',
  },
};

const tooltipStyles = {
  container: {
    backgroundColor: '#FFFFFF',
    border: '1px solid #E5E7EB',
    borderRadius: '8px',
    padding: '8px 12px',
    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
  },
  date: {
    margin: '0 0 4px 0',
    fontSize: '0.75rem',
    color: '#6B7280',
  },
  value: {
    margin: 0,
    fontSize: '0.95rem',
    fontWeight: '700',
    color: '#111827',
  },
};

const badgeStyles = {
  base: {
    display: 'inline-block',
    fontSize: '0.72rem',
    fontWeight: '700',
    borderRadius: '20px',
    padding: '2px 10px',
    letterSpacing: '0.3px',
  },
};
