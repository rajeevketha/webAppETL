"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Play, Upload } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { api } from "@/lib/api";
import type { JobRecord, PipelineRecord } from "@/lib/types";

type Stats = {
  connectors: number;
  pipelines: number;
  jobs: number;
  loaded: number;
  failed: number;
};

export default function OverviewPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [jobs, setJobs] = useState<JobRecord[]>([]);
  const [pipelines, setPipelines] = useState<PipelineRecord[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<{ stats: Stats; jobs: JobRecord[]; pipelines: PipelineRecord[] }>("/api/stats")
      .then((data) => {
        setStats(data.stats);
        setJobs(data.jobs);
        setPipelines(data.pipelines);
      })
      .catch((err: Error) => setError(err.message));
  }, []);

  return (
    <div className="space-y-8">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div>
          <div className="text-[12px] text-ink-soft">Flowline</div>
          <h1 className="text-[2rem] md:text-[2.35rem] mt-1 leading-[1.15] max-w-2xl">
            Move operational data into Salesforce without a spreadsheet round-trip.
          </h1>
          <p className="mt-3 max-w-2xl text-ink-soft leading-6">
            Connect Oracle or another database, map fields, transform values, then insert or upsert into Salesforce objects.
            CSV and Excel land on the same mapping screen.
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Link href="/import" className="px-3.5 py-2 rounded-lg bg-card border border-line text-sm flex items-center gap-2 hover:bg-paper">
            <Upload size={16} /> Import file
          </Link>
          <Link href="/pipelines/new" className="px-3.5 py-2 rounded-lg bg-forest text-white text-sm flex items-center gap-2 hover:opacity-90">
            New pipeline <ArrowRight size={16} />
          </Link>
        </div>
      </div>

      {error && <p className="text-err text-sm">{error}</p>}

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          ["Connectors", stats?.connectors ?? "—"],
          ["Pipelines", stats?.pipelines ?? "—"],
          ["Rows loaded", stats?.loaded ?? "—"],
          ["Failed rows", stats?.failed ?? "—"],
        ].map(([label, value]) => (
          <div key={label} className="bg-card border border-line rounded-2xl p-4 shadow-[0_1px_0_rgba(17,17,19,0.03)]">
            <div className="text-[11px] text-ink-soft">{label}</div>
            <div className="text-[1.75rem] tracking-tight mt-1.5">{value}</div>
          </div>
        ))}
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-[1.3fr_0.7fr] gap-6">
        <div className="bg-card border border-line rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl">Ready pipelines</h2>
            <Link href="/pipelines" className="text-sm text-forest">View all</Link>
          </div>
          <div className="divide-y divide-line">
            {pipelines.map((pipe) => (
              <div key={pipe.id} className="py-3 flex items-center justify-between gap-4">
                <div>
                  <Link href={`/pipelines/${pipe.id}`} className="font-medium hover:underline">
                    {pipe.name}
                  </Link>
                  <div className="text-sm text-ink-soft mt-1">{pipe.description}</div>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={pipe.status} />
                  <Link href={`/pipelines/${pipe.id}`} className="text-sm text-forest flex items-center gap-1">
                    <Play size={14} /> Open
                  </Link>
                </div>
              </div>
            ))}
            {!pipelines.length && <p className="text-sm text-ink-soft py-6">No pipelines yet.</p>}
          </div>
        </div>
        <div className="bg-ink text-[#ececef] rounded-2xl p-5">
          <h2 className="text-lg text-white tracking-tight">What this version covers</h2>
          <ul className="mt-4 space-y-3 text-sm leading-6 text-[#b8b8c0]">
            <li>Salesforce connector (username/password or demo org)</li>
            <li>Oracle, Postgres, and MySQL sources, plus CSV/Excel</li>
            <li>Field mapping with auto-map, lookups, and date/number transforms</li>
            <li>Insert, update, upsert, dry-run, and row-level errors</li>
          </ul>
        </div>
      </section>

      <section className="bg-card border border-line rounded-xl p-5">
        <h2 className="text-xl mb-4">Recent jobs</h2>
        <table className="w-full text-sm">
          <thead className="text-left text-ink-soft text-xs uppercase tracking-wider">
            <tr>
              <th className="py-2">Job</th>
              <th>Kind</th>
              <th>Status</th>
              <th>Loaded</th>
              <th>Failed</th>
            </tr>
          </thead>
          <tbody>
            {jobs.map((job) => (
              <tr key={job.id} className="border-t border-line">
                <td className="py-2">
                  <Link href={`/jobs/${job.id}`} className="mono text-xs hover:underline">{job.id}</Link>
                </td>
                <td>{job.kind.replace("_", " ")}</td>
                <td><StatusBadge status={job.status} /></td>
                <td>{job.loaded}</td>
                <td>{job.failed}</td>
              </tr>
            ))}
            {!jobs.length && (
              <tr>
                <td colSpan={5} className="py-6 text-ink-soft">Run a pipeline or file import to see history here.</td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
