import { store } from "@/lib/db";
import { json } from "@/lib/http";

export async function GET() {
  return json({ jobs: store.listJobs() });
}
