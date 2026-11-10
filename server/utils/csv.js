function escapeCsvValue(value) {
  if (value === null || value === undefined) {
    return '';
  }
  const str = String(value);
  if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function toCsv(headers, rows) {
  const headerLine = headers.map((h) => escapeCsvValue(h.label)).join(',');
  const dataLines = rows.map((row) =>
    headers.map((h) => escapeCsvValue(row[h.key])).join(',')
  );
  return [headerLine, ...dataLines].join('\r\n');
}

