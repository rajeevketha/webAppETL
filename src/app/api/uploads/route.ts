import { parseTabularFile, saveUploadFile } from "@/lib/connectors/file";
import { store } from "@/lib/db";
import { fail, json } from "@/lib/http";

export async function POST(request: Request) {
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return fail("Choose a CSV or Excel file.");
  const buffer = Buffer.from(await file.arrayBuffer());
  try {
    const parsed = await parseTabularFile(buffer, file.name);
    const storedPath = await saveUploadFile(file.name, buffer);
    const upload = store.createUpload({
      filename: file.name,
      storedPath,
      mime: file.type || null,
      columns: parsed.columns,
      rowCount: parsed.rows.length,
      preview: parsed.rows.slice(0, 12),
    });
    return json({ upload: { ...upload, sheets: parsed.sheets, sheet: parsed.sheet } }, 201);
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Could not parse file.", 400);
  }
}
