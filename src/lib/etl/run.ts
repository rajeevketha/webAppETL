import { readFile } from "node:fs/promises";
import { fieldsFromColumns, parseTabularFile } from "@/lib/connectors/file";
import { openConnector, store } from "@/lib/db";
import { formatLoadMessage } from "@/lib/etl/messages";
import { mapRows } from "@/lib/etl/transform";
import { validateMappings, validateRows } from "@/lib/etl/validate";
import { nowIso } from "@/lib/ids";
import type { DestConfig, FieldMapping, JobStatus, PipelineRecord, SourceConfig } from "@/lib/types";

export async function extractSource(sourceConnectorId: string, sourceConfig: SourceConfig) {
  if (sourceConfig.mode === "file" || sourceConfig.uploadId) {
    const upload = store.getUpload(sourceConfig.uploadId || "");
    if (!upload) throw new Error("Upload not found. Import a CSV or Excel file first.");
    const buffer = await readFile(upload.storedPath);
    const parsed = await parseTabularFile(buffer, upload.filename);
    const rows = parsed.rows.slice(0, sourceConfig.limit || parsed.rows.length);
    return { fields: fieldsFromColumns(parsed.columns), rows, label: upload.filename };
  }

  const connector = store.getConnector(sourceConnectorId);
  if (!connector) throw new Error("Source connector not found.");
  const client = openConnector(connector);
  const extracted = await client.extract({
    table: sourceConfig.table,
    object: sourceConfig.object,
    query: sourceConfig.query,
    limit: sourceConfig.limit,
  });
  return { ...extracted, label: sourceConfig.table || sourceConfig.object || connector.name };
}

export async function previewPipeline(pipeline: PipelineRecord, limit = 8) {
  const extracted = await extractSource(pipeline.sourceConnectorId, {
    ...pipeline.sourceConfig,
    limit,
  });
  const mapped = mapRows(extracted.rows, pipeline.fieldMappings);
  const dest = store.getConnector(pipeline.destConnectorId);
  if (!dest) throw new Error("Destination connector not found.");
  const destClient = openConnector(dest);
  const described = await destClient.describe(pipeline.destConfig.object);
  const mappingIssues = validateMappings(
    pipeline.fieldMappings,
    described.fields,
    pipeline.destConfig.operation,
  );
  const rowIssues = validateRows(mapped, described.fields);
  return {
    sourceLabel: extracted.label,
    sourceFields: extracted.fields,
    sourceRows: extracted.rows,
    mappedRows: mapped,
    target: described,
    mappingIssues,
    rowIssues,
  };
}

export async function runLoad(input: {
  pipelineId?: string | null;
  kind: "pipeline" | "file_import";
  sourceConnectorId: string;
  destConnectorId: string;
  sourceConfig: SourceConfig;
  destConfig: DestConfig;
  fieldMappings: FieldMapping[];
}) {
  const job = store.createJob({
    pipelineId: input.pipelineId || null,
    kind: input.kind,
    status: "running",
    startedAt: nowIso(),
    finishedAt: null,
    extracted: 0,
    loaded: 0,
    failed: 0,
    skipped: 0,
    message: null,
  });

  try {
    const extracted = await extractSource(input.sourceConnectorId, input.sourceConfig);
    const mapped = mapRows(extracted.rows, input.fieldMappings);
    const dest = store.getConnector(input.destConnectorId);
    if (!dest) throw new Error("Destination connector not found.");
    const destClient = openConnector(dest);
    if (!destClient.load) throw new Error("This destination cannot load records.");

    const described = await destClient.describe(input.destConfig.object);
    const mappingIssues = validateMappings(
      input.fieldMappings,
      described.fields,
      input.destConfig.operation,
    );
    if (mappingIssues.some((issue) => issue.level === "error")) {
      const message = mappingIssues.find((issue) => issue.level === "error")?.message || "Mapping is not valid.";
      store.addJobErrors(
        mappingIssues.map((issue) => ({
          jobId: job.id,
          rowIndex: issue.rowIndex ?? null,
          message: issue.message,
          payload: issue.field ? { field: issue.field } : null,
        })),
      );
      return store.updateJob(job.id, {
        status: "failed",
        finishedAt: nowIso(),
        extracted: extracted.rows.length,
        message: formatLoadMessage({
          dryRun: Boolean(input.destConfig.dryRun),
          object: input.destConfig.object,
          status: "failed",
          loaded: 0,
          failed: extracted.rows.length,
          detail: message,
        }),
      });
    }

    const result = await destClient.load(input.destConfig.object, mapped, input.destConfig);

    if (input.destConfig.dryRun) {
      for (const issue of validateRows(mapped, described.fields)) {
        const exists = result.errors.some((err) => err.rowIndex === issue.rowIndex && err.message === issue.message);
        if (exists) continue;
        result.errors.push({
          rowIndex: issue.rowIndex ?? 0,
          message: issue.level === "warning" ? `Warning: ${issue.message}` : issue.message,
          payload: issue.rowIndex != null ? mapped[issue.rowIndex] : undefined,
        });
        if (issue.level === "error") {
          result.failed += 1;
          result.loaded = Math.max(0, result.loaded - 1);
        }
      }
    }

    if (dest.environment === "demo" && dest.type === "salesforce" && !input.destConfig.dryRun) {
      const accepted = mapped.filter((_, index) => !result.errors.some((err) => err.rowIndex === index));
      store.saveLoadedRecords(dest.id, input.destConfig.object, accepted, result.ids, job.id);
    }

    if (result.errors.length) {
      store.addJobErrors(
        result.errors.map((err) => ({
          jobId: job.id,
          rowIndex: err.rowIndex,
          message: err.message,
          payload: err.payload || null,
        })),
      );
    }

    const status: JobStatus =
      result.failed === 0 ? "success" : result.loaded > 0 ? "partial" : "failed";
    return store.updateJob(job.id, {
      status,
      finishedAt: nowIso(),
      extracted: extracted.rows.length,
      loaded: result.loaded,
      failed: result.failed,
      skipped: result.skipped,
      message: formatLoadMessage({
        dryRun: Boolean(input.destConfig.dryRun),
        object: input.destConfig.object,
        status,
        loaded: result.loaded,
        failed: result.failed,
      }),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Job failed.";
    return store.updateJob(job.id, {
      status: "failed",
      finishedAt: nowIso(),
      message: input.destConfig.dryRun ? `Test failed: ${message}` : message,
    });
  }
}

export async function runPipeline(pipeline: PipelineRecord, dryRun = false) {
  return runLoad({
    pipelineId: pipeline.id,
    kind: "pipeline",
    sourceConnectorId: pipeline.sourceConnectorId,
    destConnectorId: pipeline.destConnectorId,
    sourceConfig: pipeline.sourceConfig,
    destConfig: { ...pipeline.destConfig, dryRun },
    fieldMappings: pipeline.fieldMappings,
  });
}
