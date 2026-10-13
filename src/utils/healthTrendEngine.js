/**
 * healthTrendEngine.js
 *
 * PHASE 4 — Unified Health Trend & Status Engine
 *
 * A shared, deterministic, parameter-aware utility that interprets stored health
 * observations consistently for BOTH the Doctor Clinical Snapshot and the
 * Patient Health Overview.
 *
 * Rules:
 * - Pure functions only — no DB calls, no API calls, no AI.
 * - Direction (Increasing/Decreasing/Stable) is always a MATHEMATICAL fact.
 * - Status (normal/borderline/alert/insufficient_data) uses per-parameter reference
 *   range rules where a stored reference range exists, or the backend-supplied
 *   `status` field from Phase 1 (`normal | abnormal | critical | unknown`).
 * - Color tokens are declared here and used by both UI components; they must NOT be
 *   duplicated in patient-only or doctor-only code.
 * - NEVER invent missing observations.
 * - NEVER assign medical conclusions (e.g. "worsening kidney function").
 */

// ─────────────────────────────────────────────────────────────────────────────
// 1. STATUS COLOR TOKENS
//    These are the ONLY place status colors are defined for health graphs.
//    Both Doctor and Patient views import from here.
// ─────────────────────────────────────────────────────────────────────────────

export const STATUS_COLORS = {
  normal:             { stroke: '#059669', dot: '#D1FAE5', label: '#065F46', badge: '#ECFDF5', badgeBorder: '#A7F3D0' },
  borderline:         { stroke: '#D97706', dot: '#FEF3C7', label: '#92400E', badge: '#FFFBEB', badgeBorder: '#FDE68A' },
  alert:              { stroke: '#DC2626', dot: '#FEE2E2', label: '#991B1B', badge: '#FEF2F2', badgeBorder: '#FECACA' },
  insufficient_data:  { stroke: '#6D28D9', dot: '#EDE9FE', label: '#4C1D95', badge: '#F5F3FF', badgeBorder: '#DDD6FE' },
  unknown:            { stroke: '#6B7280', dot: '#F3F4F6', label: '#374151', badge: '#F9FAFB', badgeBorder: '#E5E7EB' },
};

// ─────────────────────────────────────────────────────────────────────────────
// 2. DIRECTION CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

export const DIRECTION = {
  INCREASING: 'Increasing',
  DECREASING: 'Decreasing',
  STABLE:     'Stable',
};

// ─────────────────────────────────────────────────────────────────────────────
// 3. REFERENCE RANGE PARSER
//    Parses a stored reference range string like "0.7 – 1.3" or "70-99" into
//    a numeric { low, high } pair. Returns null if unparseable.
//    Does NOT invent ranges not present in the stored record.
// ─────────────────────────────────────────────────────────────────────────────

export function parseReferenceRange(rangeStr) {
  if (!rangeStr || rangeStr === 'unavailable' || rangeStr === '') return null;

  // Match patterns like "0.7 – 1.3", "0.7-1.3", "0.7 to 1.3"
  const match = String(rangeStr).match(/([0-9]*\.?[0-9]+)\s*(?:–|-|to)\s*([0-9]*\.?[0-9]+)/i);
  if (match) {
    const low  = parseFloat(match[1]);
    const high = parseFloat(match[2]);
    if (!isNaN(low) && !isNaN(high) && low < high) {
      return { low, high };
    }
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. REFERENCE-RANGE EVALUATION
//    Given a numeric value and a parsed { low, high } range, returns a status.
//    Uses a 10% borderline buffer zone so values just outside the range are
//    flagged as borderline rather than immediately alert.
//    Returns null if range cannot be evaluated.
// ─────────────────────────────────────────────────────────────────────────────

export function evaluateAgainstRange(value, parsedRange) {
  if (parsedRange === null) return null;
  const { low, high } = parsedRange;
  const span = high - low;
  const borderlineLow  = low  - span * 0.10;
  const borderlineHigh = high + span * 0.10;

  if (value >= low && value <= high) return 'normal';
  if (value >= borderlineLow && value <= borderlineHigh) return 'borderline';
  return 'alert';
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. TREND DIRECTION CALCULATOR
//    Pure mathematical comparison. Returns one of DIRECTION constants.
//    Uses a relative ±2% dead-band to call values "stable".
// ─────────────────────────────────────────────────────────────────────────────

export function calculateDirection(previousValue, latestValue) {
  const prev = Number(previousValue);
  const curr = Number(latestValue);
  if (isNaN(prev) || isNaN(curr)) return DIRECTION.STABLE;

  const relativeDiff = prev !== 0 ? Math.abs((curr - prev) / prev) : Math.abs(curr - prev);

  if (relativeDiff < 0.02) return DIRECTION.STABLE;
  return curr > prev ? DIRECTION.INCREASING : DIRECTION.DECREASING;
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. CORE ENGINE FUNCTION: analyzeObservations
//
//    Input:
//      observations — array of { value, unit, referenceRange, status, date, ... }
//                     sorted in any order; the engine will sort them chronologically.
//
//    Output:
//      {
//        latestValue:      number | null
//        previousValue:    number | null
//        absoluteChange:   number | null      (latestValue - previousValue)
//        percentChange:    string | null      e.g. "+12.5%"
//        direction:        DIRECTION constant
//        status:           'normal' | 'borderline' | 'alert' | 'insufficient_data' | 'unknown'
//        statusSource:     'reference_range' | 'stored_status' | 'insufficient_data' | 'none'
//        colors:           STATUS_COLORS entry
//        referenceRange:   string | null      (the stored string, as-is)
//        parsedRange:      { low, high } | null
//        unit:             string
//        observationCount: number
//        sortedObservations: array sorted chronologically
//        dataLabel:        human-readable label for UI accessibility
//      }
//
// ─────────────────────────────────────────────────────────────────────────────

export function analyzeObservations(observations) {
  // Guard
  if (!Array.isArray(observations) || observations.length === 0) {
    return {
      latestValue:        null,
      previousValue:      null,
      absoluteChange:     null,
      percentChange:      null,
      direction:          DIRECTION.STABLE,
      status:             'insufficient_data',
      statusSource:       'insufficient_data',
      colors:             STATUS_COLORS.insufficient_data,
      referenceRange:     null,
      parsedRange:        null,
      unit:               '',
      observationCount:   0,
      sortedObservations: [],
      dataLabel:          'No observations available',
    };
  }

  // Sort chronologically using date field
  const sorted = [...observations].sort((a, b) => {
    const da = a.date ? new Date(a.date).getTime() : 0;
    const db = b.date ? new Date(b.date).getTime() : 0;
    return da - db;
  });

  const latest   = sorted[sorted.length - 1];
  const previous = sorted.length >= 2 ? sorted[sorted.length - 2] : null;

  const latestValue   = latest.value   !== undefined ? Number(latest.value)   : null;
  const previousValue = previous?.value !== undefined ? Number(previous.value) : null;

  const unit           = latest.unit || '';
  const referenceRange = latest.referenceRange && latest.referenceRange !== 'unavailable'
    ? latest.referenceRange
    : null;
  const parsedRange    = parseReferenceRange(referenceRange);

  // Absolute and percent change
  let absoluteChange = null;
  let percentChange  = null;
  let direction      = DIRECTION.STABLE;

  if (latestValue !== null && previousValue !== null && !isNaN(latestValue) && !isNaN(previousValue)) {
    absoluteChange = parseFloat((latestValue - previousValue).toFixed(4));
    direction      = calculateDirection(previousValue, latestValue);

    if (previousValue !== 0) {
      const pct = ((latestValue - previousValue) / Math.abs(previousValue)) * 100;
      const sign = pct >= 0 ? '+' : '';
      percentChange = `${sign}${pct.toFixed(1)}%`;
    }
  }

  // Status determination (priority order):
  //  1. Evaluate against parsed reference range (most specific)
  //  2. Fall back to stored status from Phase 1 backend
  //  3. If neither, mark unknown

  let status       = 'unknown';
  let statusSource = 'none';

  if (latestValue !== null && !isNaN(latestValue) && parsedRange !== null) {
    const evaluated = evaluateAgainstRange(latestValue, parsedRange);
    if (evaluated !== null) {
      status       = evaluated;
      statusSource = 'reference_range';
    }
  }

  if (statusSource === 'none' && latest.status && latest.status !== 'unknown') {
    // Map Phase 1 backend status field to engine status names
    const backendMap = {
      normal:   'normal',
      abnormal: 'alert',
      critical: 'alert',
    };
    status       = backendMap[latest.status] || 'unknown';
    statusSource = 'stored_status';
  }

  const colors = STATUS_COLORS[status] || STATUS_COLORS.unknown;

  // Human-readable data label for accessibility
  let dataLabel = '';
  if (latestValue !== null && !isNaN(latestValue)) {
    dataLabel = `${latestValue} ${unit}`.trim();
    if (previousValue !== null && direction !== DIRECTION.STABLE) {
      dataLabel += `, ${direction} from ${previousValue} ${unit}`.trim();
    }
  } else {
    dataLabel = 'Value unavailable';
  }

  return {
    latestValue,
    previousValue,
    absoluteChange,
    percentChange,
    direction,
    status,
    statusSource,
    colors,
    referenceRange,
    parsedRange,
    unit,
    observationCount:   sorted.length,
    sortedObservations: sorted,
    dataLabel,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. BATCH ANALYSER
//    Processes a labResultsByTest map (from the backend overview API) and
//    returns a map of testName → analyzeObservations result.
//    Used by PatientHealthOverview to enrich all tests at once.
// ─────────────────────────────────────────────────────────────────────────────

export function analyzeAllTests(labResultsByTest) {
  if (!labResultsByTest || typeof labResultsByTest !== 'object') return {};
  const result = {};
  for (const [testName, observations] of Object.entries(labResultsByTest)) {
    result[testName] = analyzeObservations(observations);
  }
  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// 8. STATUS BADGE TEXT
//    Returns a human-readable label for the status value.
//    Both Doctor and Patient must use the same label text.
// ─────────────────────────────────────────────────────────────────────────────

export function statusLabel(status) {
  const labels = {
    normal:            'Normal',
    borderline:        'Borderline',
    alert:             'Out of Range',
    insufficient_data: 'Insufficient Data',
    unknown:           'Status Unknown',
  };
  return labels[status] || 'Unknown';
}

// ─────────────────────────────────────────────────────────────────────────────
// 9. DIRECTION ARROW TEXT (for accessible display without relying on icons only)
// ─────────────────────────────────────────────────────────────────────────────

export function directionArrow(direction) {
  if (direction === DIRECTION.INCREASING) return '↑';
  if (direction === DIRECTION.DECREASING) return '↓';
  return '→';
}
