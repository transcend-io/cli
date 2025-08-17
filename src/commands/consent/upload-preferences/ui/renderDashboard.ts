// ui/render.ts
import * as readline from 'node:readline';
import { buildFrameModel, type RenderDashboardInput } from './buildFrameModel';
import {
  exportBlock,
  headerLines,
  hotkeysLine,
  workerLines,
} from './headerLines';
import { writeExportsIndex } from '../artifacts/writeExportsIndex';

let lastFrame = '';

/**
 * Renders the dashboard for the upload preferences command.
 * This function builds the frame model and writes the exports index.
 * It then constructs the header, worker lines, hotkeys line, and export block,
 * and outputs the complete frame to the console.
 *
 * @param input - The input parameters for rendering the dashboard.
 */
export function renderDashboard(input: RenderDashboardInput): void {
  const m = buildFrameModel(input);
  writeExportsIndex(input.exportsDir, input.exportStatus);

  const frame = [
    ...headerLines(m),
    '',
    ...workerLines(m),
    '',
    hotkeysLine(input.poolSize, input.final),
    '',
    exportBlock(input.exportsDir, input.exportStatus ?? {}),
  ].join('\n');

  if (!input.final && frame === lastFrame) return;
  lastFrame = frame;

  if (!input.final) {
    process.stdout.write('\x1b[?25l');
    readline.cursorTo(process.stdout, 0, 0);
    readline.clearScreenDown(process.stdout);
  } else {
    process.stdout.write('\x1b[?25h');
  }
  process.stdout.write(`${frame}\n`);
}
