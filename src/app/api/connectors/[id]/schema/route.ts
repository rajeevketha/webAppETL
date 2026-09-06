import { openConnector, store } from "@/lib/db";
import { fail, json } from "@/lib/http";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const connector = store.getConnector(id);
  if (!connector) return fail("Connector not found.", 404);
  const url = new URL(request.url);
  const name = url.searchParams.get("object") || url.searchParams.get("table");
  try {
    const client = openConnector(connector);
    if (name) {
      const described = await client.describe(name);
      const extracted = await client.extract({
        table: name,
        object: name,
        limit: Number(url.searchParams.get("limit") || 8),
      });
      return json({ object: described, preview: extracted.rows });
    }
    const objects = await client.listObjects();
    return json({ objects });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Could not read schema.", 400);
  }
}
