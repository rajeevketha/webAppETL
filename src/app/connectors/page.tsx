"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { StatusBadge } from "@/components/StatusBadge";
import { api } from "@/lib/api";
import type { ConnectorRecord } from "@/lib/types";

const TYPE_COPY: Record<string, string> = {
  salesforce: "Salesforce",
  oracle: "Oracle",
  postgres: "PostgreSQL",
  mysql: "MySQL",
  sqlserver: "SQL Server",
  file: "CSV / Excel",
};

export default function ConnectorsPage() {
  const [connectors, setConnectors] = useState<ConnectorRecord[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      const data = await api<{ connectors: ConnectorRecord[] }>("/api/connectors");
      setConnectors(data.connectors);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load connectors.");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function test(id: string) {
    await api(`/api/connectors/${id}/test`, { method: "POST" });
    await load();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl">Connectors</h1>
          <p className="text-ink-soft mt-2 max-w-xl">
            A connector is a saved connection to Salesforce, a database, or files. Test it, then use it as a pipeline source or destination.
          </p>
        </div>
        <Link href="/connectors/new" className="px-4 py-2 rounded-md bg-forest text-white text-sm">
          Add connector
        </Link>
      </div>
      {error && <p className="text-err text-sm">{error}</p>}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {connectors.map((connector) => (
          <article key={connector.id} className="bg-card border border-line rounded-xl p-5 flex flex-col gap-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs uppercase tracking-wider text-ink-soft">{TYPE_COPY[connector.type]}</div>
                <h2 className="text-xl mt-1">{connector.name}</h2>
              </div>
              <StatusBadge status={connector.status} />
            </div>
            <p className="text-sm text-ink-soft">
              {connector.environment} {connector.lastError ? `· ${connector.lastError}` : ""}
            </p>
            <div className="mt-auto flex gap-2">
              <Link href={`/connectors/${connector.id}`} className="px-3 py-1.5 text-sm border border-line rounded-md">
                Open
              </Link>
              <button type="button" onClick={() => test(connector.id)} className="px-3 py-1.5 text-sm border border-line rounded-md">
                Test
              </button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
