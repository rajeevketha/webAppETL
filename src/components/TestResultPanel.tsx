import Link from "next/link";
import { StatusBadge } from "@/components/StatusBadge";
import type { JobErrorRecord, JobRecord } from "@/lib/types";

export function isTestJob(job: JobRecord) {
  return Boolean(job.message?.startsWith("Test"));
}

export function TestResultPanel({
  job,
  errors,
  object,
}: {
  job: JobRecord;
  errors: JobErrorRecord[];
  object: string;
}) {
  const passed = job.status === "success";

  return (
    <div
      id="test-result"
      className={`border rounded-xl p-4 bg-card ${passed ? "border-line" : "border-err/40"}`}
    >
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
        <div>
          <h2 className="text-lg">Test result</h2>
          <p className="text-sm text-ink-soft mt-1">
            Nothing was written to {object}. This checks mappings, required fields, emails, and picklist values.
          </p>
          {job.message && <p className="text-sm mt-2">{job.message}</p>}
        </div>
        <StatusBadge status={job.status} />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
        <Stat label="Source rows tested" value={job.extracted} />
        <Stat label="Would load" value={job.loaded} />
        <Stat label="Would fail" value={job.failed} />
        <Stat label="Skipped" value={job.skipped} />
      </div>
      <div className="mt-4">
        <h3 className="text-sm font-medium mb-2">Row issues</h3>
        {!errors.length && (
          <p className="text-sm text-ink-soft">No row-level issues. You can run the load when ready.</p>
        )}
        {errors.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-[11px] uppercase tracking-wider text-ink-soft">
                <tr>
                  <th className="py-1 pr-3">Row</th>
                  <th>Message</th>
                </tr>
              </thead>
              <tbody>
                {errors.slice(0, 20).map((item) => (
                  <tr key={item.id} className="border-t border-line">
                    <td className="py-1.5 pr-3 mono text-xs">{item.rowIndex ?? "—"}</td>
                    <td className={item.message.startsWith("Warning") ? "text-warn" : "text-err"}>{item.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {errors.length > 20 && (
              <p className="text-xs text-ink-soft mt-2">Showing 20 of {errors.length} issues.</p>
            )}
          </div>
        )}
      </div>
      <div className="mt-3">
        <Link href={`/jobs/${job.id}`} className="text-sm text-forest">Open full job record</Link>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-paper rounded-lg px-3 py-2">
      <div className="text-[11px] uppercase tracking-wider text-ink-soft">{label}</div>
      <div className="text-xl tracking-tight mt-0.5">{value}</div>
    </div>
  );
}
