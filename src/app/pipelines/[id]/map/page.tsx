"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { FieldMappingEditor, addManualMapping } from "@/components/FieldMappingEditor";
import { MappingCoverage } from "@/components/MappingCoverage";
import { PreviewTable } from "@/components/PreviewTable";
import { StatusBadge } from "@/components/StatusBadge";
import { api } from "@/lib/api";
import type { ValidationIssue } from "@/lib/etl/validate";
import type { FieldMapping, JobRecord, LoadOperation, PipelineRecord, Row, SchemaField, SchemaObject } from "@/lib/types";

type Preview = {
  sourceLabel: string;
  sourceFields: SchemaField[];
  sourceRows: Row[];
  mappedRows: Row[];
  target: SchemaObject;
  mappingIssues: ValidationIssue[];
  rowIssues: ValidationIssue[];
};

const FALLBACK_OBJECTS = ["Account", "Contact", "Lead", "Opportunity", "Case"];

export default function PipelineMapPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [pipeline, setPipeline] = useState<PipelineRecord | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [objects, setObjects] = useState<string[]>(FALLBACK_OBJECTS);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoTried = useRef(false);

  async function loadPreview() {
    const data = await api<{ preview: Preview }>(`/api/pipelines/${params.id}/preview`, { method: "POST" });
    setPreview(data.preview);
    return data.preview;
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await api<{ pipeline: PipelineRecord }>(`/api/pipelines/${params.id}`);
        if (cancelled) return;
        setPipeline(data.pipeline);
        const previewData = await loadPreview();
        if (cancelled) return;
        try {
          const schema = await api<{ objects: { name: string }[] }>(`/api/connectors/${data.pipeline.destConnectorId}/schema`);
          if (!cancelled && schema.objects?.length) {
            setObjects(schema.objects.map((o) => o.name));
          }
        } catch {
          setObjects(FALLBACK_OBJECTS);
        }
        if (!cancelled && data.pipeline.fieldMappings.length === 0 && !autoTried.current && previewData.sourceFields.length) {
          autoTried.current = true;
          await automap();
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load mapping.");
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  async function saveMappings(fieldMappings: FieldMapping[]) {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      const data = await api<{ pipeline: PipelineRecord }>(`/api/pipelines/${params.id}`, {
        method: "PATCH",
        body: JSON.stringify({ fieldMappings, status: "ready" }),
      });
      setPipeline(data.pipeline);
      await loadPreview();
    }, 350);
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

  async function changeObject(object: string) {
    if (!pipeline) return;
    setBusy("Loading object fields…");
    try {
      const patched = await api<{ pipeline: PipelineRecord }>(`/api/pipelines/${params.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          destConfig: { ...pipeline.destConfig, object },
          fieldMappings: [],
          status: "draft",
        }),
      });
      setPipeline(patched.pipeline);
      autoTried.current = true;
      const mapped = await api<{ pipeline: PipelineRecord }>(`/api/pipelines/${params.id}/automap`, { method: "POST" });
      setPipeline(mapped.pipeline);
      await loadPreview();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not change object.");
    } finally {
      setBusy(null);
    }
  }

  async function changeOperation(operation: LoadOperation) {
    if (!pipeline) return;
    const data = await api<{ pipeline: PipelineRecord }>(`/api/pipelines/${params.id}`, {
      method: "PATCH",
      body: JSON.stringify({ destConfig: { ...pipeline.destConfig, operation } }),
    });
    setPipeline(data.pipeline);
    await loadPreview();
  }

  async function run(dryRun = false) {
    setBusy(dryRun ? "Validating…" : "Loading…");
    try {
      const data = await api<{ job: JobRecord }>(`/api/pipelines/${params.id}/run`, {
        method: "POST",
        body: JSON.stringify({ dryRun }),
      });
      if (data.job?.id) router.push(`/jobs/${data.job.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Run failed.");
    } finally {
      setBusy(null);
    }
  }

  if (!pipeline) return <p className="text-ink-soft">{error || "Loading field mapping…"}</p>;

  const mappedCols = Object.keys(preview?.mappedRows[0] || {});

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
        <div>
          <div className="text-sm text-ink-soft">
            <Link href="/pipelines" className="text-forest">Pipelines</Link>
            <span className="mx-2">/</span>
            <Link href={`/pipelines/${pipeline.id}`} className="text-forest">{pipeline.name}</Link>
            <span className="mx-2">/</span>
            Field mapping
          </div>
          <h1 className="text-3xl mt-1">Map columns to {pipeline.destConfig.object}</h1>
          <p className="text-ink-soft mt-2 max-w-2xl">
            Headers are matched to Salesforce field API names for the selected object. Review the API name on each row before you load.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <StatusBadge status={pipeline.status} />
          <button type="button" onClick={() => automap()} className="px-3 py-1.5 text-sm border border-line rounded-md bg-card">
            Auto-map by API / label
          </button>
          <button type="button" onClick={() => run(true)} className="px-3 py-1.5 text-sm border border-line rounded-md bg-card">Dry run</button>
          <button type="button" onClick={() => run(false)} className="px-3 py-1.5 text-sm rounded-md bg-forest text-white">
            {busy || "Run load"}
          </button>
        </div>
      </div>

      {error && <p className="text-err text-sm">{error}</p>}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="bg-card border border-line rounded-xl px-4 py-3">
          <div className="text-[11px] uppercase tracking-wider text-ink-soft">Source</div>
          <div className="mt-1 font-medium truncate">{preview?.sourceLabel || pipeline.sourceConfig.table || "—"}</div>
        </div>
        <label className="bg-card border border-line rounded-xl px-4 py-3">
          <div className="text-[11px] uppercase tracking-wider text-ink-soft">Salesforce object</div>
          <select
            className="mt-1 w-full bg-transparent"
            value={pipeline.destConfig.object}
            onChange={(e) => void changeObject(e.target.value)}
          >
            {Array.from(new Set([...objects, pipeline.destConfig.object])).map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
        </label>
        <label className="bg-card border border-line rounded-xl px-4 py-3">
          <div className="text-[11px] uppercase tracking-wider text-ink-soft">Operation</div>
          <select
            className="mt-1 w-full bg-transparent"
            value={pipeline.destConfig.operation}
            onChange={(e) => void changeOperation(e.target.value as LoadOperation)}
          >
            <option value="insert">Insert</option>
            <option value="upsert">Upsert</option>
            <option value="update">Update</option>
            <option value="delete">Delete</option>
          </select>
        </label>
      </div>

      {preview && (
        <MappingCoverage
          sourceFields={preview.sourceFields}
          targetFields={preview.target.fields}
          mappings={pipeline.fieldMappings}
          onAddSource={(sourceField) => {
            const next = addManualMapping(pipeline.fieldMappings, preview.sourceFields, preview.target.fields, sourceField);
            setPipeline({ ...pipeline, fieldMappings: next });
            void saveMappings(next);
          }}
        />
      )}

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
          <PreviewTable title="Source sample" rows={preview.sourceRows} />
          <PreviewTable title="After transform (Salesforce API names)" rows={preview.mappedRows} columns={mappedCols} />
        </div>
      )}
    </div>
  );
}
