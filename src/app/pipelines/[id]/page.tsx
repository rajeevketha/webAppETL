"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { matchReasonLabel } from "@/components/MappingCoverage";
import { PreviewTable } from "@/components/PreviewTable";
import { StatusBadge } from "@/components/StatusBadge";
import { api } from "@/lib/api";
import type { ValidationIssue } from "@/lib/etl/validate";
import type { JobRecord, PipelineRecord, Row, SchemaField, SchemaObject } from "@/lib/types";

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
          <Link href={`/pipelines/${pipeline.id}/map`} className="px-3 py-1.5 text-sm border border-line rounded-md bg-card">
            Open field mapping
          </Link>
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
        <Info label="Mapped fields" value={String(pipeline.fieldMappings.length)} />
      </div>

      <div className="bg-card border border-line rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-line flex items-center justify-between">
          <div>
            <h2 className="text-lg">Field mapping</h2>
            <p className="text-sm text-ink-soft">Source columns mapped to Salesforce API names. Open the mapping screen to edit.</p>
          </div>
          <Link href={`/pipelines/${pipeline.id}/map`} className="text-sm text-forest">Edit mappings</Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-[11px] uppercase tracking-wider text-ink-soft bg-paper">
              <tr>
                <th className="px-4 py-2">Source column</th>
                <th>Salesforce API name</th>
                <th>Transform</th>
                <th>Matched by</th>
              </tr>
            </thead>
            <tbody>
              {pipeline.fieldMappings.map((mapping) => (
                <tr key={mapping.id} className="border-t border-line">
                  <td className="px-4 py-2 mono text-xs">{mapping.sourceField || "—"}</td>
                  <td className="mono text-xs">{mapping.targetField}</td>
                  <td className="text-ink-soft">{mapping.transform.type}</td>
                  <td className="text-ink-soft">{matchReasonLabel(mapping.matchedBy)}</td>
                </tr>
              ))}
              {pipeline.fieldMappings.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-sm text-ink-soft">
                    No mappings yet.{" "}
                    <Link href={`/pipelines/${pipeline.id}/map`} className="text-forest">Open field mapping</Link>
                    {" "}to match columns to Salesforce fields.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

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
          <PreviewTable title="Source sample" rows={preview.sourceRows} />
          <PreviewTable title="After transform" rows={preview.mappedRows} columns={mappedCols} />
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
