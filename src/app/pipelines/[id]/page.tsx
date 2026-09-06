"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { FieldMappingEditor } from "@/components/FieldMappingEditor";
import { StatusBadge } from "@/components/StatusBadge";
import { api } from "@/lib/api";
import type { ValidationIssue } from "@/lib/etl/validate";
import type { FieldMapping, JobRecord, PipelineRecord, Row, SchemaField, SchemaObject } from "@/lib/types";

type Preview = {
  sourceLabel: string;
  sourceFields: SchemaField[];
  sourceRows: Row[];
  mappedRows: Row[];
  target: SchemaObject;
  mappingIssues: ValidationIssue[];
  rowIssues: ValidationIssue[];
};

export default function PipelineEditorPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [pipeline, setPipeline] = useState<PipelineRecord | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [job, setJob] = useState<JobRecord | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  async function loadPreview() {
    const data = await api<{ preview: Preview }>(`/api/pipelines/${params.id}/preview`, { method: "POST" });
    setPreview(data.preview);
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await api<{ pipeline: PipelineRecord }>(`/api/pipelines/${params.id}`);
        if (cancelled) return;
        setPipeline(data.pipeline);
        const previewData = await api<{ preview: Preview }>(`/api/pipelines/${params.id}/preview`, { method: "POST" });
        if (!cancelled) setPreview(previewData.preview);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load pipeline.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [params.id]);

  async function saveMappings(fieldMappings: FieldMapping[]) {
    if (!pipeline) return;
    const data = await api<{ pipeline: PipelineRecord }>(`/api/pipelines/${params.id}`, {
      method: "PATCH",
      body: JSON.stringify({ fieldMappings, status: "ready" }),
    });
    setPipeline(data.pipeline);
    await loadPreview();
  }

  async function automap() {
    setBusy("Mapping…");
    try {
      const data = await api<{ pipeline: PipelineRecord }>(`/api/pipelines/${params.id}/automap`, { method: "POST" });
      setPipeline(data.pipeline);
      await loadPreview();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Auto-map failed.");
    } finally {
      setBusy(null);
    }
  }

  async function run(dryRun = false) {
    setBusy(dryRun ? "Validating…" : "Loading…");
    try {
      const data = await api<{ job: JobRecord }>(`/api/pipelines/${params.id}/run`, {
        method: "POST",
        body: JSON.stringify({ dryRun }),
      });
      setJob(data.job);
      if (data.job?.id) router.push(`/jobs/${data.job.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Run failed.");
    } finally {
      setBusy(null);
    }
  }

  if (!pipeline) return <p className="text-ink-soft">{error || "Loading pipeline…"}</p>;

  const mappedCols = Object.keys(preview?.mappedRows[0] || {});

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
        <div>
          <Link href="/pipelines" className="text-sm text-forest">Pipelines</Link>
          <h1 className="text-3xl mt-1">{pipeline.name}</h1>
          <p className="text-ink-soft mt-2 max-w-2xl">{pipeline.description}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <StatusBadge status={pipeline.status} />
          <button type="button" onClick={automap} className="px-3 py-1.5 text-sm border border-line rounded-md bg-card">Auto-map</button>
          <button type="button" onClick={() => run(true)} className="px-3 py-1.5 text-sm border border-line rounded-md bg-card">Dry run</button>
          <button type="button" onClick={() => run(false)} className="px-3 py-1.5 text-sm rounded-md bg-forest text-white">
            {busy || "Run load"}
          </button>
        </div>
      </div>

      {error && <p className="text-err text-sm">{error}</p>}
      {job && <p className="text-sm">Last job {job.status}: {job.message}</p>}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Info label="Source" value={preview?.sourceLabel || pipeline.sourceConfig.table || "—"} />
        <Info label="Salesforce object" value={pipeline.destConfig.object} />
        <Info label="Operation" value={`${pipeline.destConfig.operation}${pipeline.destConfig.externalIdField ? ` · ${pipeline.destConfig.externalIdField}` : ""}`} />
        <Info label="Batch size" value={String(pipeline.destConfig.batchSize)} />
      </div>

      {preview && (
        <FieldMappingEditor
          mappings={pipeline.fieldMappings}
          sourceFields={preview.sourceFields}
          targetFields={preview.target.fields}
          sourcePreview={preview.sourceRows}
          onChange={(next) => {
            setPipeline({ ...pipeline, fieldMappings: next });
            void saveMappings(next);
          }}
        />
      )}

      {preview && preview.mappingIssues.length > 0 && (
        <div className="border border-line rounded-xl p-4 bg-card">
          <h2 className="text-lg mb-2">Mapping checks</h2>
          <ul className="text-sm space-y-1">
            {preview.mappingIssues.map((issue, i) => (
              <li key={i} className={issue.level === "error" ? "text-err" : "text-warn"}>
                {issue.level}: {issue.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      {preview && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <TableCard title="Source sample" rows={preview.sourceRows} />
          <TableCard title="After transform" rows={preview.mappedRows} columns={mappedCols} />
        </div>
      )}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-card border border-line rounded-xl px-4 py-3">
      <div className="text-[11px] uppercase tracking-wider text-ink-soft">{label}</div>
      <div className="mt-1 font-medium truncate">{value}</div>
    </div>
  );
}

function TableCard({ title, rows, columns }: { title: string; rows: Row[]; columns?: string[] }) {
  const cols = columns || Object.keys(rows[0] || {});
  return (
    <div className="bg-card border border-line rounded-xl p-4 overflow-x-auto">
      <h2 className="text-lg mb-3">{title}</h2>
      <table className="w-full text-xs">
        <thead>
          <tr className="text-left text-ink-soft">
            {cols.map((col) => <th key={col} className="py-1 pr-3 mono">{col}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.slice(0, 8).map((row, i) => (
            <tr key={i} className="border-t border-line">
              {cols.map((col) => <td key={col} className="py-1 pr-3 whitespace-nowrap max-w-[180px] truncate">{String(row[col] ?? "")}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
