import { publicConnector, store } from "@/lib/db";
import { fail, json, readJson } from "@/lib/http";
import type { ConnectorRecord } from "@/lib/types";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const connector = store.getConnector(id);
  if (!connector) return fail("Connector not found.", 404);
  return json({ connector: publicConnector(connector) });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await readJson<Partial<ConnectorRecord>>(request);
  const connector = store.updateConnector(id, body);
  if (!connector) return fail("Connector not found.", 404);
  return json({ connector });
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  store.deleteConnector(id);
  return json({ ok: true });
}
