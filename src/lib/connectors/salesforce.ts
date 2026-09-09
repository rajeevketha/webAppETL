import { SALESFORCE_OBJECTS, salesforceObject } from "@/lib/connectors/demo-data";
import type { ConnectorFactory, ExtractOptions, LoadResult, SystemConnector } from "@/lib/connectors/types";
import { id } from "@/lib/ids";
import type { Row, SalesforceConfig } from "@/lib/types";

const API_VERSION = "61.0";

type Session = {
  instanceUrl: string;
  accessToken: string;
  apiVersion: string;
};

async function login(config: SalesforceConfig): Promise<Session> {
  if (config.instanceUrl && config.accessToken) {
    return {
      instanceUrl: config.instanceUrl.replace(/\/$/, ""),
      accessToken: config.accessToken,
      apiVersion: config.apiVersion || API_VERSION,
    };
  }

  const loginUrl = (config.loginUrl || "https://login.salesforce.com").replace(/\/$/, "");
  const password = `${config.password || ""}${config.securityToken || ""}`;
  const body = new URLSearchParams({
    grant_type: "password",
    username: config.username || "",
    password,
    client_id: config.clientId || "3MVG9placeholder",
    client_secret: config.clientSecret || "",
  });

  const res = await fetch(`${loginUrl}/services/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const json = (await res.json()) as {
    access_token?: string;
    instance_url?: string;
    error_description?: string;
    error?: string;
  };
  if (!res.ok || !json.access_token || !json.instance_url) {
    throw new Error(json.error_description || json.error || "Salesforce login failed.");
  }
  return {
    instanceUrl: json.instance_url,
    accessToken: json.access_token,
    apiVersion: config.apiVersion || API_VERSION,
  };
}

async function sfFetch(session: Session, path: string, init?: RequestInit) {
  const res = await fetch(`${session.instanceUrl}/services/data/v${session.apiVersion}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${session.accessToken}`,
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });
  const text = await res.text();
  const json = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const message = Array.isArray(json)
      ? json.map((e: { message?: string }) => e.message).filter(Boolean).join("; ")
      : json?.message || `Salesforce API ${res.status}`;
    throw new Error(message);
  }
  return json;
}

function chunk<T>(items: T[], size: number) {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

class DemoSalesforce implements SystemConnector {
  constructor(private persist: (objectName: string, rows: Row[], ids: string[]) => void) {}

  async test() {
    return { ok: true, message: "Connected to Flowline demo Salesforce (sandbox metadata)." };
  }

  async listObjects() {
    return SALESFORCE_OBJECTS.map((o) => ({ name: o.name, label: o.label }));
  }

  async describe(name: string) {
    const object = salesforceObject(name);
    if (!object) throw new Error(`Unknown Salesforce object: ${name}`);
    return object;
  }

  async extract(options: ExtractOptions) {
    const object = await this.describe(options.object || options.table || "Account");
    return { fields: object.fields, rows: [] };
  }

  async load(
    objectName: string,
    rows: Row[],
    options: {
      operation: "insert" | "update" | "upsert" | "delete";
      externalIdField?: string;
      batchSize: number;
      errorPolicy: "stop" | "skip" | "collect";
      dryRun?: boolean;
    },
  ): Promise<LoadResult> {
    const object = await this.describe(objectName);
    const required = object.fields.filter((f) => f.required).map((f) => f.name);
    const errors: LoadResult["errors"] = [];
    const ids: string[] = [];
    const accepted: Row[] = [];

    rows.forEach((row, rowIndex) => {
      for (const field of required) {
        const value = row[field];
        if (value === null || value === undefined || String(value).trim() === "") {
          errors.push({ rowIndex, message: `Missing required field ${field}`, payload: row });
          return;
        }
      }
      if (options.dryRun) {
        accepted.push(row);
        ids.push(`dry_${rowIndex + 1}`);
        return;
      }
      const sfId = String(row.Id || id("001"));
      accepted.push({ ...row, Id: sfId });
      ids.push(sfId);
    });

    if (!options.dryRun) this.persist(objectName, accepted, ids);

    return {
      loaded: accepted.length,
      failed: errors.length,
      skipped: 0,
      errors,
      ids,
    };
  }
}

class LiveSalesforce implements SystemConnector {
  constructor(private config: SalesforceConfig) {}

  private session: Session | null = null;

  private async sessionOrLogin() {
    if (!this.session) this.session = await login(this.config);
    return this.session;
  }

  async test() {
    const session = await this.sessionOrLogin();
    await sfFetch(session, "/sobjects");
    return { ok: true, message: `Connected to ${session.instanceUrl}` };
  }

  async listObjects() {
    const session = await this.sessionOrLogin();
    const data = (await sfFetch(session, "/sobjects")) as {
      sobjects: { name: string; label: string; createable: boolean }[];
    };
    return data.sobjects
      .filter((o) => o.createable)
      .map((o) => ({ name: o.name, label: o.label }))
      .slice(0, 250);
  }

  async describe(name: string) {
    const session = await this.sessionOrLogin();
    const data = (await sfFetch(session, `/sobjects/${name}/describe`)) as {
      name: string;
      label: string;
      fields: {
        name: string;
        label: string;
        type: string;
        nillable: boolean;
        createable: boolean;
        updateable: boolean;
        externalId: boolean;
        length: number;
        picklistValues?: { active: boolean; value: string }[];
        referenceTo?: string[];
      }[];
    };
    return {
      name: data.name,
      label: data.label,
      fields: data.fields.map((field) => ({
        name: field.name,
        label: field.label,
        type: (field.type || "string") as "string",
        required: !field.nillable && field.createable,
        createable: field.createable,
        updateable: field.updateable,
        externalId: field.externalId,
        length: field.length,
        picklistValues: field.picklistValues?.filter((v) => v.active).map((v) => v.value),
        referenceTo: field.referenceTo,
      })),
    };
  }

  async extract(options: ExtractOptions) {
    const session = await this.sessionOrLogin();
    const objectName = options.object || options.table;
    if (!objectName) throw new Error("Choose a Salesforce object.");
    const described = await this.describe(objectName);
    const fields = described.fields.filter((f) => f.name !== "Id").slice(0, 30).map((f) => f.name);
    const soql = options.query
      || `SELECT ${["Id", ...fields].join(",")} FROM ${objectName} LIMIT ${options.limit || 50}`;
    const data = (await sfFetch(session, `/query?q=${encodeURIComponent(soql)}`)) as {
      records: Row[];
    };
    return {
      fields: described.fields,
      rows: (data.records || []).map((row) => {
        const copy = { ...row };
        delete copy.attributes;
        return copy;
      }),
    };
  }

  async load(
    objectName: string,
    rows: Row[],
    options: {
      operation: "insert" | "update" | "upsert" | "delete";
      externalIdField?: string;
      batchSize: number;
      errorPolicy: "stop" | "skip" | "collect";
      dryRun?: boolean;
    },
  ): Promise<LoadResult> {
    if (options.dryRun) {
      const object = await this.describe(objectName);
      const required = object.fields.filter((f) => f.required).map((f) => f.name);
      const errors: LoadResult["errors"] = [];
      let loaded = 0;
      rows.forEach((row, rowIndex) => {
        const missing = required.find((field) => {
          const value = row[field];
          return value === null || value === undefined || String(value).trim() === "";
        });
        if (missing) {
          errors.push({ rowIndex, message: `Missing required field ${missing}`, payload: row });
          return;
        }
        loaded += 1;
      });
      return { loaded, failed: errors.length, skipped: 0, errors, ids: [] };
    }
    const session = await this.sessionOrLogin();
    const errors: LoadResult["errors"] = [];
    const ids: string[] = [];
    let loaded = 0;
    const batches = chunk(rows, Math.min(options.batchSize || 200, 200));

    for (const [batchIndex, batch] of batches.entries()) {
      if (options.operation === "upsert" && options.externalIdField) {
        for (const [i, row] of batch.entries()) {
          const ext = row[options.externalIdField];
          if (!ext) {
            errors.push({ rowIndex: batchIndex * (options.batchSize || 200) + i, message: "Missing external id", payload: row });
            continue;
          }
          const path = `/sobjects/${objectName}/${options.externalIdField}/${encodeURIComponent(String(ext))}`;
          const body = { ...row };
          delete body[options.externalIdField];
          try {
            const result = (await sfFetch(session, path, {
              method: "PATCH",
              body: JSON.stringify(body),
            })) as { id?: string } | null;
            loaded += 1;
            if (result?.id) ids.push(result.id);
          } catch (error) {
            errors.push({
              rowIndex: batchIndex * (options.batchSize || 200) + i,
              message: error instanceof Error ? error.message : "Upsert failed",
              payload: row,
            });
            if (options.errorPolicy === "stop") break;
          }
        }
        continue;
      }

      const result = (await sfFetch(session, "/composite/sobjects", {
        method: "POST",
        body: JSON.stringify({
          allOrNone: options.errorPolicy === "stop",
          records: batch.map((row) => ({
            attributes: { type: objectName },
            ...row,
          })),
        }),
      })) as { success?: boolean; id?: string; errors?: { message: string }[] }[];

      result.forEach((item, i) => {
        const rowIndex = batchIndex * (options.batchSize || 200) + i;
        if (item.success) {
          loaded += 1;
          if (item.id) ids.push(item.id);
        } else {
          errors.push({
            rowIndex,
            message: item.errors?.map((e) => e.message).join("; ") || "Salesforce rejected the row",
            payload: batch[i],
          });
        }
      });
      if (options.errorPolicy === "stop" && errors.length) break;
    }

    return { loaded, failed: errors.length, skipped: 0, errors, ids };
  }
}

export const createSalesforceConnector: ConnectorFactory = (record) => {
  if (record.environment === "demo") {
    return new DemoSalesforce(() => undefined);
  }
  return new LiveSalesforce(record.config as SalesforceConfig);
};

export function createDemoSalesforce(persist: (objectName: string, rows: Row[], ids: string[]) => void) {
  return new DemoSalesforce(persist);
}
