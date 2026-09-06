import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { createDemoSalesforce, createSalesforceConnector } from "@/lib/connectors/salesforce";
import { createDemoOracle, createSqlConnector } from "@/lib/connectors/sql";
import type { SystemConnector } from "@/lib/connectors/types";
import { defaultLookupFor } from "@/lib/etl/automap";
import { id, nowIso } from "@/lib/ids";
import { maskConfig, mergeConfig } from "@/lib/secrets";
import type {
  ConnectorRecord,
  ConnectorType,
  DestConfig,
  FieldMapping,
  JobErrorRecord,
  JobRecord,
  PipelineRecord,
  Row,
  SourceConfig,
  UploadRecord,
} from "@/lib/types";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "flowline.db");

let db: Database.Database | null = null;

function getDb() {
  if (db) return db;
  fs.mkdirSync(DATA_DIR, { recursive: true });
  db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  migrate(db);
  seedIfEmpty(db);
  return db;
}

function migrate(database: Database.Database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS connectors (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      environment TEXT NOT NULL,
      config TEXT NOT NULL,
      status TEXT NOT NULL,
      last_tested_at TEXT,
      last_error TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS pipelines (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      source_connector_id TEXT NOT NULL,
      dest_connector_id TEXT NOT NULL,
      source_config TEXT NOT NULL,
      dest_config TEXT NOT NULL,
      field_mappings TEXT NOT NULL,
      status TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS jobs (
      id TEXT PRIMARY KEY,
      pipeline_id TEXT,
      kind TEXT NOT NULL,
      status TEXT NOT NULL,
      started_at TEXT,
      finished_at TEXT,
      extracted INTEGER DEFAULT 0,
      loaded INTEGER DEFAULT 0,
      failed INTEGER DEFAULT 0,
      skipped INTEGER DEFAULT 0,
      message TEXT,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS job_errors (
      id TEXT PRIMARY KEY,
      job_id TEXT NOT NULL,
      row_index INTEGER,
      message TEXT NOT NULL,
      payload TEXT
    );
    CREATE TABLE IF NOT EXISTS uploads (
      id TEXT PRIMARY KEY,
      filename TEXT NOT NULL,
      stored_path TEXT NOT NULL,
      mime TEXT,
      columns TEXT NOT NULL,
      row_count INTEGER NOT NULL,
      preview TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS loaded_records (
      id TEXT PRIMARY KEY,
      connector_id TEXT NOT NULL,
      object_name TEXT NOT NULL,
      sf_id TEXT,
      payload TEXT NOT NULL,
      job_id TEXT,
      created_at TEXT NOT NULL
    );
  `);
}

function parseJson<T>(value: string, fallback: T): T {
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function mapConnector(row: Record<string, string>): ConnectorRecord {
  return {
    id: row.id,
    name: row.name,
    type: row.type as ConnectorType,
    environment: row.environment as ConnectorRecord["environment"],
    config: parseJson(row.config, {}),
    status: row.status as ConnectorRecord["status"],
    lastTestedAt: row.last_tested_at,
    lastError: row.last_error,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapPipeline(row: Record<string, string>): PipelineRecord {
  return {
    id: row.id,
    name: row.name,
    description: row.description || "",
    sourceConnectorId: row.source_connector_id,
    destConnectorId: row.dest_connector_id,
    sourceConfig: parseJson(row.source_config, { mode: "table" }),
    destConfig: parseJson(row.dest_config, {
      object: "Account",
      operation: "insert",
      batchSize: 200,
      errorPolicy: "collect",
    }),
    fieldMappings: parseJson(row.field_mappings, []),
    status: row.status as PipelineRecord["status"],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapJob(row: Record<string, unknown>): JobRecord {
  return {
    id: String(row.id),
    pipelineId: (row.pipeline_id as string) || null,
    kind: row.kind as JobRecord["kind"],
    status: row.status as JobRecord["status"],
    startedAt: (row.started_at as string) || null,
    finishedAt: (row.finished_at as string) || null,
    extracted: Number(row.extracted || 0),
    loaded: Number(row.loaded || 0),
    failed: Number(row.failed || 0),
    skipped: Number(row.skipped || 0),
    message: (row.message as string) || null,
    createdAt: String(row.created_at),
  };
}

function seedIfEmpty(database: Database.Database) {
  const count = database.prepare("SELECT COUNT(*) AS n FROM connectors").get() as { n: number };
  if (count.n > 0) return;

  const ts = nowIso();
  const oracleId = id("con");
  const sfId = id("con");
  const fileId = id("con");

  const insertCon = database.prepare(
    `INSERT INTO connectors (id, name, type, environment, config, status, last_tested_at, last_error, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  insertCon.run(oracleId, "Oracle CRM (demo)", "oracle", "demo", JSON.stringify({ schema: "CRM" }), "connected", ts, null, ts, ts);
  insertCon.run(sfId, "Salesforce demo org", "salesforce", "demo", JSON.stringify({ loginUrl: "https://test.salesforce.com" }), "connected", ts, null, ts, ts);
  insertCon.run(fileId, "CSV / Excel files", "file", "demo", JSON.stringify({}), "connected", ts, null, ts, ts);

  const accountMap: FieldMapping[] = [
    { id: id("map"), sourceField: "CUSTOMER_NAME", targetField: "Name", transform: { type: "title" } },
    { id: id("map"), sourceField: "CUSTOMER_NUMBER", targetField: "AccountNumber", transform: { type: "trim" } },
    { id: id("map"), sourceField: "ACCOUNT_TYPE", targetField: "Type", transform: { type: "lookup", map: defaultLookupFor("Type") || {} } },
    { id: id("map"), sourceField: "INDUSTRY", targetField: "Industry", transform: { type: "none" } },
    { id: id("map"), sourceField: "PHONE", targetField: "Phone", transform: { type: "none" } },
    { id: id("map"), sourceField: "WEBSITE", targetField: "Website", transform: { type: "trim" } },
    { id: id("map"), sourceField: "STREET", targetField: "BillingStreet", transform: { type: "none" } },
    { id: id("map"), sourceField: "CITY", targetField: "BillingCity", transform: { type: "none" } },
    { id: id("map"), sourceField: "STATE", targetField: "BillingState", transform: { type: "none" } },
    { id: id("map"), sourceField: "POSTAL_CODE", targetField: "BillingPostalCode", transform: { type: "none" } },
    { id: id("map"), sourceField: "COUNTRY", targetField: "BillingCountry", transform: { type: "lookup", map: defaultLookupFor("BillingCountry") || {} } },
    { id: id("map"), sourceField: "ANNUAL_REVENUE", targetField: "AnnualRevenue", transform: { type: "number" } },
    { id: id("map"), sourceField: "EMPLOYEES", targetField: "NumberOfEmployees", transform: { type: "number" } },
    { id: id("map"), sourceField: "NOTES", targetField: "Description", transform: { type: "trim" } },
    { id: id("map"), sourceField: "RATING", targetField: "Rating", transform: { type: "lookup", map: defaultLookupFor("Rating") || {} } },
    { id: id("map"), sourceField: "CUSTOMER_ID", targetField: "External_Id__c", transform: { type: "none" } },
  ];

  const contactMap: FieldMapping[] = [
    { id: id("map"), sourceField: "FIRST_NAME", targetField: "FirstName", transform: { type: "title" } },
    { id: id("map"), sourceField: "LAST_NAME", targetField: "LastName", transform: { type: "title" } },
    { id: id("map"), sourceField: "EMAIL", targetField: "Email", transform: { type: "lower" } },
    { id: id("map"), sourceField: "PHONE", targetField: "Phone", transform: { type: "none" } },
    { id: id("map"), sourceField: "TITLE", targetField: "Title", transform: { type: "title" } },
    { id: id("map"), sourceField: "DEPARTMENT", targetField: "Department", transform: { type: "none" } },
    { id: id("map"), sourceField: "CITY", targetField: "MailingCity", transform: { type: "none" } },
    { id: id("map"), sourceField: "COUNTRY", targetField: "MailingCountry", transform: { type: "lookup", map: defaultLookupFor("MailingCountry") || {} } },
    { id: id("map"), sourceField: "CONTACT_ID", targetField: "External_Id__c", transform: { type: "none" } },
  ];

  const oppMap: FieldMapping[] = [
    { id: id("map"), sourceField: "OPP_NAME", targetField: "Name", transform: { type: "title" } },
    { id: id("map"), sourceField: "STAGE", targetField: "StageName", transform: { type: "lookup", map: defaultLookupFor("StageName") || {} } },
    { id: id("map"), sourceField: "CLOSE_DATE", targetField: "CloseDate", transform: { type: "date_format", to: "yyyy-MM-dd" } },
    { id: id("map"), sourceField: "AMOUNT", targetField: "Amount", transform: { type: "number" } },
    { id: id("map"), sourceField: "OPP_TYPE", targetField: "Type", transform: { type: "lookup", map: { UPGRADE: "Existing Customer - Upgrade", NEW: "New Customer" } } },
    { id: id("map"), sourceField: "OPP_ID", targetField: "External_Id__c", transform: { type: "none" } },
  ];

  const insertPipeline = database.prepare(
    `INSERT INTO pipelines (id, name, description, source_connector_id, dest_connector_id, source_config, dest_config, field_mappings, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );

  insertPipeline.run(
    id("pipe"),
    "Oracle customers → Salesforce Account",
    "Load CRM.CUSTOMERS into Account with type/rating lookups and upsert on External Id.",
    oracleId,
    sfId,
    JSON.stringify({ mode: "table", table: "CUSTOMERS" } satisfies SourceConfig),
    JSON.stringify({ object: "Account", operation: "upsert", externalIdField: "External_Id__c", batchSize: 200, errorPolicy: "collect" } satisfies DestConfig),
    JSON.stringify(accountMap),
    "ready",
    ts,
    ts,
  );

  insertPipeline.run(
    id("pipe"),
    "Oracle contacts → Salesforce Contact",
    "Person records from CRM.CONTACTS, title-cased names and lowercased emails.",
    oracleId,
    sfId,
    JSON.stringify({ mode: "table", table: "CONTACTS" } satisfies SourceConfig),
    JSON.stringify({ object: "Contact", operation: "upsert", externalIdField: "External_Id__c", batchSize: 200, errorPolicy: "collect" } satisfies DestConfig),
    JSON.stringify(contactMap),
    "ready",
    ts,
    ts,
  );

  insertPipeline.run(
    id("pipe"),
    "Oracle opportunities → Salesforce Opportunity",
    "Oracle date strings converted to Salesforce dates; stages remapped.",
    oracleId,
    sfId,
    JSON.stringify({ mode: "table", table: "OPPORTUNITIES" } satisfies SourceConfig),
    JSON.stringify({ object: "Opportunity", operation: "insert", batchSize: 200, errorPolicy: "collect" } satisfies DestConfig),
    JSON.stringify(oppMap),
    "ready",
    ts,
    ts,
  );
}

export function publicConnector(record: ConnectorRecord) {
  return { ...record, config: maskConfig(record.config) };
}

export const store = {
  listConnectors() {
    return getDb()
      .prepare("SELECT * FROM connectors ORDER BY created_at DESC")
      .all()
      .map((row) => publicConnector(mapConnector(row as Record<string, string>)));
  },
  getConnector(idValue: string) {
    const row = getDb().prepare("SELECT * FROM connectors WHERE id = ?").get(idValue) as Record<string, string> | undefined;
    return row ? mapConnector(row) : null;
  },
  createConnector(input: {
    name: string;
    type: ConnectorType;
    environment: ConnectorRecord["environment"];
    config: Record<string, unknown>;
  }) {
    const record: ConnectorRecord = {
      id: id("con"),
      name: input.name,
      type: input.type,
      environment: input.environment,
      config: input.config,
      status: "untested",
      lastTestedAt: null,
      lastError: null,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    getDb()
      .prepare(
        `INSERT INTO connectors (id, name, type, environment, config, status, last_tested_at, last_error, created_at, updated_at)
         VALUES (@id, @name, @type, @environment, @config, @status, @lastTestedAt, @lastError, @createdAt, @updatedAt)`,
      )
      .run({ ...record, config: JSON.stringify(record.config) });
    return publicConnector(record);
  },
  updateConnector(idValue: string, patch: Partial<ConnectorRecord>) {
    const existing = this.getConnector(idValue);
    if (!existing) return null;
    const next: ConnectorRecord = {
      ...existing,
      ...patch,
      config: patch.config ? mergeConfig(existing.config, patch.config) : existing.config,
      updatedAt: nowIso(),
    };
    getDb()
      .prepare(
        `UPDATE connectors SET name=@name, type=@type, environment=@environment, config=@config, status=@status,
         last_tested_at=@lastTestedAt, last_error=@lastError, updated_at=@updatedAt WHERE id=@id`,
      )
      .run({ ...next, config: JSON.stringify(next.config) });
    return publicConnector(next);
  },
  deleteConnector(idValue: string) {
    getDb().prepare("DELETE FROM connectors WHERE id = ?").run(idValue);
  },
  listPipelines() {
    return getDb()
      .prepare("SELECT * FROM pipelines ORDER BY updated_at DESC")
      .all()
      .map((row) => mapPipeline(row as Record<string, string>));
  },
  getPipeline(idValue: string) {
    const row = getDb().prepare("SELECT * FROM pipelines WHERE id = ?").get(idValue) as Record<string, string> | undefined;
    return row ? mapPipeline(row) : null;
  },
  createPipeline(input: Omit<PipelineRecord, "id" | "createdAt" | "updatedAt">) {
    const record: PipelineRecord = { ...input, id: id("pipe"), createdAt: nowIso(), updatedAt: nowIso() };
    getDb()
      .prepare(
        `INSERT INTO pipelines (id, name, description, source_connector_id, dest_connector_id, source_config, dest_config, field_mappings, status, created_at, updated_at)
         VALUES (@id, @name, @description, @sourceConnectorId, @destConnectorId, @sourceConfig, @destConfig, @fieldMappings, @status, @createdAt, @updatedAt)`,
      )
      .run({
        ...record,
        sourceConfig: JSON.stringify(record.sourceConfig),
        destConfig: JSON.stringify(record.destConfig),
        fieldMappings: JSON.stringify(record.fieldMappings),
      });
    return record;
  },
  updatePipeline(idValue: string, patch: Partial<PipelineRecord>) {
    const existing = this.getPipeline(idValue);
    if (!existing) return null;
    const next = { ...existing, ...patch, updatedAt: nowIso() };
    getDb()
      .prepare(
        `UPDATE pipelines SET name=@name, description=@description, source_connector_id=@sourceConnectorId,
         dest_connector_id=@destConnectorId, source_config=@sourceConfig, dest_config=@destConfig,
         field_mappings=@fieldMappings, status=@status, updated_at=@updatedAt WHERE id=@id`,
      )
      .run({
        ...next,
        sourceConfig: JSON.stringify(next.sourceConfig),
        destConfig: JSON.stringify(next.destConfig),
        fieldMappings: JSON.stringify(next.fieldMappings),
      });
    return next;
  },
  deletePipeline(idValue: string) {
    getDb().prepare("DELETE FROM pipelines WHERE id = ?").run(idValue);
  },
  listJobs() {
    return getDb()
      .prepare("SELECT * FROM jobs ORDER BY created_at DESC LIMIT 100")
      .all()
      .map((row) => mapJob(row as Record<string, unknown>));
  },
  getJob(idValue: string) {
    const row = getDb().prepare("SELECT * FROM jobs WHERE id = ?").get(idValue) as Record<string, unknown> | undefined;
    return row ? mapJob(row) : null;
  },
  createJob(input: Omit<JobRecord, "id" | "createdAt">) {
    const record: JobRecord = { ...input, id: id("job"), createdAt: nowIso() };
    getDb()
      .prepare(
        `INSERT INTO jobs (id, pipeline_id, kind, status, started_at, finished_at, extracted, loaded, failed, skipped, message, created_at)
         VALUES (@id, @pipelineId, @kind, @status, @startedAt, @finishedAt, @extracted, @loaded, @failed, @skipped, @message, @createdAt)`,
      )
      .run(record);
    return record;
  },
  updateJob(idValue: string, patch: Partial<JobRecord>) {
    const existing = this.getJob(idValue);
    if (!existing) return null;
    const next = { ...existing, ...patch };
    getDb()
      .prepare(
        `UPDATE jobs SET status=@status, started_at=@startedAt, finished_at=@finishedAt, extracted=@extracted,
         loaded=@loaded, failed=@failed, skipped=@skipped, message=@message WHERE id=@id`,
      )
      .run(next);
    return next;
  },
  addJobErrors(errors: Omit<JobErrorRecord, "id">[]) {
    const insert = getDb().prepare(
      `INSERT INTO job_errors (id, job_id, row_index, message, payload) VALUES (?, ?, ?, ?, ?)`,
    );
    const tx = getDb().transaction((items: Omit<JobErrorRecord, "id">[]) => {
      for (const item of items) {
        insert.run(id("err"), item.jobId, item.rowIndex, item.message, item.payload ? JSON.stringify(item.payload) : null);
      }
    });
    tx(errors);
  },
  listJobErrors(jobId: string) {
    return getDb()
      .prepare("SELECT * FROM job_errors WHERE job_id = ? ORDER BY row_index ASC")
      .all(jobId)
      .map((row) => {
        const r = row as Record<string, unknown>;
        return {
          id: String(r.id),
          jobId: String(r.job_id),
          rowIndex: r.row_index === null ? null : Number(r.row_index),
          message: String(r.message),
          payload: r.payload ? parseJson(String(r.payload), null) : null,
        } satisfies JobErrorRecord;
      });
  },
  createUpload(input: Omit<UploadRecord, "id" | "createdAt">) {
    const record: UploadRecord = { ...input, id: id("up"), createdAt: nowIso() };
    getDb()
      .prepare(
        `INSERT INTO uploads (id, filename, stored_path, mime, columns, row_count, preview, created_at)
         VALUES (@id, @filename, @storedPath, @mime, @columns, @rowCount, @preview, @createdAt)`,
      )
      .run({
        ...record,
        columns: JSON.stringify(record.columns),
        preview: JSON.stringify(record.preview),
      });
    return record;
  },
  getUpload(idValue: string) {
    const row = getDb().prepare("SELECT * FROM uploads WHERE id = ?").get(idValue) as Record<string, unknown> | undefined;
    if (!row) return null;
    return {
      id: String(row.id),
      filename: String(row.filename),
      storedPath: String(row.stored_path),
      mime: (row.mime as string) || null,
      columns: parseJson(String(row.columns), []),
      rowCount: Number(row.row_count),
      preview: parseJson(String(row.preview), []),
      createdAt: String(row.created_at),
    } satisfies UploadRecord;
  },
  saveLoadedRecords(connectorId: string, objectName: string, rows: Row[], ids: string[], jobId: string) {
    const insert = getDb().prepare(
      `INSERT INTO loaded_records (id, connector_id, object_name, sf_id, payload, job_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    );
    const ts = nowIso();
    const tx = getDb().transaction(() => {
      rows.forEach((row, index) => {
        insert.run(id("rec"), connectorId, objectName, ids[index] || null, JSON.stringify(row), jobId, ts);
      });
    });
    tx();
  },
  listLoadedRecords(connectorId: string, objectName?: string) {
    const rows = objectName
      ? getDb()
          .prepare("SELECT * FROM loaded_records WHERE connector_id = ? AND object_name = ? ORDER BY created_at DESC LIMIT 200")
          .all(connectorId, objectName)
      : getDb()
          .prepare("SELECT * FROM loaded_records WHERE connector_id = ? ORDER BY created_at DESC LIMIT 200")
          .all(connectorId);
    return rows.map((row) => {
      const r = row as Record<string, unknown>;
      return {
        id: String(r.id),
        objectName: String(r.object_name),
        sfId: r.sf_id,
        payload: parseJson(String(r.payload), {}),
        jobId: r.job_id,
        createdAt: String(r.created_at),
      };
    });
  },
  stats() {
    const database = getDb();
    const connectors = (database.prepare("SELECT COUNT(*) AS n FROM connectors").get() as { n: number }).n;
    const pipelines = (database.prepare("SELECT COUNT(*) AS n FROM pipelines").get() as { n: number }).n;
    const jobs = (database.prepare("SELECT COUNT(*) AS n FROM jobs").get() as { n: number }).n;
    const loaded = (database.prepare("SELECT COALESCE(SUM(loaded),0) AS n FROM jobs").get() as { n: number }).n;
    const failed = (database.prepare("SELECT COALESCE(SUM(failed),0) AS n FROM jobs").get() as { n: number }).n;
    return { connectors, pipelines, jobs, loaded, failed };
  },
};

export function openConnector(record: ConnectorRecord): SystemConnector {
  if (record.type === "salesforce") {
    if (record.environment === "demo") {
      return createDemoSalesforce((objectName, rows, ids) => {
        store.saveLoadedRecords(record.id, objectName, rows, ids, "preview");
      });
    }
    return createSalesforceConnector(record);
  }
  if (record.type === "file") {
    return createDemoOracle();
  }
  return createSqlConnector(record);
}
