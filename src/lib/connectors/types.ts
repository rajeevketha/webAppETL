import type { ConnectorRecord, Row, SchemaField, SchemaObject } from "@/lib/types";

export type ExtractOptions = {
  table?: string;
  object?: string;
  query?: string;
  limit?: number;
};

export type LoadResult = {
  loaded: number;
  failed: number;
  skipped: number;
  errors: { rowIndex: number; message: string; payload?: Row }[];
  ids: string[];
};

export interface SystemConnector {
  test(): Promise<{ ok: boolean; message: string }>;
  listObjects(): Promise<{ name: string; label: string }[]>;
  describe(name: string): Promise<SchemaObject>;
  extract(options: ExtractOptions): Promise<{ fields: SchemaField[]; rows: Row[] }>;
  load?(
    objectName: string,
    rows: Row[],
    options: {
      operation: "insert" | "update" | "upsert" | "delete";
      externalIdField?: string;
      batchSize: number;
      errorPolicy: "stop" | "skip" | "collect";
      dryRun?: boolean;
    },
  ): Promise<LoadResult>;
}

export type ConnectorFactory = (record: ConnectorRecord) => SystemConnector;
