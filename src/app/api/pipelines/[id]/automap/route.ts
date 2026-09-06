import { openConnector, store } from "@/lib/db";
import { autoMapFields } from "@/lib/etl/automap";
import { extractSource } from "@/lib/etl/run";
import { fail, json } from "@/lib/http";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const pipeline = store.getPipeline(id);
  if (!pipeline) return fail("Pipeline not found.", 404);
  try {
    const extracted = await extractSource(pipeline.sourceConnectorId, {
      ...pipeline.sourceConfig,
      limit: 1,
    });
    const dest = store.getConnector(pipeline.destConnectorId);
    if (!dest) return fail("Destination connector not found.", 404);
    const described = await openConnector(dest).describe(pipeline.destConfig.object);
    const fieldMappings = autoMapFields(extracted.fields, described.fields);
    const updated = store.updatePipeline(id, { fieldMappings, status: fieldMappings.length ? "ready" : "draft" });
    return json({ pipeline: updated, fieldMappings });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Auto-map failed.", 400);
  }
}
