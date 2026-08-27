export interface ParsedCsvRow {
  amount: number;
  category: string;
  note: string;
  occurred_at?: string;
}

export interface CsvParseResult {
  rows: ParsedCsvRow[];
  skipped: number;
}

/** Parses the fixed `date,category,amount,note` CSV format (header required, no quoted-comma
 * support — a deliberate simplification, not general bank/spreadsheet CSV import). Malformed
 * rows are skipped and counted rather than aborting the whole import. */
export function parseTransactionsCsv(text: string): CsvParseResult {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);
  if (lines.length === 0) return { rows: [], skipped: 0 };

  const header = lines[0].toLowerCase().split(',').map((h) => h.trim());
  const dateIdx = header.indexOf('date');
  const categoryIdx = header.indexOf('category');
  const amountIdx = header.indexOf('amount');
  const noteIdx = header.indexOf('note');

  if (dateIdx === -1 || categoryIdx === -1 || amountIdx === -1) {
    return { rows: [], skipped: lines.length - 1 };
  }

  const rows: ParsedCsvRow[] = [];
  let skipped = 0;

  for (const line of lines.slice(1)) {
    const cols = line.split(',').map((c) => c.trim());
    const amount = Number(cols[amountIdx]);
    const category = cols[categoryIdx];
    const dateStr = cols[dateIdx];
    const date = dateStr ? new Date(dateStr) : null;

    if (!category || Number.isNaN(amount) || (date && Number.isNaN(date.getTime()))) {
      skipped++;
      continue;
    }

    rows.push({
      amount,
      category,
      note: noteIdx !== -1 ? cols[noteIdx] || '' : '',
      occurred_at: date ? date.toISOString() : undefined,
    });
  }

  return { rows, skipped };
}
