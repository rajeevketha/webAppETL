"use client";

import { useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { matchReasonLabel } from "@/components/MappingCoverage";
import type { FieldMapping, Row, SchemaField, TransformOp } from "@/lib/types";
import { id } from "@/lib/ids";

const TRANSFORMS: { value: TransformOp["type"]; label: string }[] = [
  { value: "none", label: "None" },
  { value: "trim", label: "Trim" },
  { value: "title", label: "Title case" },
  { value: "upper", label: "Uppercase" },
  { value: "lower", label: "Lowercase" },
  { value: "date_format", label: "Date → ISO" },
  { value: "number", label: "To number" },
  { value: "boolean", label: "To boolean" },
  { value: "lookup", label: "Value lookup" },
  { value: "replace", label: "Replace text" },
  { value: "default", label: "Default if empty" },
  { value: "template", label: "Template" },
];

function opFromType(type: TransformOp["type"], prev: TransformOp): TransformOp {
  if (type === "date_format") return { type, to: "yyyy-MM-dd" };
  if (type === "lookup") return { type, map: prev.type === "lookup" ? prev.map : {} };
  if (type === "replace") return { type, search: "", replace: "" };
  if (type === "default") return { type, value: "" };
  if (type === "template") return { type, template: "" };
  if (type === "concat") return { type, fields: [], separator: " " };
  if (type === "substring") return { type, start: 0 };
  return { type } as TransformOp;
}

export function FieldMappingEditor({
  mappings,
  sourceFields,
  targetFields,
  sourcePreview,
  onChange,
}: {
  mappings: FieldMapping[];
  sourceFields: SchemaField[];
  targetFields: SchemaField[];
  sourcePreview: Row[];
  onChange: (next: FieldMapping[]) => void;
}) {
  const [lookupEdit, setLookupEdit] = useState<string | null>(null);
  const writable = useMemo(
    () => targetFields.filter((f) => f.name !== "Id"),
    [targetFields],
  );

  function update(index: number, patch: Partial<FieldMapping>) {
    onChange(mappings.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  }

  function remove(index: number) {
    onChange(mappings.filter((_, i) => i !== index));
  }

  function add(sourceField?: string | null) {
    const unused = writable.find((f) => !mappings.some((m) => m.targetField === f.name));
    onChange([
      ...mappings,
      {
        id: id("map"),
        sourceField: sourceField ?? sourceFields[0]?.name ?? null,
        targetField: unused?.name || writable[0]?.name || "Name",
        transform: { type: "none" },
        matchedBy: "manual",
      },
    ]);
  }

  return (
    <div className="bg-card border border-line rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-line flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg">Column to Salesforce field</h2>
          <p className="text-sm text-ink-soft">
            Source headers on the left map to Salesforce API names for the selected object. Transforms run before load.
          </p>
        </div>
        <button type="button" onClick={() => add()} className="text-sm flex items-center gap-1 px-3 py-1.5 border border-line rounded-md shrink-0">
          <Plus size={14} /> Add mapping
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-[11px] uppercase tracking-wider text-ink-soft bg-paper">
            <tr>
              <th className="px-4 py-2">Source column</th>
              <th>Sample</th>
              <th>Transform</th>
              <th>Salesforce API name</th>
              <th>Label / type</th>
              <th>Matched by</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {mappings.map((mapping, index) => {
              const target = targetFields.find((f) => f.name === mapping.targetField);
              const sample = mapping.sourceField ? sourcePreview[0]?.[mapping.sourceField] : "";
              return (
                <tr key={mapping.id} className="border-t border-line align-top">
                  <td className="px-4 py-2">
                    <select
                      className="w-48 border border-line rounded-md px-2 py-1 bg-paper mono text-xs"
                      value={mapping.sourceField || ""}
                      onChange={(e) => update(index, { sourceField: e.target.value || null, matchedBy: "manual" })}
                    >
                      <option value="">— constant / template —</option>
                      {sourceFields.map((field) => (
                        <option key={field.name} value={field.name}>{field.name}</option>
                      ))}
                    </select>
                  </td>
                  <td className="py-2 pr-3 text-ink-soft max-w-[140px] truncate">{String(sample ?? "")}</td>
                  <td className="py-2">
                    <select
                      className="border border-line rounded-md px-2 py-1 bg-paper text-xs"
                      value={mapping.transform.type}
                      onChange={(e) => update(index, { transform: opFromType(e.target.value as TransformOp["type"], mapping.transform) })}
                    >
                      {TRANSFORMS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                    {mapping.transform.type === "lookup" && (
                      <button type="button" className="block text-[11px] text-forest mt-1" onClick={() => setLookupEdit(mapping.id)}>
                        Edit {Object.keys(mapping.transform.map).length} pairs
                      </button>
                    )}
                    {mapping.transform.type === "replace" && (
                      <div className="flex gap-1 mt-1">
                        <input className="w-20 border border-line rounded px-1 text-xs" placeholder="from" value={mapping.transform.search} onChange={(e) => update(index, { transform: { type: "replace", search: e.target.value, replace: mapping.transform.type === "replace" ? mapping.transform.replace : "" } })} />
                        <input className="w-20 border border-line rounded px-1 text-xs" placeholder="to" value={mapping.transform.replace} onChange={(e) => update(index, { transform: { type: "replace", search: mapping.transform.type === "replace" ? mapping.transform.search : "", replace: e.target.value } })} />
                      </div>
                    )}
                    {mapping.transform.type === "template" && (
                      <input className="mt-1 w-48 border border-line rounded px-1 text-xs" placeholder="{{FIRST_NAME}} {{LAST_NAME}}" value={mapping.transform.template} onChange={(e) => update(index, { transform: { type: "template", template: e.target.value } })} />
                    )}
                    {mapping.transform.type === "default" && (
                      <input className="mt-1 w-32 border border-line rounded px-1 text-xs" placeholder="fallback" value={mapping.transform.value} onChange={(e) => update(index, { transform: { type: "default", value: e.target.value } })} />
                    )}
                  </td>
                  <td className="py-2">
                    <select
                      className="w-56 border border-line rounded-md px-2 py-1 bg-paper mono text-xs"
                      value={mapping.targetField}
                      onChange={(e) => update(index, { targetField: e.target.value, matchedBy: "manual" })}
                    >
                      {writable.map((field) => (
                        <option key={field.name} value={field.name}>
                          {field.name}{field.required ? " *" : ""}{field.externalId ? " (ext id)" : ""}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="py-2 text-xs text-ink-soft">
                    <div>{target?.label || "—"}</div>
                    <div className="mt-0.5">
                      {target?.type}
                      {target?.required ? " · required" : ""}
                    </div>
                  </td>
                  <td className="py-2">
                    <span className="inline-block text-[11px] px-2 py-0.5 rounded-md bg-chip text-ink-soft">
                      {matchReasonLabel(mapping.matchedBy)}
                    </span>
                  </td>
                  <td className="py-2 pr-3">
                    <button type="button" onClick={() => remove(index)} className="text-ink-soft hover:text-err">
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              );
            })}
            {mappings.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-sm text-ink-soft">
                  No mappings yet. Use Auto-map to match headers to Salesforce API names, or add a row.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {lookupEdit && mappings.find((m) => m.id === lookupEdit) && (
        <LookupModal
          mapping={mappings.find((m) => m.id === lookupEdit)!}
          onClose={() => setLookupEdit(null)}
          onSave={(transform) => {
            onChange(mappings.map((m) => (m.id === lookupEdit ? { ...m, transform } : m)));
            setLookupEdit(null);
          }}
        />
      )}
    </div>
  );
}

export function addManualMapping(
  mappings: FieldMapping[],
  _sourceFields: SchemaField[],
  targetFields: SchemaField[],
  sourceField: string,
): FieldMapping[] {
  const writable = targetFields.filter((f) => f.name !== "Id");
  const unused = writable.find((f) => !mappings.some((m) => m.targetField === f.name));
  return [
    ...mappings,
    {
      id: id("map"),
      sourceField,
      targetField: unused?.name || writable[0]?.name || "Name",
      transform: { type: "none" },
      matchedBy: "manual",
    },
  ];
}

function LookupModal({
  mapping,
  onClose,
  onSave,
}: {
  mapping: FieldMapping;
  onClose: () => void;
  onSave: (op: TransformOp) => void;
}) {
  const current = mapping.transform.type === "lookup" ? mapping.transform.map : {};
  const [text, setText] = useState(
    Object.entries(current).map(([k, v]) => `${k}=${v}`).join("\n"),
  );
  const [fallback, setFallback] = useState(mapping.transform.type === "lookup" ? mapping.transform.fallback || "" : "");

  function save() {
    const map: Record<string, string> = {};
    text.split("\n").forEach((line) => {
      const idx = line.indexOf("=");
      if (idx === -1) return;
      map[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
    });
    onSave({ type: "lookup", map, fallback: fallback || undefined });
  }

  return (
    <div className="fixed inset-0 bg-black/40 grid place-items-center z-20">
      <div className="bg-card rounded-xl p-5 w-[420px] border border-line">
        <h3 className="text-lg">Lookup for {mapping.targetField}</h3>
        <p className="text-sm text-ink-soft mt-1">One pair per line: source=Salesforce value</p>
        <textarea className="mt-3 w-full h-40 border border-line rounded-md p-2 mono text-xs" value={text} onChange={(e) => setText(e.target.value)} />
        <input className="mt-2 w-full border border-line rounded-md px-2 py-1 text-sm" placeholder="Fallback if no match" value={fallback} onChange={(e) => setFallback(e.target.value)} />
        <div className="flex justify-end gap-2 mt-4">
          <button type="button" onClick={onClose} className="px-3 py-1.5 text-sm">Cancel</button>
          <button type="button" onClick={save} className="px-3 py-1.5 text-sm bg-forest text-white rounded-md">Save lookup</button>
        </div>
      </div>
    </div>
  );
}
