export function StatusBadge({ status }: { status: string }) {
  const tone: Record<string, string> = {
    connected: "bg-chip text-ok",
    success: "bg-chip text-ok",
    ready: "bg-chip text-ok",
    running: "bg-[#f7ead0] text-warn",
    queued: "bg-[#f7ead0] text-warn",
    partial: "bg-[#f7ead0] text-warn",
    untested: "bg-paper-2 text-ink-soft",
    draft: "bg-paper-2 text-ink-soft",
    error: "bg-[#f8d7df] text-err",
    failed: "bg-[#f8d7df] text-err",
    archived: "bg-paper-2 text-ink-soft",
  };
  return (
    <span className={`mono text-[11px] uppercase tracking-wider px-2 py-0.5 rounded ${tone[status] || "bg-paper-2"}`}>
      {status}
    </span>
  );
}
