"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { StatusBadge } from "@/components/StatusBadge";
import { api } from "@/lib/api";
import type { ConnectorRecord, Row } from "@/lib/types";

type SchemaList = { name: string; label: string }[];

export default function ConnectorDetailPage() {
  const params = useParams<{ id: string }>();
  const [connector, setConnector] = useState<ConnectorRecord | null>(null);
  const [objects, setObjects] = useState<SchemaList>([]);
  const [selected, setSelected] = useState<string>("");
  const [preview, setPreview] = useState<Row[]>([]);
  const [fields, setFields] = useState<{ name: string; type: string; required?: boolean }[]>([]);
  const [loaded, setLoaded] = useState<{ sfId: unknown; payload: Row; objectName: string }[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function reload() {
    const data = await api<{ connector: ConnectorRecord }>(`/api/connectors/${params.id}`);
    setConnector(data.connector);
  }

  useEffect(() => {
    api<{ connector: ConnectorRecord }>(`/api/connectors/${params.id}`)
      .then((data) => setConnector(data.connector))
      .catch((err: Error) => setError(err.message));
  }, [params.id]);

  async function test() {
    const data = await api<{ result: { ok: boolean; message: string } }>(`/api/connectors/${params.id}/test`, { method: "POST" });
    setMessage(data.result.message);
    await reload();
  }

  async function browse() {
    try {
      const data = await api<{ objects: SchemaList }>(`/api/connectors/${params.id}/schema`);
      setObjects(data.objects);
      setSelected(data.objects[0]?.name || "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not list objects.");
    }
  }

  async function inspect(name: string) {
    setSelected(name);
    const data = await api<{ object: { fields: { name: string; type: string; required?: boolean }[] }; preview: Row[] }>(
      `/api/connectors/${params.id}/schema?object=${encodeURIComponent(name)}`,
    );
    setFields(data.object.fields);
    setPreview(data.preview);
    if (connector?.type === "salesforce") {
      const rec = await api<{ records: { sfId: unknown; payload: Row; objectName: string }[] }>(
        `/api/connectors/${params.id}/records?object=${encodeURIComponent(name)}`,
      );
      setLoaded(rec.records);
    }
  }

  if (!connector) return <p className="text-ink-soft">{error || "Loading…"}</p>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
        <div>
          <Link href="/connectors" className="text-sm text-forest">Connectors</Link>
          <h1 className="text-3xl mt-1">{connector.name}</h1>
          <p className="text-ink-soft mt-2">{connector.type} · {connector.environment}</p>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={connector.status} />
          <button type="button" onClick={() => test()} className="px-3 py-1.5 text-sm border border-line rounded-md bg-card">Test connection</button>
          <button type="button" onClick={() => browse()} className="px-3 py-1.5 text-sm rounded-md bg-forest text-white">Browse schema</button>
        </div>
      </div>
      {message && <p className="text-sm text-ok">{message}</p>}
      {error && <p className="text-sm text-err">{error}</p>}

      {objects.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-4">
          <div className="bg-card border border-line rounded-xl p-2">
            {objects.map((item) => (
              <button
                type="button"
                key={item.name}
                onClick={() => inspect(item.name)}
                className={`w-full text-left px-3 py-2 rounded-md text-sm ${selected === item.name ? "bg-chip" : "hover:bg-paper"}`}
              >
                <div className="font-medium">{item.label}</div>
                <div className="mono text-[11px] text-ink-soft">{item.name}</div>
              </button>
            ))}
          </div>
          <div className="space-y-4">
            <div className="bg-card border border-line rounded-xl p-4 overflow-x-auto">
              <h2 className="text-lg mb-3">Fields</h2>
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase tracking-wider text-ink-soft">
                  <tr><th className="py-1">API name</th><th>Type</th><th>Required</th></tr>
                </thead>
                <tbody>
                  {fields.map((field) => (
                    <tr key={field.name} className="border-t border-line">
                      <td className="py-1 mono text-xs">{field.name}</td>
                      <td>{field.type}</td>
                      <td>{field.required ? "yes" : ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {preview.length > 0 && (
              <PreviewTable rows={preview} title="Source preview" />
            )}
            {loaded.length > 0 && (
              <PreviewTable rows={loaded.map((r) => ({ Id: r.sfId, ...r.payload }))} title="Loaded Salesforce records (demo)" />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function PreviewTable({ rows, title }: { rows: Row[]; title: string }) {
  const columns = Object.keys(rows[0] || {});
  return (
    <div className="bg-card border border-line rounded-xl p-4 overflow-x-auto">
      <h2 className="text-lg mb-3">{title}</h2>
      <table className="w-full text-xs">
        <thead>
          <tr className="text-left text-ink-soft">
            {columns.map((col) => <th key={col} className="py-1 pr-3 mono">{col}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.slice(0, 8).map((row, i) => (
            <tr key={i} className="border-t border-line">
              {columns.map((col) => <td key={col} className="py-1 pr-3 whitespace-nowrap">{String(row[col] ?? "")}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
