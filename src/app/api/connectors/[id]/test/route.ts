import { openConnector, publicConnector, store } from "@/lib/db";
import { fail, json } from "@/lib/http";
import { nowIso } from "@/lib/ids";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const connector = store.getConnector(id);
  if (!connector) return fail("Connector not found.", 404);
  try {
    const client = openConnector(connector);
    const result = await client.test();
    const updated = store.updateConnector(id, {
      status: result.ok ? "connected" : "error",
      lastTestedAt: nowIso(),
      lastError: result.ok ? null : result.message,
    });
    return json({ result, connector: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Connection failed.";
    const updated = store.updateConnector(id, {
      status: "error",
      lastTestedAt: nowIso(),
      lastError: message,
    });
    return json({ result: { ok: false, message }, connector: updated || publicConnector(connector) });
  }
}
