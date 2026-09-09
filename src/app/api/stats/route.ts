import { store } from "@/lib/db";
import { json } from "@/lib/http";

export async function GET() {
  return json({ stats: store.stats(), jobs: store.listJobs().slice(0, 8), pipelines: store.listPipelines() });
}
