import { store } from "@/lib/db";
import { previewPipeline } from "@/lib/etl/run";
import { fail, json } from "@/lib/http";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const pipeline = store.getPipeline(id);
  if (!pipeline) return fail("Pipeline not found.", 404);
  const url = new URL(request.url);
  const limit = Number(url.searchParams.get("limit") || 8);
  try {
    const preview = await previewPipeline(pipeline, limit);
    return json({ preview });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Preview failed.", 400);
  }
}
