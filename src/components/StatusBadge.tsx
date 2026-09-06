export function StatusBadge({ status }: { status: string }) {
  const tone: Record<string, string> = {
    connected: "bg-chip text-ok",
    success: "bg-chip text-ok",
    ready: "bg-chip text-ok",
    running: "bg-[#fff6e5] text-warn",
    queued: "bg-[#fff6e5] text-warn",
    partial: "bg-[#fff6e5] text-warn",
    untested: "bg-paper-2 text-ink-soft",
    draft: "bg-paper-2 text-ink-soft",
    error: "bg-[#fef3f2] text-err",
    failed: "bg-[#fef3f2] text-err",
    archived: "bg-paper-2 text-ink-soft",
  };
  return (
    <span className={`mono text-[10px] uppercase tracking-[0.08em] px-2 py-0.5 rounded-full ${tone[status] || "bg-paper-2"}`}>
      {status}
    </span>
  );
}
