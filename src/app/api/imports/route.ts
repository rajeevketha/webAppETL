import { fieldsFromColumns } from "@/lib/connectors/file";
import { openConnector, store } from "@/lib/db";
import { autoMapFields } from "@/lib/etl/automap";
import { runLoad } from "@/lib/etl/run";
import { fail, json, readJson } from "@/lib/http";
import type { DestConfig, FieldMapping } from "@/lib/types";

export async function POST(request: Request) {
  const body = await readJson<{
    uploadId: string;
    destConnectorId: string;
    destConfig: DestConfig;
    fieldMappings?: FieldMapping[];
    sourceConnectorId?: string;
    dryRun?: boolean;
  }>(request);
  if (!body.uploadId || !body.destConnectorId || !body.destConfig?.object) {
    return fail("Upload, Salesforce connector, and object are required.");
  }
  const upload = store.getUpload(body.uploadId);
  if (!upload) return fail("Upload not found.", 404);
  const dest = store.getConnector(body.destConnectorId);
  if (!dest) return fail("Destination connector not found.", 404);

  let mappings = body.fieldMappings;
  if (!mappings?.length) {
    const described = await openConnector(dest).describe(body.destConfig.object);
    mappings = autoMapFields(fieldsFromColumns(upload.columns), described.fields);
  }

  const fileConnector = store.listConnectors().find((c) => c.type === "file");
  const job = await runLoad({
    pipelineId: null,
    kind: "file_import",
    sourceConnectorId: body.sourceConnectorId || fileConnector?.id || dest.id,
    destConnectorId: body.destConnectorId,
    sourceConfig: { mode: "file", uploadId: body.uploadId },
    destConfig: { ...body.destConfig, dryRun: body.dryRun },
    fieldMappings: mappings,
  });
  return json({ job, fieldMappings: mappings, errors: job ? store.listJobErrors(job.id) : [] });
}
