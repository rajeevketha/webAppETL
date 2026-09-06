import { store } from "@/lib/db";
import { runPipeline } from "@/lib/etl/run";
import { fail, json, readJson } from "@/lib/http";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const pipeline = store.getPipeline(id);
  if (!pipeline) return fail("Pipeline not found.", 404);
  const body = await readJson<{ dryRun?: boolean }>(request).catch(() => ({ dryRun: false }));
  const job = await runPipeline(pipeline, Boolean(body.dryRun));
  return json({ job });
}
