"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

interface NodeDetail {
  id: string;
  name: string;
  ip: string | null;
  groupId: string | null;
  status: string;
  lastHeartbeat: number | null;
  configVersion: number;
  createdAt: number;
}

export default function NodeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [node, setNode] = useState<NodeDetail | null>(null);
  const [groups, setGroups] = useState<{ id: string; name: string }[]>([]);
  const [bootstrapCmd, setBootstrapCmd] = useState("");
  const [copied, setCopied] = useState(false);

  const fetchNode = useCallback(async () => {
    const res = await fetch(`/api/nodes/${id}`);
    if (res.ok) setNode(await res.json());
  }, [id]);

  useEffect(() => {
    fetchNode();
    fetch("/api/groups").then(r => r.json()).then(data =>
      setGroups(data.map((g: { id: string; name: string }) => ({ id: g.id, name: g.name })))
    );
  }, [fetchNode]);

  async function handleGroupChange(groupId: string) {
    await fetch(`/api/nodes/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ groupId: groupId || null }),
    });
    fetchNode();
  }

  async function handleRegenToken() {
    const res = await fetch(`/api/nodes/${id}/bootstrap`, { method: "POST" });
    if (res.ok) {
      const data = await res.json();
      setBootstrapCmd(data.bootstrapCommand);
    }
  }

  function copyCmd() {
    navigator.clipboard.writeText(bootstrapCmd);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (!node) return <div className="flex items-center justify-center h-64 text-[var(--muted-foreground)]">Loading...</div>;

  return (
    <div className="max-w-4xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-[var(--muted-foreground)] mb-2">
        <Link href="/nodes" className="hover:text-[var(--foreground)]">Nodes</Link>
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
        <span className="text-[var(--foreground)]">{node.name}</span>
      </div>

      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <h2 className="text-2xl font-bold">{node.name}</h2>
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
          node.status === "online"
            ? "bg-[var(--success)]/10 text-[var(--success)] border border-[var(--success)]/20"
            : "bg-zinc-500/10 text-zinc-400 border border-zinc-500/20"
        }`}>
          <span className={`w-1.5 h-1.5 rounded-full ${node.status === "online" ? "bg-[var(--success)]" : "bg-zinc-500"}`} />
          {node.status}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Info card */}
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5 shadow-[var(--shadow-sm)]">
          <h3 className="text-sm font-semibold text-[var(--muted-foreground)] uppercase tracking-wider mb-4">Details</h3>
          <dl className="space-y-3">
            <div className="flex justify-between">
              <dt className="text-sm text-[var(--muted-foreground)]">ID</dt>
              <dd className="text-sm font-mono">{node.id.slice(0, 12)}...</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-[var(--muted-foreground)]">IP Address</dt>
              <dd className="text-sm font-mono">{node.ip || "Not connected"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-[var(--muted-foreground)]">Config Version</dt>
              <dd className="text-sm font-mono">v{node.configVersion}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-[var(--muted-foreground)]">Last Heartbeat</dt>
              <dd className="text-sm">{node.lastHeartbeat ? new Date(node.lastHeartbeat).toLocaleString() : "Never"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-[var(--muted-foreground)]">Created</dt>
              <dd className="text-sm">{new Date(node.createdAt).toLocaleString()}</dd>
            </div>
          </dl>
        </div>

        {/* Config card */}
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5 shadow-[var(--shadow-sm)]">
          <h3 className="text-sm font-semibold text-[var(--muted-foreground)] uppercase tracking-wider mb-4">Configuration</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1.5">Group</label>
              <select
                value={node.groupId || ""}
                onChange={(e) => handleGroupChange(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[var(--muted)] border border-[var(--border)] rounded-lg text-sm"
              >
                <option value="">No group</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            </div>
            <div>
              <button
                onClick={handleRegenToken}
                className="w-full px-4 py-2.5 border border-[var(--border)] rounded-lg text-sm hover:bg-[var(--muted)] transition-colors"
              >
                Regenerate Bootstrap Token
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Bootstrap command */}
      {bootstrapCmd && (
        <div className="mt-6 bg-[var(--primary)]/5 border border-[var(--primary)]/20 rounded-xl p-5">
          <p className="text-xs text-[var(--muted-foreground)] mb-2">Bootstrap command (expires in 10 min):</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 px-4 py-3 bg-[var(--background)] border border-[var(--border)] rounded-lg text-xs font-mono break-all">
              {bootstrapCmd}
            </code>
            <button onClick={copyCmd} className="px-4 py-3 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white rounded-lg text-sm font-medium shrink-0">
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
