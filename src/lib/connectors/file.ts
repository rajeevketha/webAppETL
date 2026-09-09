import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import ExcelJS from "exceljs";
import type { Row, SchemaField } from "@/lib/types";

function parseCsv(text: string) {
  const rows: string[][] = [];
  let current: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        cell += ch;
      }
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
      continue;
    }
    if (ch === ",") {
      current.push(cell);
      cell = "";
      continue;
    }
    if (ch === "\n") {
      current.push(cell);
      rows.push(current);
      current = [];
      cell = "";
      continue;
    }
    if (ch !== "\r") cell += ch;
  }
  current.push(cell);
  if (current.some((value) => value !== "")) rows.push(current);
  return rows;
}

function rowsFromMatrix(matrix: string[][]) {
  const [header, ...body] = matrix;
  if (!header) return { columns: [] as string[], rows: [] as Row[] };
  const columns = header.map((name, index) => name.trim() || `Column_${index + 1}`);
  const rows = body
    .filter((line) => line.some((value) => String(value).trim() !== ""))
    .map((line) => {
      const row: Row = {};
      columns.forEach((col, i) => {
        row[col] = line[i] ?? "";
      });
      return row;
    });
  return { columns, rows };
}

export async function parseTabularFile(buffer: Buffer, filename: string) {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".csv") || lower.endsWith(".txt")) {
    const parsed = rowsFromMatrix(parseCsv(buffer.toString("utf8")));
    return { ...parsed, sheets: ["Sheet1"] as string[], sheet: "Sheet1" };
  }
  if (lower.endsWith(".xlsx") || lower.endsWith(".xls")) {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as unknown as ArrayBuffer);
    const sheet = workbook.worksheets[0];
    if (!sheet) return { columns: [], rows: [], sheets: [], sheet: "" };
    const matrix: string[][] = [];
    sheet.eachRow((row) => {
      const values = Array.isArray(row.values) ? row.values.slice(1) : [];
      matrix.push(values.map((value) => (value === null || value === undefined ? "" : String(value))));
    });
    const parsed = rowsFromMatrix(matrix);
    return {
      ...parsed,
      sheets: workbook.worksheets.map((item) => item.name),
      sheet: sheet.name,
    };
  }
  throw new Error("Upload a .csv or .xlsx file.");
}

export function fieldsFromColumns(columns: string[]): SchemaField[] {
  return columns.map((name) => ({ name, label: name, type: "string" }));
}

export async function saveUploadFile(filename: string, buffer: Buffer) {
  const dir = path.join(process.cwd(), "uploads");
  await mkdir(dir, { recursive: true });
  const stored = path.join(dir, `${Date.now()}-${filename.replace(/[^a-zA-Z0-9._-]/g, "_")}`);
  await writeFile(stored, buffer);
  return stored;
}
