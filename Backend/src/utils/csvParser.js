import { parse } from "csv-parse/sync";

function detectDelimiter(content) {
  const firstLine = content.split(/\r?\n/).find((line) => line.trim().length > 0) || "";

  const commaCount = (firstLine.match(/,/g) || []).length;
  const semicolonCount = (firstLine.match(/;/g) || []).length;
  const tabCount = (firstLine.match(/\t/g) || []).length;

  if (tabCount >= commaCount && tabCount >= semicolonCount) return "\t";
  if (semicolonCount >= commaCount) return ";";
  return ",";
}

export function parseCsvBuffer(buffer) {
  const content = buffer.toString("utf-8");
  const delimiter = detectDelimiter(content);

  return parse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    bom: true,
    delimiter,
  });
}