import { store } from "@/lib/db";
import { fail, json } from "@/lib/http";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const job = store.getJob(id);
  if (!job) return fail("Job not found.", 404);
  return json({ job, errors: store.listJobErrors(id) });
}
