export type ConnectorType =
  | "salesforce"
  | "oracle"
  | "postgres"
  | "mysql"
  | "sqlserver"
  | "file";

export type ConnectorStatus = "untested" | "connected" | "error";

export type LoadOperation = "insert" | "update" | "upsert" | "delete";

export type ErrorPolicy = "stop" | "skip" | "collect";

export type PipelineStatus = "draft" | "ready" | "archived";

export type JobStatus =
  | "queued"
  | "running"
  | "success"
  | "partial"
  | "failed";

export type FieldType =
  | "string"
  | "textarea"
  | "email"
  | "phone"
  | "url"
  | "int"
  | "double"
  | "currency"
  | "boolean"
  | "date"
  | "datetime"
  | "picklist"
  | "id"
  | "reference";

export type TransformOp =
  | { type: "none" }
  | { type: "trim" }
  | { type: "upper" }
  | { type: "lower" }
  | { type: "title" }
  | { type: "date_format"; from?: string; to: string }
  | { type: "replace"; search: string; replace: string }
  | { type: "default"; value: string }
  | { type: "concat"; fields: string[]; separator: string }
  | { type: "substring"; start: number; end?: number }
  | { type: "lookup"; map: Record<string, string>; fallback?: string }
  | { type: "number" }
  | { type: "boolean" }
  | { type: "template"; template: string };

export type FieldMapping = {
  id: string;
  sourceField: string | null;
  targetField: string;
  transform: TransformOp;
  defaultValue?: string;
};

export type SchemaField = {
  name: string;
  label: string;
  type: FieldType;
  required?: boolean;
  createable?: boolean;
  updateable?: boolean;
  externalId?: boolean;
  length?: number;
  picklistValues?: string[];
  referenceTo?: string[];
};

export type SchemaObject = {
  name: string;
  label: string;
  fields: SchemaField[];
};

export type SourceConfig = {
  mode: "table" | "query" | "file";
  table?: string;
  query?: string;
  object?: string;
  uploadId?: string;
  sheet?: string;
  limit?: number;
};

export type DestConfig = {
  object: string;
  operation: LoadOperation;
  externalIdField?: string;
  batchSize: number;
  errorPolicy: ErrorPolicy;
  dryRun?: boolean;
};

export type SalesforceConfig = {
  loginUrl?: string;
  username?: string;
  password?: string;
  securityToken?: string;
  clientId?: string;
  clientSecret?: string;
  instanceUrl?: string;
  accessToken?: string;
  apiVersion?: string;
};

export type SqlConfig = {
  host?: string;
  port?: number;
  database?: string;
  serviceName?: string;
  username?: string;
  password?: string;
  schema?: string;
  ssl?: boolean;
};

export type ConnectorRecord = {
  id: string;
  name: string;
  type: ConnectorType;
  environment: "production" | "sandbox" | "demo";
  config: Record<string, unknown>;
  status: ConnectorStatus;
  lastTestedAt: string | null;
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PipelineRecord = {
  id: string;
  name: string;
  description: string;
  sourceConnectorId: string;
  destConnectorId: string;
  sourceConfig: SourceConfig;
  destConfig: DestConfig;
  fieldMappings: FieldMapping[];
  status: PipelineStatus;
  createdAt: string;
  updatedAt: string;
};

export type JobRecord = {
  id: string;
  pipelineId: string | null;
  kind: "pipeline" | "file_import";
  status: JobStatus;
  startedAt: string | null;
  finishedAt: string | null;
  extracted: number;
  loaded: number;
  failed: number;
  skipped: number;
  message: string | null;
  createdAt: string;
};

export type JobErrorRecord = {
  id: string;
  jobId: string;
  rowIndex: number | null;
  message: string;
  payload: Record<string, unknown> | null;
};

export type UploadRecord = {
  id: string;
  filename: string;
  storedPath: string;
  mime: string | null;
  columns: string[];
  rowCount: number;
  preview: Record<string, unknown>[];
  createdAt: string;
};

export type Row = Record<string, unknown>;
