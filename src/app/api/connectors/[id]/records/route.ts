import { store } from "@/lib/db";
import { fail, json } from "@/lib/http";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const url = new URL(request.url);
  const objectName = url.searchParams.get("object") || undefined;
  const connector = store.getConnector(id);
  if (!connector) return fail("Connector not found.", 404);
  return json({ records: store.listLoadedRecords(id, objectName) });
}
