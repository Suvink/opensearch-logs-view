import { useState, useCallback } from 'react';
import { format, parse, isValid, subMinutes, subHours, subDays } from 'date-fns';
import styles from './TimePicker.module.css';
import { useDiscover } from '../../../context/DiscoverContext';
import type { TimeRange } from '../../../types/opensearch';

interface Props {
  fileTimeRange: TimeRange | null;
}

interface RelativeOption {
  label: string;
  key: string;
  getFrom: (anchor: Date) => Date;
}

const RELATIVE_OPTIONS: RelativeOption[] = [
  { label: 'Last 15 minutes', key: '15m', getFrom: d => subMinutes(d, 15) },
  { label: 'Last 30 minutes', key: '30m', getFrom: d => subMinutes(d, 30) },
  { label: 'Last 1 hour',     key: '1h',  getFrom: d => subHours(d, 1) },
  { label: 'Last 3 hours',    key: '3h',  getFrom: d => subHours(d, 3) },
  { label: 'Last 6 hours',    key: '6h',  getFrom: d => subHours(d, 6) },
  { label: 'Last 12 hours',   key: '12h', getFrom: d => subHours(d, 12) },
  { label: 'Last 24 hours',   key: '24h', getFrom: d => subHours(d, 24) },
  { label: 'Last 7 days',     key: '7d',  getFrom: d => subDays(d, 7) },
  { label: 'Last 30 days',    key: '30d', getFrom: d => subDays(d, 30) },
];

// ── Timestamp parsing ──────────────────────────────────────────────────────

/**
 * Parses a timestamp string in multiple formats, including the exact
 * OpenSearch log display format: "Mar 19, 2026 @ 17:58:26.857"
 */
function parseTimestamp(input: string): Date | null {
  const s = input.trim();
  if (!s) return null;

  // Formats to try, ordered most-specific first
  const formats = [
    'MMM d, yyyy @ HH:mm:ss.SSS',    // Mar 19, 2026 @ 17:58:26.857  ← log display format
    "MMM d, yyyy '@' HH:mm:ss.SSS",  // with literal @
    'MMM d, yyyy @ HH:mm:ss',
    'MMM d, yyyy @ HH:mm',
    'MMM dd, yyyy @ HH:mm:ss.SSS',
    'MMM dd, yyyy @ HH:mm:ss',
    'yyyy-MM-dd HH:mm:ss.SSS',
    'yyyy-MM-dd HH:mm:ss',
    'yyyy-MM-dd HH:mm',
    "yyyy-MM-dd'T'HH:mm:ss.SSSX",
    "yyyy-MM-dd'T'HH:mm:ssX",
    "yyyy-MM-dd'T'HH:mm:ss",
    "yyyy-MM-dd'T'HH:mm",
  ];

  const ref = new Date(); // reference for date-fns parse
  for (const fmt of formats) {
    try {
      const d = parse(s, fmt, ref);
      if (isValid(d)) return d;
    } catch { /* try next */ }
  }

  // Native JS Date parse as last resort (handles ISO strings)
  const d = new Date(s);
  if (!isNaN(d.getTime())) return d;

  return null;
}

// ── Display helpers ─────────────────────────────────────────────────────────

/** Full display format matching the log table's @timestamp column */
const LOG_FMT = 'MMM d, yyyy @ HH:mm:ss.SSS';

function fmtFull(iso: string): string {
  try { return format(new Date(iso), LOG_FMT); } catch { return iso; }
}

function fmtShort(iso: string): string {
  try { return format(new Date(iso), 'MMM d, HH:mm:ss'); } catch { return iso; }
}

// ── Smart text input with parse feedback ───────────────────────────────────

interface SmartInputProps {
  label: string;
  value: string;
  onChange: (raw: string, parsed: Date | null) => void;
  placeholder?: string;
}

function SmartInput({ label, value, onChange, placeholder }: SmartInputProps) {
  const parsed = value ? parseTimestamp(value) : null;
  const hasInput = value.trim().length > 0;
  const isOk = hasInput && parsed !== null;
  const isErr = hasInput && parsed === null;

  return (
    <div className={styles.absField}>
      <label className={styles.absLabel}>{label}</label>
      <input
        className={`${styles.absInput} ${isOk ? styles.absInputOk : ''} ${isErr ? styles.absInputErr : ''}`}
        type="text"
        value={value}
        onChange={e => onChange(e.target.value, parseTimestamp(e.target.value))}
        placeholder={placeholder ?? 'Mar 19, 2026 @ 17:58:26.857'}
        spellCheck={false}
        autoComplete="off"
      />
      {isOk && (
        <div className={styles.parseFeedback + ' ' + styles.parseOk}>
          ✓ {format(parsed!, 'EEE, MMM d yyyy  HH:mm:ss.SSS')}
        </div>
      )}
      {isErr && (
        <div className={styles.parseFeedback + ' ' + styles.parseErr}>
          ✗ Unrecognised format
        </div>
      )}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

export default function TimePicker({ fileTimeRange }: Props) {
  const { timeFrom, timeTo, setTimeFilter } = useDiscover();

  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<'quick' | 'absolute'>('quick');
  const [activeKey, setActiveKey] = useState<string | null>(null);

  // Absolute tab state — raw strings + parsed Dates
  const [absFromRaw, setAbsFromRaw] = useState('');
  const [absFromDate, setAbsFromDate] = useState<Date | null>(null);
  const [absToRaw, setAbsToRaw] = useState('');
  const [absToDate, setAbsToDate] = useState<Date | null>(null);

  // Anchor for relative options = last log timestamp in file
  const anchor: Date = fileTimeRange ? new Date(fileTimeRange.to) : new Date();

  // ── Actions ──────────────────────────────────────────────────────────────

  const applyRelative = useCallback((opt: RelativeOption) => {
    const to = fileTimeRange ? new Date(fileTimeRange.to) : new Date();
    const from = opt.getFrom(to);
    setActiveKey(opt.key);
    setTimeFilter(from.toISOString(), to.toISOString());
    setOpen(false);
  }, [fileTimeRange, setTimeFilter]);

  const applyAll = useCallback(() => {
    setActiveKey(null);
    setTimeFilter(null, null);
    setOpen(false);
  }, [setTimeFilter]);

  const applyAbsolute = useCallback(() => {
    setActiveKey(null);
    setTimeFilter(
      absFromDate ? absFromDate.toISOString() : null,
      absToDate ? absToDate.toISOString() : null,
    );
    setOpen(false);
  }, [absFromDate, absToDate, setTimeFilter]);

  // Pre-fill absolute inputs from current filter when opening that tab
  const openAbsTab = () => {
    setTab('absolute');
    const fromStr = timeFrom ? fmtFull(timeFrom) : (fileTimeRange ? fmtFull(fileTimeRange.from) : '');
    const toStr   = timeTo   ? fmtFull(timeTo)   : (fileTimeRange ? fmtFull(fileTimeRange.to)   : '');
    setAbsFromRaw(fromStr);
    setAbsFromDate(fromStr ? parseTimestamp(fromStr) : null);
    setAbsToRaw(toStr);
    setAbsToDate(toStr ? parseTimestamp(toStr) : null);
  };

  // ── Trigger label ─────────────────────────────────────────────────────────

  const isFiltered = timeFrom !== null || timeTo !== null;
  let triggerLabel = 'All time';
  if (isFiltered) {
    if (activeKey) {
      triggerLabel = RELATIVE_OPTIONS.find(o => o.key === activeKey)?.label ?? 'Custom range';
    } else {
      const f = timeFrom ? fmtShort(timeFrom) : '−∞';
      const t = timeTo   ? fmtShort(timeTo)   : '∞';
      triggerLabel = `${f} → ${t}`;
    }
  }

  const canApplyAbs = absFromDate !== null || absToDate !== null;

  return (
    <div className={styles.wrapper}>
      {open && <div className={styles.backdrop} onClick={() => setOpen(false)} />}

      <button
        className={`${styles.trigger} ${open ? styles.active : ''} ${isFiltered ? styles.filtered : ''}`}
        onClick={() => setOpen(o => !o)}
        title="Set time filter"
      >
        <svg className={styles.calIcon} width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
          <path d="M3.5 0a.5.5 0 01.5.5V1h8V.5a.5.5 0 011 0V1h1a2 2 0 012 2v11a2 2 0 01-2 2H2a2 2 0 01-2-2V3a2 2 0 012-2h1V.5a.5.5 0 01.5-.5zM2 2a1 1 0 00-1 1v1h14V3a1 1 0 00-1-1H2zm13 3H1v9a1 1 0 001 1h12a1 1 0 001-1V5z"/>
        </svg>
        {triggerLabel}
        {isFiltered && (
          <span
            className={styles.clearX}
            title="Clear filter"
            onClick={e => { e.stopPropagation(); applyAll(); }}
          >✕</span>
        )}
        {!isFiltered && <span className={styles.chevron}>▼</span>}
      </button>

      {open && (
        <div className={styles.popover}>

          {/* ── Tabs ── */}
          <div className={styles.tabs}>
            <button
              className={`${styles.tab} ${tab === 'quick' ? styles.tabActive : ''}`}
              onClick={() => setTab('quick')}
            >
              Quick select
            </button>
            <button
              className={`${styles.tab} ${tab === 'absolute' ? styles.tabActive : ''}`}
              onClick={openAbsTab}
            >
              Paste / type range
            </button>
          </div>

          {/* ── Quick select ── */}
          {tab === 'quick' && (
            <div className={styles.quickPanel}>

              {/* Anchor info box */}
              {fileTimeRange && (
                <div className={styles.anchorBox}>
                  <div className={styles.anchorLabel}>⚓ Anchor — last log entry in this file</div>
                  <div className={styles.anchorTime}>{fmtFull(fileTimeRange.to)}</div>
                  <div className={styles.anchorSub}>
                    All relative ranges count back from this timestamp.
                  </div>
                </div>
              )}

              <button
                className={`${styles.allTimeBtn} ${!isFiltered ? styles.allTimeActive : ''}`}
                onClick={applyAll}
              >
                All time — show every log entry
              </button>

              <div className={styles.quickGroupLabel}>Relative ranges</div>
              <div className={styles.quickOptions}>
                {RELATIVE_OPTIONS.map(opt => {
                  const from = opt.getFrom(anchor);
                  const isActive = activeKey === opt.key && isFiltered;
                  const inRange = fileTimeRange
                    ? from.getTime() < new Date(fileTimeRange.to).getTime()
                    : true;
                  return (
                    <button
                      key={opt.key}
                      className={`${styles.quickBtn} ${isActive ? styles.quickBtnActive : ''} ${!inRange ? styles.quickBtnDisabled : ''}`}
                      onClick={() => inRange && applyRelative(opt)}
                      title={inRange
                        ? `${fmtShort(from.toISOString())} → ${fmtShort(anchor.toISOString())}`
                        : 'Before the start of this file'}
                    >
                      <span className={styles.quickBtnLabel}>{opt.label}</span>
                      {inRange && (
                        <span className={styles.quickBtnSub}>
                          from {fmtShort(from.toISOString())}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Absolute / paste range ── */}
          {tab === 'absolute' && (
            <div className={styles.absPanel}>
              <div className={styles.pasteHint}>
                Paste timestamps copied from the <strong>@timestamp</strong> column,
                or type any date. Example:
                <code className={styles.pasteExample}>Mar 19, 2026 @ 17:58:26.857</code>
              </div>

              <SmartInput
                label="From"
                value={absFromRaw}
                onChange={(raw, date) => { setAbsFromRaw(raw); setAbsFromDate(date); }}
              />
              <SmartInput
                label="To"
                value={absToRaw}
                onChange={(raw, date) => { setAbsToRaw(raw); setAbsToDate(date); }}
              />

              {/* Swap warning if from > to */}
              {absFromDate && absToDate && absFromDate > absToDate && (
                <div className={styles.swapWarning}>
                  ⚠ "From" is later than "To" — no results will match.
                </div>
              )}

              <div className={styles.absActions}>
                <button className={styles.resetBtn} onClick={applyAll}>Clear filter</button>
                <button
                  className={styles.applyBtn}
                  onClick={applyAbsolute}
                  disabled={!canApplyAbs}
                >
                  Apply
                </button>
              </div>
            </div>
          )}

          {/* Active filter summary bar */}
          {isFiltered && (
            <div className={styles.currentFilter}>
              <span>Active:</span>{' '}
              {timeFrom ? fmtFull(timeFrom) : '−∞'}
              {' → '}
              {timeTo ? fmtFull(timeTo) : '∞'}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
