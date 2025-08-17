// ui/lines.ts
import colors from 'colors';
import { basename, resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import type {
  CheckModeTotals,
  FrameModel,
  UploadModeTotals,
} from './buildFrameModel';
import { osc8Link, ExportStatusMap } from '../../../../lib/pooling';
import type { ExportArtifactStatus } from '../artifacts/artifactAbsPath';

const fmtNum = (n: number): string => n.toLocaleString();
const fmtTime = (ts?: number): string =>
  ts ? new Date(ts).toLocaleTimeString() : '—';

/**
 * Generates header lines for the dashboard.
 * This includes the status of the upload, worker information, and throughput statistics.
 *
 * @param m - The frame model containing the dashboard input and statistics.
 * @returns An array of strings representing the header lines.
 */
export function headerLines(m: FrameModel): string[] {
  const { input, inProgress, pct, etaText } = m;
  const {
    poolSize,
    cpuCount,
    filesTotal,
    filesCompleted,
    filesFailed,
    throughput,
    exportsDir,
    totals,
  } = input;

  const redIf = (n: number, s: string): string => (n > 0 ? colors.red(s) : s);
  const barWidth = 40;
  const filled = Math.floor((pct / 100) * barWidth);
  const bar = '█'.repeat(filled) + '░'.repeat(barWidth - filled);

  let estTotalJobsText = colors.dim('Est. total jobs: —');
  if (m.estTotalJobs !== undefined) {
    estTotalJobsText = colors.dim(
      `Est. total jobs: ${fmtNum(Math.round(m.estTotalJobs))}`,
    );
  }

  const header = [
    `${colors.bold('Parallel uploader')} — ${poolSize} workers ${colors.dim(
      `(CPU avail: ${cpuCount})`,
    )}`,
    `${colors.dim('Files')} ${fmtNum(filesTotal)}  ${colors.dim(
      'Completed',
    )} ${fmtNum(filesCompleted)}  ` +
      `${colors.dim('Failed')} ${redIf(
        filesFailed,
        fmtNum(filesFailed),
      )}  ${colors.dim('In-flight')} ${fmtNum(inProgress)}`,
    `[${bar}] ${pct}%  ${estTotalJobsText} ${
      etaText ? colors.magenta(etaText) : ''
    }`,
  ];
  if (exportsDir) header.push(colors.dim(`Exports dir: ${exportsDir}`));
  if (throughput) {
    const perHour10 = Math.round(throughput.r10s * 3600);
    const perHour60 = Math.round(throughput.r60s * 3600);
    header.push(
      colors.cyan(
        `Throughput: ${fmtNum(perHour10)}/hr (1h: ${fmtNum(
          perHour60,
        )}/hr)  Newly uploaded: ${fmtNum(throughput.successSoFar)}`,
      ),
    );
  }
  if (totals) header.push(totalsBlock(totals));
  return header.filter(Boolean);
}

/**
 * Generates a block of text summarizing the upload or check mode totals.
 *
 * @param totals - The totals object containing upload or check mode totals.
 * @returns A string representing the totals block.
 */
export function totalsBlock(
  totals: UploadModeTotals | CheckModeTotals,
): string {
  if (totals.mode === 'upload') {
    const t = totals as UploadModeTotals;
    const errorsList = Object.entries(t.errors || {}).map(
      ([msg, count]) =>
        `  ${colors.red(`Count[${fmtNum(count)}]`)} ${colors.red(msg)}`,
    );
    return [
      errorsList.length
        ? `${colors.bold('Error breakdown:')}\n${errorsList.join('\n')}`
        : '',
      `${colors.bold('Receipts totals')} — Success: ${fmtNum(
        t.success,
      )}  Skipped: ${fmtNum(t.skipped)}  Error: ${
        t.error ? colors.red(fmtNum(t.error)) : fmtNum(t.error)
      }`,
    ]
      .filter(Boolean)
      .join('\n\n');
  }
  const t = totals as CheckModeTotals;
  return (
    `${colors.bold('Receipts totals')} — Pending: ${fmtNum(t.totalPending)}  ` +
    `PendingConflicts: ${fmtNum(t.pendingConflicts)}  PendingSafe: ${fmtNum(
      t.pendingSafe,
    )}  ` +
    `Skipped: ${fmtNum(t.skipped)}`
  );
}

/**
 * Generates worker lines for the dashboard.
 *
 * @param m - The frame model containing the dashboard input and statistics.
 * @returns An array of strings representing the worker lines.
 */
export function workerLines(m: FrameModel): string[] {
  const { workerState } = m.input;
  const miniWidth = 18;
  return [...workerState.entries()].map(([id, s]) => {
    const badge =
      s.lastLevel === 'error'
        ? colors.red('ERROR ')
        : s.lastLevel === 'warn'
        ? colors.yellow('WARN  ')
        : s.busy
        ? colors.green('WORKING')
        : colors.dim('IDLE   ');
    const fname = s.file ? basename(s.file) : '-';
    const elapsed = s.startedAt
      ? `${Math.floor((Date.now() - s.startedAt) / 1000)}s`
      : '-';
    const processed = s.progress?.processed ?? 0;
    const total = s.progress?.total ?? 0;
    const pctw = total > 0 ? Math.floor((processed / total) * 100) : 0;
    const ff = Math.floor((pctw / 100) * miniWidth);
    const mini =
      total > 0
        ? '█'.repeat(ff) + '░'.repeat(miniWidth - ff)
        : ' '.repeat(miniWidth);
    const miniTxt =
      total > 0
        ? `${fmtNum(processed)}/${fmtNum(total)} (${pctw}%)`
        : colors.dim('—');
    return `  [w${id}] ${badge} | ${fname} | ${elapsed} | [${mini}] ${miniTxt}`;
  });
}

/**
 * Generates a line for hotkeys and controls.
 * This includes information on how to interact with the dashboard.
 *
 * @param poolSize - The size of the worker pool.
 * @param final - Whether this is the final render (e.g., for a summary).
 * @returns A string representing the hotkeys line.
 */
export function hotkeysLine(poolSize: number, final?: boolean): string {
  const maxDigit = Math.min(poolSize - 1, 9);
  const digitRange = poolSize <= 1 ? '0' : `0-${maxDigit}`;
  const extra = poolSize > 10 ? ' (Tab/Shift+Tab for ≥10)' : '';
  return final
    ? colors.dim(
        'Run complete — digits to view logs • Tab/Shift+Tab cycle • Esc/Ctrl+] detach • q to quit',
      )
    : colors.dim(
        `Hotkeys: [${digitRange}] attach${extra} • e=errors • w=warnings • i=info • l=logs • Tab/Shift+Tab • Esc/Ctrl+] detach • Ctrl+C exit`,
      );
}

/**
 * Generates a block of text summarizing the export artifacts.
 * This includes links to open or copy the paths of the artifacts.
 *
 * @param exportsDir - The directory where export artifacts are stored.
 * @param exportStatus - The status of the export artifacts.
 * @returns A string representing the export block.
 */
export function exportBlock(
  exportsDir: string | undefined,
  exportStatus: ExportStatusMap,
): string {
  const makeLine = (
    key: 'E' | 'W' | 'I' | 'A' | 'F',
    label: string,
    status?: ExportArtifactStatus,
    fallback?: string,
  ): string => {
    const exported = !!status?.exported;
    const raw =
      status?.path ||
      (exportsDir
        ? join(exportsDir, fallback ?? `${label.toLowerCase()}.log`)
        : '(set exportsDir)');
    const abs = raw.startsWith('(') ? raw : resolve(raw);
    const url = abs.startsWith('(') ? abs : pathToFileURL(abs).href;
    const openText = exported ? colors.green('open') : colors.dim('open');
    const openLink = abs.startsWith('(') ? openText : osc8Link(abs, openText);
    const time = fmtTime(status?.savedAt);
    const dot = exported ? colors.green('●') : colors.dim('○');
    return `${dot} ${colors.bold(`${key}=export-${label}`)}: ${openLink}  ${
      exported ? colors.green(abs) : colors.dim(abs)
    } ${colors.dim(`(last saved: ${time})`)}\n      ${colors.dim(
      'url:',
    )} ${url}`;
  };

  return [
    colors.dim('Exports (Cmd/Ctrl-click “open” or copy the plain path):'),
    `  ${makeLine('E', 'errors', exportStatus.error, 'combined-errors.log')}`,
    `  ${makeLine('W', 'warns', exportStatus.warn, 'combined-warns.log')}`,
    `  ${makeLine('I', 'info', exportStatus.info, 'combined-info.log')}`,
    `  ${makeLine('A', 'all', exportStatus.all, 'combined-all.log')}`,
    `  ${makeLine(
      'F',
      'failures-csv',
      exportStatus.failuresCsv,
      'failing-updates.csv',
    )}`,
    colors.dim('  (Also written to exports.index.txt for easy copying.)'),
  ].join('\n');
}
