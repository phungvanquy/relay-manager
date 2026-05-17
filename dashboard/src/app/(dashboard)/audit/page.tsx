"use client";

import { useState, useEffect } from "react";

interface AuditLog {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  details: string | null;
  createdAt: number;
}

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchLogs();
  }, []);

  async function fetchLogs() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/audit?limit=100");
      if (res.ok) setLogs(await res.json());
      else setError("Failed to load audit logs");
    } catch {
      setError("Failed to load audit logs");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-6xl">
      <h2 className="text-2xl font-bold mb-6">Audit Log</h2>

      {loading && (
        <div className="flex items-center justify-center h-64 text-[var(--muted-foreground)]">Loading...</div>
      )}
      {error && (
        <div className="flex flex-col items-center justify-center h-64 gap-3">
          <p className="text-sm text-[var(--destructive)]">{error}</p>
          <button onClick={fetchLogs} className="px-4 py-2 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white rounded-lg text-sm">Retry</button>
        </div>
      )}

      {!loading && !error && (
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-[var(--shadow)] overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] bg-[var(--muted)]">
              <th className="text-left px-5 py-3.5 font-medium text-[var(--muted-foreground)] text-xs uppercase tracking-wider">Time</th>
              <th className="text-left px-5 py-3.5 font-medium text-[var(--muted-foreground)] text-xs uppercase tracking-wider">Action</th>
              <th className="text-left px-5 py-3.5 font-medium text-[var(--muted-foreground)] text-xs uppercase tracking-wider">Entity</th>
              <th className="text-left px-5 py-3.5 font-medium text-[var(--muted-foreground)] text-xs uppercase tracking-wider">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {logs.map((log) => (
              <tr key={log.id}>
                <td className="px-5 py-4 text-xs text-[var(--muted-foreground)] whitespace-nowrap">
                  {new Date(log.createdAt).toLocaleString()}
                </td>
                <td className="px-5 py-4">
                  <ActionBadge action={log.action} />
                </td>
                <td className="px-5 py-4">
                  <span className="text-xs">{log.entityType}</span>
                  {log.entityId && (
                    <span className="text-[var(--muted-foreground)] ml-1.5 font-mono text-[10px]">
                      {log.entityId.slice(0, 8)}
                    </span>
                  )}
                </td>
                <td className="px-5 py-4 text-xs text-[var(--muted-foreground)] max-w-sm truncate font-mono">
                  {log.details ? summarize(log.details) : "—"}
                </td>
              </tr>
            ))}
            {logs.length === 0 && (
              <tr>
                <td colSpan={4} className="px-5 py-12 text-center text-[var(--muted-foreground)]">
                  <p className="text-sm">No audit logs yet</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
      </div>
      )}
    </div>
  );
}

function ActionBadge({ action }: { action: string }) {
  const isAdd = action.includes("add");
  const isRemove = action.includes("remove");
  const style = isAdd
    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
    : isRemove
    ? "bg-red-500/10 text-red-400 border-red-500/20"
    : "bg-blue-500/10 text-blue-400 border-blue-500/20";

  return (
    <span className={`inline-flex px-2 py-0.5 rounded border text-[10px] font-semibold ${style}`}>
      {action}
    </span>
  );
}

function summarize(json: string): string {
  try {
    const data = JSON.parse(json);
    if (data.rule) {
      const r = data.rule;
      return `${r.name || ""} :${r.sourcePort || r.source_port} → ${r.destinationIp || r.destination_ip}:${r.destinationPort || r.destination_port}`;
    }
    if (data.before && data.after) return `port ${data.before.sourcePort} → ${data.after.sourcePort}`;
    return JSON.stringify(data).slice(0, 60);
  } catch {
    return json.slice(0, 60);
  }
}
