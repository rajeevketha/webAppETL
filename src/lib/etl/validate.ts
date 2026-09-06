import type { DestConfig, FieldMapping, Row, SchemaField } from "@/lib/types";

export type ValidationIssue = {
  level: "error" | "warning";
  field?: string;
  rowIndex?: number;
  message: string;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateMappings(
  mappings: FieldMapping[],
  targetFields: SchemaField[],
  operation: DestConfig["operation"],
) {
  const issues: ValidationIssue[] = [];
  const mapped = new Set(mappings.map((m) => m.targetField));
  const fieldByName = new Map(targetFields.map((f) => [f.name, f]));

  for (const field of targetFields) {
    if (field.required && !mapped.has(field.name) && operation !== "delete") {
      issues.push({
        level: "error",
        field: field.name,
        message: `Required Salesforce field ${field.label} is not mapped.`,
      });
    }
  }

  if ((operation === "update" || operation === "upsert" || operation === "delete") && !mapped.has("Id")) {
    const hasExternal = mappings.some((m) => fieldByName.get(m.targetField)?.externalId);
    if (operation !== "upsert" || !hasExternal) {
      issues.push({
        level: operation === "upsert" ? "error" : "warning",
        message:
          operation === "upsert"
            ? "Upsert needs an External Id field (or Salesforce Id)."
            : `${operation} typically needs Salesforce Id.`,
      });
    }
  }

  for (const mapping of mappings) {
    const field = fieldByName.get(mapping.targetField);
    if (!field) {
      issues.push({
        level: "error",
        field: mapping.targetField,
        message: `Target field ${mapping.targetField} is not on the selected object.`,
      });
      continue;
    }
    if (field.createable === false && operation === "insert") {
      issues.push({
        level: "error",
        field: field.name,
        message: `${field.label} is not createable.`,
      });
    }
  }

  return issues;
}

export function validateRows(rows: Row[], targetFields: SchemaField[]) {
  const issues: ValidationIssue[] = [];
  const fieldByName = new Map(targetFields.map((f) => [f.name, f]));

  rows.forEach((row, rowIndex) => {
    for (const [key, value] of Object.entries(row)) {
      const field = fieldByName.get(key);
      if (!field) continue;
      const text = value === null || value === undefined ? "" : String(value);

      if (field.required && text.trim() === "") {
        issues.push({
          level: "error",
          field: key,
          rowIndex,
          message: `${field.label} is required.`,
        });
      }
      if (field.type === "email" && text && !EMAIL_RE.test(text)) {
        issues.push({
          level: "error",
          field: key,
          rowIndex,
          message: `Invalid email: ${text}`,
        });
      }
      if (field.length && text.length > field.length) {
        issues.push({
          level: "error",
          field: key,
          rowIndex,
          message: `${field.label} exceeds max length ${field.length}.`,
        });
      }
      if (field.type === "picklist" && field.picklistValues && text) {
        const ok = field.picklistValues.some((v) => v.toLowerCase() === text.toLowerCase());
        if (!ok) {
          issues.push({
            level: "warning",
            field: key,
            rowIndex,
            message: `"${text}" is not a known ${field.label} value.`,
          });
        }
      }
    }
  });

  return issues;
}
