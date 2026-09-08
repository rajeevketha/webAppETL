"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { ConnectorRecord, LoadOperation } from "@/lib/types";

export default function NewPipelinePage() {
  const router = useRouter();
  const [connectors, setConnectors] = useState<ConnectorRecord[]>([]);
  const [name, setName] = useState("Oracle table → Salesforce");
  const [description, setDescription] = useState("");
  const [sourceConnectorId, setSourceConnectorId] = useState("");
  const [destConnectorId, setDestConnectorId] = useState("");
  const [table, setTable] = useState("CUSTOMERS");
  const [object, setObject] = useState("Account");
  const [operation, setOperation] = useState<LoadOperation>("upsert");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<{ connectors: ConnectorRecord[] }>("/api/connectors").then((data) => {
      setConnectors(data.connectors);
      const oracle = data.connectors.find((c) => c.type === "oracle");
      const sf = data.connectors.find((c) => c.type === "salesforce");
      if (oracle) setSourceConnectorId(oracle.id);
      if (sf) setDestConnectorId(sf.id);
    });
  }, []);

  const sources = connectors.filter((c) => c.type !== "salesforce");
  const dests = connectors.filter((c) => c.type === "salesforce");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    try {
      const data = await api<{ pipeline: { id: string } }>("/api/pipelines", {
        method: "POST",
        body: JSON.stringify({
          name,
          description,
          sourceConnectorId,
          destConnectorId,
          sourceConfig: { mode: "table", table },
          destConfig: { object, operation, externalIdField: "External_Id__c", batchSize: 200, errorPolicy: "collect" },
          fieldMappings: [],
          status: "draft",
        }),
      });
      router.push(`/pipelines/${data.pipeline.id}/map`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create pipeline.");
    }
  }

  return (
    <form onSubmit={submit} className="max-w-2xl space-y-5">
      <h1 className="text-3xl">New pipeline</h1>
      <p className="text-ink-soft">Pick the source and Salesforce object. The next screen maps column headers to that object&apos;s field API names.</p>
      {error && <p className="text-err text-sm">{error}</p>}
      <label className="block">
        <span className="text-xs uppercase tracking-wider text-ink-soft">Name</span>
        <input className="mt-1 w-full border border-line rounded-md px-3 py-2 bg-card" value={name} onChange={(e) => setName(e.target.value)} />
      </label>
      <label className="block">
        <span className="text-xs uppercase tracking-wider text-ink-soft">Description</span>
        <textarea className="mt-1 w-full border border-line rounded-md px-3 py-2 bg-card" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
      </label>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <label className="block">
          <span className="text-xs uppercase tracking-wider text-ink-soft">Source</span>
          <select className="mt-1 w-full border border-line rounded-md px-3 py-2 bg-card" value={sourceConnectorId} onChange={(e) => setSourceConnectorId(e.target.value)}>
            {sources.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="text-xs uppercase tracking-wider text-ink-soft">Table / query object</span>
          <input className="mt-1 w-full border border-line rounded-md px-3 py-2 bg-card" value={table} onChange={(e) => setTable(e.target.value)} />
        </label>
        <label className="block">
          <span className="text-xs uppercase tracking-wider text-ink-soft">Salesforce destination</span>
          <select className="mt-1 w-full border border-line rounded-md px-3 py-2 bg-card" value={destConnectorId} onChange={(e) => setDestConnectorId(e.target.value)}>
            {dests.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="text-xs uppercase tracking-wider text-ink-soft">Salesforce object</span>
          <select className="mt-1 w-full border border-line rounded-md px-3 py-2 bg-card" value={object} onChange={(e) => setObject(e.target.value)}>
            {["Account", "Contact", "Lead", "Opportunity", "Case"].map((o) => <option key={o}>{o}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="text-xs uppercase tracking-wider text-ink-soft">Operation</span>
          <select className="mt-1 w-full border border-line rounded-md px-3 py-2 bg-card" value={operation} onChange={(e) => setOperation(e.target.value as LoadOperation)}>
            <option value="insert">Insert</option>
            <option value="update">Update</option>
            <option value="upsert">Upsert</option>
            <option value="delete">Delete</option>
          </select>
        </label>
      </div>
      <button className="px-4 py-2 rounded-md bg-forest text-white text-sm">Create and map fields</button>
    </form>
  );
}
