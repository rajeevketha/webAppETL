import { store } from "@/lib/db";
import { fail, json, readJson } from "@/lib/http";
import type { PipelineRecord } from "@/lib/types";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const pipeline = store.getPipeline(id);
  if (!pipeline) return fail("Pipeline not found.", 404);
  return json({ pipeline });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await readJson<Partial<PipelineRecord>>(request);
  const pipeline = store.updatePipeline(id, body);
  if (!pipeline) return fail("Pipeline not found.", 404);
  return json({ pipeline });
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  store.deletePipeline(id);
  return json({ ok: true });
}
