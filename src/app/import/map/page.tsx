"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { FieldMappingEditor, addManualMapping } from "@/components/FieldMappingEditor";
import { MappingCoverage } from "@/components/MappingCoverage";
import { PreviewTable } from "@/components/PreviewTable";
import { TestResultPanel } from "@/components/TestResultPanel";
import { api } from "@/lib/api";
import { SALESFORCE_OBJECTS } from "@/lib/connectors/demo-data";
import { autoMapFields } from "@/lib/etl/automap";
import { mapRow } from "@/lib/etl/transform";
import { validateMappings } from "@/lib/etl/validate";
import type { ConnectorRecord, DestConfig, FieldMapping, JobErrorRecord, JobRecord, LoadOperation, Row, SchemaField, UploadRecord } from "@/lib/types";

function fieldsFromColumns(columns: string[]): SchemaField[] {
  return columns.map((name) => ({ name, label: name, type: "string" }));
}

const FALLBACK_OBJECTS = ["Account", "Contact", "Lead", "Opportunity", "Case"];

function ImportMapInner() {
  const router = useRouter();
  const search = useSearchParams();
  const uploadId = search.get("uploadId") || "";
  const [connectors, setConnectors] = useState<ConnectorRecord[]>([]);
  const [upload, setUpload] = useState<UploadRecord | null>(null);
  const [destConnectorId, setDestConnectorId] = useState(search.get("dest") || "");
  const [object, setObject] = useState(search.get("object") || "Account");
  const [operation, setOperation] = useState<LoadOperation>((search.get("operation") as LoadOperation) || "insert");
  const [objects, setObjects] = useState<string[]>(FALLBACK_OBJECTS);
  const [targetFields, setTargetFields] = useState<SchemaField[]>([]);
  const [mappings, setMappings] = useState<FieldMapping[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ job: JobRecord; errors: JobErrorRecord[] } | null>(null);

  useEffect(() => {
    if (!uploadId) {
      setError("Missing upload. Start from File import.");
      return;
    }
    api<UploadRecord>(`/api/uploads/${uploadId}`)
      .then(setUpload)
      .catch((err: Error) => setError(err.message));
  }, [uploadId]);

  useEffect(() => {
    api<{ connectors: ConnectorRecord[] }>("/api/connectors").then((data) => {
      setConnectors(data.connectors);
      const sf = data.connectors.find((c) => c.type === "salesforce");
      if (!destConnectorId && sf) setDestConnectorId(sf.id);
    });
  }, [destConnectorId]);

  useEffect(() => {
    if (!destConnectorId) return;
    api<{ objects: { name: string }[] }>(`/api/connectors/${destConnectorId}/schema`)
      .then((data) => {
        if (data.objects?.length) setObjects(data.objects.map((o) => o.name));
      })
      .catch(() => setObjects(FALLBACK_OBJECTS));
  }, [destConnectorId]);

  useEffect(() => {
    const dest = connectors.find((c) => c.id === destConnectorId);
    const fallback = SALESFORCE_OBJECTS.find((o) => o.name === object)?.fields || [];
    if (!dest || dest.environment !== "demo") {
      setTargetFields(fallback);
      return;
    }
    api<{ object: { fields: SchemaField[] } }>(`/api/connectors/${destConnectorId}/schema?object=${object}`)
      .then((data) => setTargetFields(data.object.fields))
      .catch(() => setTargetFields(fallback));
  }, [destConnectorId, object, connectors]);

  useEffect(() => {
    if (!upload || targetFields.length === 0) return;
    setMappings(autoMapFields(fieldsFromColumns(upload.columns), targetFields));
  }, [upload, targetFields, object]);

  const sourceFields = useMemo(() => fieldsFromColumns(upload?.columns || []), [upload]);
  const mappedRows = useMemo(
    () => (upload?.preview || []).slice(0, 8).map((row) => mapRow(row, mappings)),
    [upload, mappings],
  );
  const mappingIssues = useMemo(
    () => validateMappings(mappings, targetFields, operation),
    [mappings, targetFields, operation],
  );

  async function run(dryRun = false) {
    if (!upload) return;
    setBusy(dryRun ? "Testing…" : "Loading…");
    setError(null);
    try {
      const destConfig: DestConfig = {
        object,
        operation,
        externalIdField: "External_Id__c",
        batchSize: 200,
        errorPolicy: "collect",
        dryRun,
      };
      const data = await api<{ job: JobRecord; errors?: JobErrorRecord[] }>("/api/imports", {
        method: "POST",
        body: JSON.stringify({
          uploadId: upload.id,
          destConnectorId,
          destConfig,
          fieldMappings: mappings,
          dryRun,
        }),
      });
      if (dryRun) {
        setTestResult({ job: data.job, errors: data.errors || [] });
        document.getElementById("test-result")?.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }
      if (data.job?.id) router.push(`/jobs/${data.job.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed.");
    } finally {
      setBusy(null);
    }
  }

  const dests = connectors.filter((c) => c.type === "salesforce");

  if (!upload && !error) return <p className="text-ink-soft">Loading file mapping…</p>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
        <div>
          <div className="text-sm text-ink-soft">
            <Link href="/import" className="text-forest">File import</Link>
            <span className="mx-2">/</span>
            Field mapping
          </div>
          <h1 className="text-3xl mt-1">Map columns to {object}</h1>
          <p className="text-ink-soft mt-2 max-w-2xl">
            File headers are matched to Salesforce field API names for the object you selected. Change the object to remap.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => upload && setMappings(autoMapFields(fieldsFromColumns(upload.columns), targetFields))}
            className="px-3 py-1.5 text-sm border border-line rounded-md bg-card"
          >
            Auto-map by API / label
          </button>
          <button type="button" onClick={() => void run(true)} className="px-3 py-1.5 text-sm border border-line rounded-md bg-card">
            {busy === "Testing…" ? "Testing…" : "Test"}
          </button>
          <button type="button" onClick={() => void run(false)} className="px-3 py-1.5 text-sm rounded-md bg-forest text-white">
            {busy === "Loading…" ? "Loading…" : "Load to Salesforce"}
          </button>
        </div>
      </div>

      {error && <p className="text-err text-sm">{error}</p>}
      {testResult && <TestResultPanel job={testResult.job} errors={testResult.errors} object={object} />}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="bg-card border border-line rounded-xl px-4 py-3">
          <div className="text-[11px] uppercase tracking-wider text-ink-soft">File</div>
          <div className="mt-1 font-medium truncate">{upload ? `${upload.filename} · ${upload.rowCount} rows` : "—"}</div>
        </div>
        <label className="bg-card border border-line rounded-xl px-4 py-3">
          <div className="text-[11px] uppercase tracking-wider text-ink-soft">Salesforce org</div>
          <select className="mt-1 w-full bg-transparent" value={destConnectorId} onChange={(e) => setDestConnectorId(e.target.value)}>
            {dests.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
        <label className="bg-card border border-line rounded-xl px-4 py-3">
          <div className="text-[11px] uppercase tracking-wider text-ink-soft">Salesforce object</div>
          <select className="mt-1 w-full bg-transparent" value={object} onChange={(e) => setObject(e.target.value)}>
            {Array.from(new Set([...objects, object])).map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
        </label>
        <label className="bg-card border border-line rounded-xl px-4 py-3">
          <div className="text-[11px] uppercase tracking-wider text-ink-soft">Operation</div>
          <select className="mt-1 w-full bg-transparent" value={operation} onChange={(e) => setOperation(e.target.value as LoadOperation)}>
            <option value="insert">Insert</option>
            <option value="upsert">Upsert</option>
            <option value="update">Update</option>
          </select>
        </label>
      </div>

      {upload && (
        <MappingCoverage
          sourceFields={sourceFields}
          targetFields={targetFields}
          mappings={mappings}
          onAddSource={(sourceField) => setMappings(addManualMapping(mappings, sourceFields, targetFields, sourceField))}
        />
      )}

      {upload && (
        <FieldMappingEditor
          mappings={mappings}
          sourceFields={sourceFields}
          targetFields={targetFields}
          sourcePreview={upload.preview}
          onChange={setMappings}
        />
      )}

      {mappingIssues.length > 0 && (
        <div className="border border-line rounded-xl p-4 bg-card">
          <h2 className="text-lg mb-2">Mapping checks</h2>
          <ul className="text-sm space-y-1">
            {mappingIssues.map((issue, i) => (
              <li key={i} className={issue.level === "error" ? "text-err" : "text-warn"}>
                {issue.level}: {issue.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      {upload && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <PreviewTable title="File sample" rows={upload.preview} columns={upload.columns} />
          <PreviewTable title="After transform (Salesforce API names)" rows={mappedRows} />
        </div>
      )}
    </div>
  );
}

export default function ImportMapPage() {
  return (
    <Suspense fallback={<p className="text-ink-soft">Loading field mapping…</p>}>
      <ImportMapInner />
    </Suspense>
  );
}
