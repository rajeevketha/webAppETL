import { store } from "@/lib/db";
import { fail, json } from "@/lib/http";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const upload = store.getUpload(id);
  if (!upload) return fail("Upload not found.", 404);
  return json(upload);
}
