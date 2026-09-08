"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { StatusBadge } from "@/components/StatusBadge";
import { api } from "@/lib/api";
import type { PipelineRecord } from "@/lib/types";

export default function PipelinesPage() {
  const [pipelines, setPipelines] = useState<PipelineRecord[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<{ pipelines: PipelineRecord[] }>("/api/pipelines")
      .then((data) => setPipelines(data.pipelines))
      .catch((err: Error) => setError(err.message));
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl">Pipelines</h1>
          <p className="text-ink-soft mt-2 max-w-2xl">
            A pipeline is source → mapping → Salesforce object. Demo pipelines already map Oracle customers, contacts, and opportunities.
          </p>
        </div>
        <Link href="/pipelines/new" className="px-4 py-2 rounded-md bg-forest text-white text-sm">New pipeline</Link>
      </div>
      {error && <p className="text-err text-sm">{error}</p>}
      <div className="bg-card border border-line rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase tracking-wider text-ink-soft bg-paper">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th>Object</th>
              <th>Operation</th>
              <th>Mappings</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {pipelines.map((pipe) => (
              <tr key={pipe.id} className="border-t border-line">
                <td className="px-4 py-3">
                  <Link href={`/pipelines/${pipe.id}`} className="font-medium hover:underline">{pipe.name}</Link>
                  <div className="text-ink-soft text-xs mt-1">{pipe.description}</div>
                </td>
                <td className="mono text-xs">{pipe.destConfig.object}</td>
                <td>{pipe.destConfig.operation}</td>
                <td>{pipe.fieldMappings.length}</td>
                <td><StatusBadge status={pipe.status} /></td>
                <td className="pr-4 text-right">
                  <Link href={`/pipelines/${pipe.id}/map`} className="text-sm text-forest">Map fields</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
