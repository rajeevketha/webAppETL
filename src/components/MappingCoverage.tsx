import { resolveMatchReason } from "@/lib/etl/automap";
import type { FieldMapping, SchemaField } from "@/lib/types";

const MATCH_LABEL: Record<string, string> = {
  api: "API name",
  label: "Field label",
  alias: "Common alias",
  fuzzy: "Fuzzy match",
  manual: "Manual",
};

export function MappingCoverage({
  sourceFields,
  targetFields,
  mappings,
  onAddSource,
}: {
  sourceFields: SchemaField[];
  targetFields: SchemaField[];
  mappings: FieldMapping[];
  onAddSource?: (sourceField: string) => void;
}) {
  const mappedSources = new Set(mappings.map((m) => m.sourceField).filter(Boolean));
  const mappedTargets = new Set(mappings.map((m) => m.targetField));
  const unmapped = sourceFields.filter((field) => !mappedSources.has(field.name));
  const requiredMissing = targetFields.filter(
    (field) => field.required && field.name !== "Id" && !mappedTargets.has(field.name),
  );
  const apiMatches = mappings.filter(
    (m) => resolveMatchReason(m, sourceFields, targetFields) === "api",
  ).length;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
      <div className="bg-card border border-line rounded-xl px-4 py-3">
        <div className="text-[11px] uppercase tracking-wider text-ink-soft">Source columns mapped</div>
        <div className="mt-1 text-2xl tracking-tight">
          {mappedSources.size}
          <span className="text-base text-ink-soft"> / {sourceFields.length}</span>
        </div>
        <p className="text-xs text-ink-soft mt-1">{apiMatches} matched by Salesforce API name</p>
      </div>
      <div className="bg-card border border-line rounded-xl px-4 py-3">
        <div className="text-[11px] uppercase tracking-wider text-ink-soft">Required Salesforce fields</div>
        <div className={`mt-1 text-2xl tracking-tight ${requiredMissing.length ? "text-err" : ""}`}>
          {requiredMissing.length === 0 ? "All mapped" : `${requiredMissing.length} missing`}
        </div>
        {requiredMissing.length > 0 && (
          <p className="text-xs text-err mt-1 mono">{requiredMissing.map((f) => f.name).join(", ")}</p>
        )}
      </div>
      <div className="bg-card border border-line rounded-xl px-4 py-3">
        <div className="text-[11px] uppercase tracking-wider text-ink-soft">Unmapped source columns</div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {unmapped.length === 0 && <span className="text-sm text-ink-soft">None</span>}
          {unmapped.map((field) => (
            <button
              key={field.name}
              type="button"
              onClick={() => onAddSource?.(field.name)}
              className="text-[11px] px-2 py-0.5 rounded-md bg-chip text-ink mono"
              title="Add this column to the mapping table"
            >
              {field.name}
              {onAddSource ? " +" : ""}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export function matchReasonLabel(reason?: string) {
  if (!reason) return "—";
  return MATCH_LABEL[reason] || reason;
}
