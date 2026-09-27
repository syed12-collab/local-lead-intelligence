// Pure CSV serialization — RFC 4180-ish escaping, no dependency needed.
// A value is quoted whenever it contains a comma, quote, or newline;
// embedded quotes are doubled. null/undefined become an empty cell, not
// the string "null" or "NOT VERIFIED" — that label is a UI/domain
// concept, and a CSV consumer (Excel, a CRM import) should get a plain
// empty cell it can treat as missing data.

export interface CsvColumn<T> {
  header: string;
  value: (row: T) => string | number | null | undefined;
}

function escapeCsvCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function toCsv<T>(rows: T[], columns: CsvColumn<T>[]): string {
  const header = columns.map((c) => escapeCsvCell(c.header)).join(",");
  const body = rows.map((row) => columns.map((c) => escapeCsvCell(c.value(row))).join(","));
  // CRLF line endings — the conventional choice for maximum compatibility
  // with Excel and other CSV consumers.
  return [header, ...body].join("\r\n") + "\r\n";
}
