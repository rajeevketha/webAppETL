import { store } from "@/lib/db";
import { fail, json, readJson } from "@/lib/http";
import type { DestConfig, FieldMapping, PipelineStatus, SourceConfig } from "@/lib/types";

export async function GET() {
  return json({ pipelines: store.listPipelines() });
}

export async function POST(request: Request) {
  const body = await readJson<{
    name: string;
    description?: string;
    sourceConnectorId: string;
    destConnectorId: string;
    sourceConfig?: SourceConfig;
    destConfig?: DestConfig;
    fieldMappings?: FieldMapping[];
    status?: PipelineStatus;
  }>(request);
  if (!body.name?.trim() || !body.sourceConnectorId || !body.destConnectorId) {
    return fail("Name, source, and destination are required.");
  }
  const pipeline = store.createPipeline({
    name: body.name.trim(),
    description: body.description || "",
    sourceConnectorId: body.sourceConnectorId,
    destConnectorId: body.destConnectorId,
    sourceConfig: body.sourceConfig || { mode: "table" },
    destConfig: body.destConfig || {
      object: "Account",
      operation: "insert",
      batchSize: 200,
      errorPolicy: "collect",
    },
    fieldMappings: body.fieldMappings || [],
    status: body.status || "draft",
  });
  return json({ pipeline }, 201);
}
