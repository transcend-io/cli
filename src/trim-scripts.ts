#!/usr/bin/env node
import fs from 'node:fs';
import path, { resolve } from 'node:path';
import readline from 'node:readline';
/* eslint-disable jsdoc/require-description,jsdoc/require-returns,jsdoc/require-param-description,no-continue */

// /**
//  * CLI options
//  */
// type Options = {
//   /** */
//   in1: string;
//   /** */
//   in2: string;
//   /** */
//   out: string;
//   /** if true, include rows even if all 3 columns are blank */
//   emptyOut: string;
// };

/**
 * Very small CSV parser for a single line:
 * - supports commas
 * - supports double-quoted fields (with "" escaping)
 * - does NOT support embedded newlines inside quotes (most exports won’t have them)
 *
 * @param line
 */
function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];

    if (inQuotes) {
      if (ch === '"') {
        // escaped quote
        if (i + 1 < line.length && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += ch;
      }
    } else if (ch === ',') {
      out.push(cur);
      cur = '';
    } else if (ch === '"') {
      inQuotes = true;
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out;
}

/**
 * CSV escape for output
 *
 * @param v
 */
function csvEscape(v: string): string {
  const s = v ?? '';
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/**
 * Normalize headers: trim, lowercase, remove wrapping quotes,
 * and treat "(email_withheld)" as "email_withheld".
 *
 * @param h
 */
function normalizeHeader(h: string): string {
  const raw = (h ?? '').trim().replace(/^"|"$/g, '');
  const lowered = raw.toLowerCase();
  // strip surrounding parentheses
  const parenStripped = lowered.replace(/^\((.*)\)$/, '$1');
  return parenStripped;
}

/**
 *
 */
type HeaderIndex = Record<string, number>;

/**
 *
 * @param headerLine
 */
function buildHeaderIndex(headerLine: string): HeaderIndex {
  const headers = parseCsvLine(headerLine).map(normalizeHeader);
  const idx: HeaderIndex = {};
  headers.forEach((h, i) => {
    if (h) idx[h] = i;
  });
  return idx;
}

/**
 *
 * @param cols
 * @param idx
 * @param name
 */
function getField(cols: string[], idx: HeaderIndex, name: string): string {
  const i = idx[name];
  if (i === undefined) return '';
  return (cols[i] ?? '').trim();
}

/**
 *
 * @param filePath
 * @param writer
 * @param emptyWriter
 */
async function processFile(
  filePath: string,
  writer: fs.WriteStream,
  emptyWriter: fs.WriteStream,
): Promise<number> {
  const rl = readline.createInterface({
    input: fs.createReadStream(filePath),
    crlfDelay: Infinity,
  });

  let headerIdx: HeaderIndex | null = null;
  let rowCount = 0;
  let dataRowIndex = 0;
  let outCount = 0;

  for await (const line of rl) {
    if (rowCount === 0) {
      headerIdx = buildHeaderIndex(line);
      rowCount += 1;
      continue;
    }

    rowCount += 1;
    dataRowIndex += 1;

    if (!headerIdx) continue;

    // keep truly blank lines out of both outputs
    if (!line.trim()) continue;

    const cols = parseCsvLine(line);

    const personID = getField(cols, headerIdx, 'personid');
    const transcendID = getField(cols, headerIdx, 'transcendid');
    const emailWithheld =
      getField(cols, headerIdx, 'email_withheld') ||
      getField(cols, headerIdx, 'email') ||
      getField(cols, headerIdx, 'emailwitheld');

    const allEmpty = !personID && !transcendID && !emailWithheld;

    if (allEmpty) {
      emptyWriter.write(
        `${csvEscape(path.basename(filePath))},${dataRowIndex},${csvEscape(
          line,
        )}\n`,
      );
      writer.write(
        `${csvEscape(personID)},${csvEscape(transcendID)},${csvEscape(
          emailWithheld,
        )}\n`,
      );
      continue;
    }

    writer.write(
      `${csvEscape(personID)},${csvEscape(transcendID)},${csvEscape(
        emailWithheld,
      )}\n`,
    );
    outCount += 1;
  }

  return outCount;
}

/**
 *
 */
async function main() {
  const opts = {
    in1: resolve('./working/costco/concerns/concern_1.csv'),
    in2: resolve('./working/costco/concerns/concern_4.csv'),
    out: resolve('./working/costco/concerns/out.csv'),
    emptyOut: resolve('./working/costco/concerns/empty_rows.csv'),
  };

  const in1Abs = path.resolve(opts.in1);
  const in2Abs = path.resolve(opts.in2);
  const outAbs = path.resolve(opts.out);

  const writer = fs.createWriteStream(outAbs, { encoding: 'utf8' });
  const emptyWriter = fs.createWriteStream(opts.emptyOut, {
    encoding: 'utf8',
  });

  // header
  writer.write('personID,transcendID,email_withheld\n');
  emptyWriter.write('source_file,row_index,raw_row\n');

  let total = 0;
  total += await processFile(in1Abs, writer, emptyWriter);
  total += await processFile(in2Abs, writer, emptyWriter);

  await new Promise<void>((resolve, reject) => {
    writer.end(() => resolve());
    writer.on('error', reject);
  });

  console.error(`Wrote ${total} rows -> ${outAbs}`);
}

main().catch((err) => {
  console.error(err?.stack ?? String(err));
  process.exit(1);
});
/* eslint-enable jsdoc/require-description,jsdoc/require-returns,jsdoc/require-param-description,no-continue */
