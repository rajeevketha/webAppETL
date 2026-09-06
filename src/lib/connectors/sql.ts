import { ORACLE_TABLES, oracleTable } from "@/lib/connectors/demo-data";
import type { ConnectorFactory, ExtractOptions, SystemConnector } from "@/lib/connectors/types";
import type { Row, SchemaField, SqlConfig } from "@/lib/types";

class DemoOracle implements SystemConnector {
  async test() {
    return { ok: true, message: "Connected to Flowline demo Oracle (CRM schema)." };
  }

  async listObjects() {
    return ORACLE_TABLES.map((table) => ({ name: table.name, label: table.label }));
  }

  async describe(name: string) {
    const table = oracleTable(name);
    if (!table) throw new Error(`Unknown table ${name}`);
    return { name: table.name, label: table.label, fields: table.fields };
  }

  async extract(options: ExtractOptions) {
    const name = options.table || options.object || "CUSTOMERS";
    const table = oracleTable(name);
    if (!table) throw new Error(`Unknown table ${name}`);
    const rows = table.rows.slice(0, options.limit || table.rows.length);
    return { fields: table.fields, rows };
  }
}

function quoteIdent(name: string) {
  if (!name) return "";
  return name
    .split(".")
    .map((part) => `"${part.replace(/"/g, "\"\"")}"`)
    .join(".");
}

async function postgresExtract(config: SqlConfig, options: ExtractOptions) {
  const pg = await import("pg");
  const client = new pg.Client({
    host: config.host,
    port: config.port || 5432,
    database: config.database,
    user: config.username,
    password: config.password,
    ssl: config.ssl ? { rejectUnauthorized: false } : undefined,
  });
  await client.connect();
  try {
    if (options.query) {
      const result = await client.query(options.query);
      const fields: SchemaField[] = result.fields.map((field) => ({
        name: field.name,
        label: field.name,
        type: "string",
      }));
      return { fields, rows: result.rows as Row[] };
    }
    const table = quoteIdent(options.table || options.object || "");
    if (!table) throw new Error("Choose a table.");
    const result = await client.query(`SELECT * FROM ${table} LIMIT $1`, [options.limit || 100]);
    return {
      fields: result.fields.map((field) => ({ name: field.name, label: field.name, type: "string" as const })),
      rows: result.rows as Row[],
    };
  } finally {
    await client.end();
  }
}

async function postgresList(config: SqlConfig) {
  const pg = await import("pg");
  const client = new pg.Client({
    host: config.host,
    port: config.port || 5432,
    database: config.database,
    user: config.username,
    password: config.password,
    ssl: config.ssl ? { rejectUnauthorized: false } : undefined,
  });
  await client.connect();
  try {
    const schema = config.schema || "public";
    const result = await client.query(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = $1 ORDER BY table_name`,
      [schema],
    );
    return result.rows.map((row: { table_name: string }) => ({
      name: row.table_name,
      label: `${schema}.${row.table_name}`,
    }));
  } finally {
    await client.end();
  }
}

async function mysqlExtract(config: SqlConfig, options: ExtractOptions) {
  const mysql = await import("mysql2/promise");
  const conn = await mysql.createConnection({
    host: config.host,
    port: config.port || 3306,
    database: config.database,
    user: config.username,
    password: config.password,
  });
  try {
    const sql = options.query || `SELECT * FROM ?? LIMIT ?`;
    const [rows, fields] = options.query
      ? await conn.query(sql)
      : await conn.query(sql, [options.table || options.object, options.limit || 100]);
    const cols = (fields as { name: string }[] | undefined)?.map((field) => ({
      name: field.name,
      label: field.name,
      type: "string" as const,
    })) ?? Object.keys(((rows as Row[])[0] || {})).map((name) => ({ name, label: name, type: "string" as const }));
    return { fields: cols, rows: rows as Row[] };
  } finally {
    await conn.end();
  }
}

async function mysqlList(config: SqlConfig) {
  const mysql = await import("mysql2/promise");
  const conn = await mysql.createConnection({
    host: config.host,
    port: config.port || 3306,
    database: config.database,
    user: config.username,
    password: config.password,
  });
  try {
    const [rows] = await conn.query(
      `SELECT table_name AS name FROM information_schema.tables WHERE table_schema = ? ORDER BY table_name`,
      [config.database],
    );
    return (rows as { name: string }[]).map((row) => ({ name: row.name, label: row.name }));
  } finally {
    await conn.end();
  }
}

class LiveSql implements SystemConnector {
  constructor(
    private kind: "oracle" | "postgres" | "mysql" | "sqlserver",
    private config: SqlConfig,
  ) {}

  async test() {
    if (this.kind === "postgres") {
      await postgresList(this.config);
      return { ok: true, message: `Connected to Postgres ${this.config.host}` };
    }
    if (this.kind === "mysql") {
      await mysqlList(this.config);
      return { ok: true, message: `Connected to MySQL ${this.config.host}` };
    }
    if (this.kind === "oracle") {
      throw new Error(
        "Live Oracle needs the optional `oracledb` package (thin mode). Use the seeded demo Oracle connector, or install oracledb and wire host/service name.",
      );
    }
    throw new Error("SQL Server connector is stubbed. Use Oracle, Postgres, MySQL, or a CSV/Excel file for now.");
  }

  async listObjects() {
    if (this.kind === "postgres") return postgresList(this.config);
    if (this.kind === "mysql") return mysqlList(this.config);
    throw new Error("Listing tables requires a live database driver for this connector type.");
  }

  async describe(name: string) {
    const extracted = await this.extract({ table: name, limit: 1 });
    return { name, label: name, fields: extracted.fields };
  }

  async extract(options: ExtractOptions) {
    if (this.kind === "postgres") return postgresExtract(this.config, options);
    if (this.kind === "mysql") return mysqlExtract(this.config, options);
    throw new Error("Extract is not available for this database type yet.");
  }
}

export const createSqlConnector: ConnectorFactory = (record) => {
  if (record.type === "oracle" && record.environment === "demo") {
    return new DemoOracle();
  }
  return new LiveSql(record.type as "oracle" | "postgres" | "mysql" | "sqlserver", record.config as SqlConfig);
};

export function createDemoOracle() {
  return new DemoOracle();
}
