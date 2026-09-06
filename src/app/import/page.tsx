"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FieldMappingEditor } from "@/components/FieldMappingEditor";
import { api } from "@/lib/api";
import { SALESFORCE_OBJECTS } from "@/lib/connectors/demo-data";
import { autoMapFields } from "@/lib/etl/automap";
import type { ConnectorRecord, DestConfig, FieldMapping, JobRecord, LoadOperation, Row, SchemaField } from "@/lib/types";

function fieldsFromColumns(columns: string[]): SchemaField[] {
  return columns.map((name) => ({ name, label: name, type: "string" }));
}

type UploadPayload = {
  id: string;
  filename: string;
  columns: string[];
  rowCount: number;
  preview: Row[];
};

export default function ImportPage() {
  const router = useRouter();
  const [connectors, setConnectors] = useState<ConnectorRecord[]>([]);
  const [upload, setUpload] = useState<UploadPayload | null>(null);
  const [destConnectorId, setDestConnectorId] = useState("");
  const [object, setObject] = useState("Account");
  const [operation, setOperation] = useState<LoadOperation>("insert");
  const [mappings, setMappings] = useState<FieldMapping[]>([]);
  const [targetFields, setTargetFields] = useState<SchemaField[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    api<{ connectors: ConnectorRecord[] }>("/api/connectors").then((data) => {
      setConnectors(data.connectors);
      const sf = data.connectors.find((c) => c.type === "salesforce");
      if (sf) setDestConnectorId(sf.id);
    });
  }, []);

  useEffect(() => {
    const dest = connectors.find((c) => c.id === destConnectorId);
    if (!dest || dest.environment !== "demo") {
      const fallback = SALESFORCE_OBJECTS.find((o) => o.name === object);
      setTargetFields(fallback?.fields || []);
      return;
    }
    api<{ object: { fields: SchemaField[] } }>(`/api/connectors/${destConnectorId}/schema?object=${object}`)
      .then((data) => setTargetFields(data.object.fields))
      .catch(() => {
        const fallback = SALESFORCE_OBJECTS.find((o) => o.name === object);
        setTargetFields(fallback?.fields || []);
      });
  }, [destConnectorId, object, connectors]);

  async function onFile(file: File) {
    setError(null);
    const form = new FormData();
    form.append("file", file);
    try {
      const data = await api<{ upload: UploadPayload }>("/api/uploads", { method: "POST", body: form });
      setUpload(data.upload);
      const fields = fieldsFromColumns(data.upload.columns);
      const target = SALESFORCE_OBJECTS.find((o) => o.name === object)?.fields || targetFields;
      setMappings(autoMapFields(fields, target));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not parse file.");
    }
  }

  async function run(dryRun = false) {
    if (!upload) return;
    setBusy(dryRun ? "Validating…" : "Loading…");
    try {
      const destConfig: DestConfig = {
        object,
        operation,
        externalIdField: "External_Id__c",
        batchSize: 200,
        errorPolicy: "collect",
        dryRun,
      };
      const data = await api<{ job: JobRecord }>("/api/imports", {
        method: "POST",
        body: JSON.stringify({
          uploadId: upload.id,
          destConnectorId,
          destConfig,
          fieldMappings: mappings,
          dryRun,
        }),
      });
      if (data.job?.id) router.push(`/jobs/${data.job.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed.");
    } finally {
      setBusy(null);
    }
  }

  const dests = connectors.filter((c) => c.type === "salesforce");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl">File import</h1>
        <p className="text-ink-soft mt-2 max-w-2xl">
          Upload a CSV or Excel file, map columns onto a Salesforce object, then insert or upsert. A sample Account file is in{" "}
          <a className="text-forest underline" href="/samples/accounts.csv">public/samples/accounts.csv</a>.
        </p>
      </div>
      {error && <p className="text-err text-sm">{error}</p>}

      <div
        className="border-2 border-dashed border-line rounded-xl bg-card p-8 text-center"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const file = e.dataTransfer.files[0];
          if (file) void onFile(file);
        }}
      >
        <p className="font-medium">Drop a .csv or .xlsx file here</p>
        <p className="text-sm text-ink-soft mt-1">Header row required. First sheet is used for Excel.</p>
        <label className="inline-block mt-4 px-4 py-2 rounded-md bg-forest text-white text-sm cursor-pointer">
          Choose file
          <input
            type="file"
            accept=".csv,.xlsx,.xls,.txt"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void onFile(file);
            }}
          />
        </label>
      </div>

      {upload && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <Info label="File" value={`${upload.filename} · ${upload.rowCount} rows`} />
            <label className="bg-card border border-line rounded-xl px-4 py-3">
              <div className="text-[11px] uppercase tracking-wider text-ink-soft">Salesforce org</div>
              <select className="mt-1 w-full bg-transparent" value={destConnectorId} onChange={(e) => setDestConnectorId(e.target.value)}>
                {dests.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </label>
            <label className="bg-card border border-line rounded-xl px-4 py-3">
              <div className="text-[11px] uppercase tracking-wider text-ink-soft">Object</div>
              <select className="mt-1 w-full bg-transparent" value={object} onChange={(e) => {
                setObject(e.target.value);
                if (upload) setMappings(autoMapFields(fieldsFromColumns(upload.columns), SALESFORCE_OBJECTS.find((o) => o.name === e.target.value)?.fields || []));
              }}>
                {["Account", "Contact", "Lead", "Opportunity", "Case"].map((o) => <option key={o}>{o}</option>)}
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

          <FieldMappingEditor
            mappings={mappings}
            sourceFields={fieldsFromColumns(upload.columns)}
            targetFields={targetFields}
            sourcePreview={upload.preview}
            onChange={setMappings}
          />

          <div className="bg-card border border-line rounded-xl p-4 overflow-x-auto">
            <h2 className="text-lg mb-3">File preview</h2>
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-ink-soft">
                  {upload.columns.map((col) => <th key={col} className="py-1 pr-3 mono">{col}</th>)}
                </tr>
              </thead>
              <tbody>
                {upload.preview.slice(0, 8).map((row, i) => (
                  <tr key={i} className="border-t border-line">
                    {upload.columns.map((col) => <td key={col} className="py-1 pr-3 whitespace-nowrap">{String(row[col] ?? "")}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex gap-2">
            <button type="button" onClick={() => run(true)} className="px-4 py-2 rounded-md border border-line bg-card text-sm">
              Dry run
            </button>
            <button type="button" onClick={() => run(false)} className="px-4 py-2 rounded-md bg-forest text-white text-sm">
              {busy || "Load to Salesforce"}
            </button>
          </div>
        </>
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
