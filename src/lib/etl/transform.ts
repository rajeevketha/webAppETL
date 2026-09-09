import type { Row, TransformOp } from "@/lib/types";

function asString(value: unknown) {
  if (value === null || value === undefined) return "";
  return String(value);
}

function titleCase(value: string) {
  return value
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function parseLooseDate(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const iso = Date.parse(trimmed);
  if (!Number.isNaN(iso)) return new Date(iso);

  const oracle = trimmed.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/);
  if (oracle) {
    const months: Record<string, number> = {
      JAN: 0, FEB: 1, MAR: 2, APR: 3, MAY: 4, JUN: 5,
      JUL: 6, AUG: 7, SEP: 8, OCT: 9, NOV: 10, DEC: 11,
    };
    const month = months[oracle[2].toUpperCase()];
    if (month !== undefined) {
      return new Date(Number(oracle[3]), month, Number(oracle[1]));
    }
  }

  const dmy = trimmed.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/);
  if (dmy) {
    return new Date(Number(dmy[3]), Number(dmy[2]) - 1, Number(dmy[1]));
  }

  return null;
}

function formatDate(date: Date, pattern: string) {
  const yyyy = String(date.getFullYear());
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  if (pattern === "yyyy-MM-dd" || pattern === "ISO") return `${yyyy}-${mm}-${dd}`;
  if (pattern === "MM/dd/yyyy") return `${mm}/${dd}/${yyyy}`;
  if (pattern === "dd-MMM-yyyy") {
    const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
    return `${dd}-${months[date.getMonth()]}-${yyyy}`;
  }
  return `${yyyy}-${mm}-${dd}`;
}

function applyTemplate(template: string, row: Row) {
  return template.replace(/\{\{\s*([^}]+)\s*\}\}/g, (_, key: string) => asString(row[key.trim()]));
}

export function applyTransform(op: TransformOp, value: unknown, row: Row): unknown {
  switch (op.type) {
    case "none":
      return value;
    case "trim":
      return asString(value).trim();
    case "upper":
      return asString(value).trim().toUpperCase();
    case "lower":
      return asString(value).trim().toLowerCase();
    case "title":
      return titleCase(asString(value).trim());
    case "date_format": {
      const parsed = parseLooseDate(asString(value));
      if (!parsed) return value;
      return formatDate(parsed, op.to || "yyyy-MM-dd");
    }
    case "replace":
      return asString(value).split(op.search).join(op.replace);
    case "default":
      return asString(value).trim() === "" ? op.value : value;
    case "concat":
      return op.fields.map((field) => asString(row[field]).trim()).filter(Boolean).join(op.separator);
    case "substring":
      return asString(value).slice(op.start, op.end);
    case "lookup": {
      const key = asString(value).trim();
      if (key in op.map) return op.map[key];
      const upper = key.toUpperCase();
      const match = Object.entries(op.map).find(([from]) => from.toUpperCase() === upper);
      if (match) return match[1];
      return op.fallback ?? value;
    }
    case "number": {
      const raw = asString(value).replace(/[$,\s]/g, "");
      if (raw === "") return null;
      const num = Number(raw);
      return Number.isFinite(num) ? num : value;
    }
    case "boolean": {
      const raw = asString(value).trim().toLowerCase();
      if (["true", "1", "yes", "y", "t"].includes(raw)) return true;
      if (["false", "0", "no", "n", "f"].includes(raw)) return false;
      return value;
    }
    case "template":
      return applyTemplate(op.template, row);
    default:
      return value;
  }
}

export function mapRow(
  row: Row,
  mappings: {
    sourceField: string | null;
    targetField: string;
    transform: TransformOp;
    defaultValue?: string;
  }[],
) {
  const out: Row = {};
  for (const mapping of mappings) {
    const sourceValue = mapping.sourceField ? row[mapping.sourceField] : undefined;
    let next = applyTransform(mapping.transform, sourceValue, row);
    if ((next === null || next === undefined || asString(next).trim() === "") && mapping.defaultValue) {
      next = mapping.defaultValue;
    }
    if (next !== undefined) out[mapping.targetField] = next;
  }
  return out;
}

export function mapRows(
  rows: Row[],
  mappings: {
    sourceField: string | null;
    targetField: string;
    transform: TransformOp;
    defaultValue?: string;
  }[],
) {
  return rows.map((row) => mapRow(row, mappings));
}
