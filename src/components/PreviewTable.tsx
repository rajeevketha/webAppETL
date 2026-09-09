import type { Row } from "@/lib/types";

export function PreviewTable({
  title,
  rows,
  columns,
}: {
  title: string;
  rows: Row[];
  columns?: string[];
}) {
  const cols = columns || Object.keys(rows[0] || {});
  return (
    <div className="bg-card border border-line rounded-xl p-4 overflow-x-auto">
      <h2 className="text-lg mb-3">{title}</h2>
      {cols.length === 0 ? (
        <p className="text-sm text-ink-soft">No rows to preview yet.</p>
      ) : (
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left text-ink-soft">
              {cols.map((col) => (
                <th key={col} className="py-1 pr-3 mono">{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, 8).map((row, i) => (
              <tr key={i} className="border-t border-line">
                {cols.map((col) => (
                  <td key={col} className="py-1 pr-3 whitespace-nowrap max-w-[180px] truncate">
                    {String(row[col] ?? "")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
