import { store } from "@/lib/db";
import { fail, json, readJson } from "@/lib/http";
import type { ConnectorRecord, ConnectorType } from "@/lib/types";

export async function GET() {
  return json({ connectors: store.listConnectors() });
}

export async function POST(request: Request) {
  const body = await readJson<{
    name: string;
    type: ConnectorType;
    environment?: ConnectorRecord["environment"];
    config?: Record<string, unknown>;
  }>(request);
  if (!body.name?.trim() || !body.type) return fail("Name and type are required.");
  const connector = store.createConnector({
    name: body.name.trim(),
    type: body.type,
    environment: body.environment || (body.type === "salesforce" ? "sandbox" : "production"),
    config: body.config || {},
  });
  return json({ connector }, 201);
}
