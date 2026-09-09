"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import type { ConnectorRecord, LoadOperation } from "@/lib/types";

type UploadPayload = {
  id: string;
  filename: string;
  columns: string[];
  rowCount: number;
};

export default function ImportPage() {
  const router = useRouter();
  const [connectors, setConnectors] = useState<ConnectorRecord[]>([]);
  const [destConnectorId, setDestConnectorId] = useState("");
  const [object, setObject] = useState("Account");
  const [operation, setOperation] = useState<LoadOperation>("insert");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api<{ connectors: ConnectorRecord[] }>("/api/connectors").then((data) => {
      setConnectors(data.connectors);
      const sf = data.connectors.find((c) => c.type === "salesforce");
      if (sf) setDestConnectorId(sf.id);
    });
  }, []);

  async function onFile(file: File) {
    setError(null);
    setBusy(true);
    const form = new FormData();
    form.append("file", file);
    try {
      const data = await api<{ upload: UploadPayload }>("/api/uploads", { method: "POST", body: form });
      const params = new URLSearchParams({
        uploadId: data.upload.id,
        object,
        dest: destConnectorId,
        operation,
      });
      router.push(`/import/map?${params.toString()}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not parse file.");
      setBusy(false);
    }
  }

  const dests = connectors.filter((c) => c.type === "salesforce");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl">File import</h1>
        <p className="text-ink-soft mt-2 max-w-2xl">
          Choose the Salesforce object first, then upload a CSV or Excel file. Flowline opens a dedicated mapping screen
          and matches column headers to that object&apos;s field API names. A sample Account file is in{" "}
          <a className="text-forest underline" href="/samples/accounts.csv">public/samples/accounts.csv</a>.
        </p>
      </div>
      {error && <p className="text-err text-sm">{error}</p>}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <label className="bg-card border border-line rounded-xl px-4 py-3">
          <div className="text-[11px] uppercase tracking-wider text-ink-soft">Salesforce org</div>
          <select className="mt-1 w-full bg-transparent" value={destConnectorId} onChange={(e) => setDestConnectorId(e.target.value)}>
            {dests.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
        <label className="bg-card border border-line rounded-xl px-4 py-3">
          <div className="text-[11px] uppercase tracking-wider text-ink-soft">Salesforce object</div>
          <select className="mt-1 w-full bg-transparent" value={object} onChange={(e) => setObject(e.target.value)}>
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

      <div
        className="border-2 border-dashed border-line rounded-xl bg-card p-8 text-center"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const file = e.dataTransfer.files[0];
          if (file) void onFile(file);
        }}
      >
        <p className="font-medium">{busy ? "Reading file…" : "Drop a .csv or .xlsx file here"}</p>
        <p className="text-sm text-ink-soft mt-1">Header row required. First sheet is used for Excel. Mapping opens next.</p>
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
    </div>
  );
}
