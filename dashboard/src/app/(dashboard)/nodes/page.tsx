"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface Node {
  id: string;
  name: string;
  ip: string | null;
  groupId: string | null;
  status: string;
  lastHeartbeat: number | null;
  configVersion: number;
}

interface CreateNodeResponse {
  node: { id: string; name: string; groupId: string | null };
  bootstrapToken: string;
  bootstrapCommand: string;
}

export default function NodesPage() {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [groups, setGroups] = useState<{ id: string; name: string }[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [bootstrap, setBootstrap] = useState<CreateNodeResponse | null>(null);
  const [newName, setNewName] = useState("");
  const [newGroup, setNewGroup] = useState("");
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchNodes();
    fetchGroups();
  }, []);

  async function fetchNodes() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/nodes");
      if (res.ok) setNodes(await res.json());
      else setError("Failed to load nodes");
    } catch {
      setError("Failed to load nodes");
    } finally {
      setLoading(false);
    }
  }

  async function fetchGroups() {
    try {
      const res = await fetch("/api/groups");
      if (res.ok) {
        const data = await res.json();
        setGroups(data.map((g: { id: string; name: string }) => ({ id: g.id, name: g.name })));
      }
    } catch {}
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/nodes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName, groupId: newGroup || null }),
    });
    if (res.ok) {
      const data = await res.json();
      setBootstrap(data);
      setNewName("");
      setNewGroup("");
      setShowCreate(false);
      fetchNodes();
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this node?")) return;
    await fetch(`/api/nodes/${id}`, { method: "DELETE" });
    fetchNodes();
  }

  async function copyCommand() {
    if (!bootstrap) return;
    try {
      await navigator.clipboard.writeText(bootstrap.bootstrapCommand);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = bootstrap.bootstrapCommand;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  function timeAgo(ts: number | null) {
    if (!ts) return "Never";
    const diff = Date.now() - ts;
    if (diff < 60_000) return "Just now";
    if (diff < 3600_000) return `${Math.floor(diff / 60_000)}m ago`;
    if (diff < 86400_000) return `${Math.floor(diff / 3600_000)}h ago`;
    return `${Math.floor(diff / 86400_000)}d ago`;
  }

  return (
    <div className="max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Nodes</h2>
        <button
          onClick={() => { setShowCreate(true); setBootstrap(null); }}
          className="px-4 py-2.5 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-[var(--primary-foreground)] rounded-lg text-sm font-medium"
        >
          + Add Node
        </button>
      </div>

      {/* Create modal */}
      {showCreate && (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5 mb-6 shadow-[var(--shadow)]">
          <h3 className="font-semibold mb-4">Create New Node</h3>
          <form onSubmit={handleCreate} className="flex flex-col md:flex-row gap-4 md:items-end">
            <div className="flex-1">
              <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1.5">Node Name</label>
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[var(--muted)] border border-[var(--border)] rounded-lg text-sm"
                placeholder="relay-sg-01"
                required
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1.5">Group</label>
              <select
                value={newGroup}
                onChange={(e) => setNewGroup(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[var(--muted)] border border-[var(--border)] rounded-lg text-sm"
              >
                <option value="">No group</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-3">
              <button type="submit" className="px-5 py-2.5 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-[var(--primary-foreground)] rounded-lg text-sm font-medium">
                Create
              </button>
              <button type="button" onClick={() => setShowCreate(false)} className="px-4 py-2.5 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Bootstrap command */}
      {bootstrap && (
        <div className="bg-[var(--primary)]/5 border border-[var(--primary)]/20 rounded-xl p-5 mb-6">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h3 className="font-semibold text-[var(--primary)]">Bootstrap Command Ready</h3>
              <p className="text-sm text-[var(--muted-foreground)] mt-1">
                Run this on the relay node. Token expires in 10 minutes.
              </p>
            </div>
            <button onClick={() => setBootstrap(null)} aria-label="Close" className="text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <code className="flex-1 px-4 py-3 bg-[var(--background)] border border-[var(--border)] rounded-lg text-sm font-mono text-[var(--foreground)] break-all overflow-x-auto">
              {bootstrap.bootstrapCommand}
            </code>
            <button
              onClick={copyCommand}
              className="px-4 py-3 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white rounded-lg text-sm font-medium shrink-0"
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
        </div>
      )}

      {/* Loading / Error */}
      {loading && (
        <div className="flex items-center justify-center h-64 text-[var(--muted-foreground)]">Loading...</div>
      )}
      {error && (
        <div className="flex flex-col items-center justify-center h-64 gap-3">
          <p className="text-sm text-[var(--destructive)]">{error}</p>
          <button onClick={fetchNodes} className="px-4 py-2 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white rounded-lg text-sm">Retry</button>
        </div>
      )}

      {/* Nodes table */}
      {!loading && !error && (
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-[var(--shadow)] overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] bg-[var(--muted)]">
              <th className="text-left px-5 py-3.5 font-medium text-[var(--muted-foreground)] text-xs uppercase tracking-wider">Node</th>
              <th className="text-left px-5 py-3.5 font-medium text-[var(--muted-foreground)] text-xs uppercase tracking-wider">IP</th>
              <th className="text-left px-5 py-3.5 font-medium text-[var(--muted-foreground)] text-xs uppercase tracking-wider">Group</th>
              <th className="text-left px-5 py-3.5 font-medium text-[var(--muted-foreground)] text-xs uppercase tracking-wider">Status</th>
              <th className="text-left px-5 py-3.5 font-medium text-[var(--muted-foreground)] text-xs uppercase tracking-wider">Last Seen</th>
              <th className="text-left px-5 py-3.5 font-medium text-[var(--muted-foreground)] text-xs uppercase tracking-wider">Version</th>
              <th className="text-right px-5 py-3.5 font-medium text-[var(--muted-foreground)] text-xs uppercase tracking-wider"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {nodes.map((node) => (
              <tr key={node.id}>
                <td className="px-5 py-4">
                  <Link href={`/nodes/${node.id}`} className="font-medium text-[var(--foreground)] hover:text-[var(--primary)]">
                    {node.name}
                  </Link>
                </td>
                <td className="px-5 py-4 font-mono text-[var(--muted-foreground)] text-xs">
                  {node.ip || "—"}
                </td>
                <td className="px-5 py-4">
                  {node.groupId ? (
                    <span className="px-2 py-1 bg-[var(--muted)] rounded text-xs">{groups.find(g => g.id === node.groupId)?.name || "—"}</span>
                  ) : (
                    <span className="text-[var(--muted-foreground)]">—</span>
                  )}
                </td>
                <td className="px-5 py-4">
                  <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${node.status === "online" ? "text-[var(--success)]" : "text-[var(--muted-foreground)]"}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${node.status === "online" ? "bg-[var(--success)]" : "bg-zinc-500"}`} />
                    {node.status}
                  </span>
                </td>
                <td className="px-5 py-4 text-xs text-[var(--muted-foreground)]">{timeAgo(node.lastHeartbeat)}</td>
                <td className="px-5 py-4 font-mono text-xs text-[var(--muted-foreground)]">v{node.configVersion}</td>
                <td className="px-5 py-4 text-right">
                  <button
                    onClick={() => handleDelete(node.id)}
                    aria-label="Delete"
                    className="text-[var(--muted-foreground)] hover:text-[var(--destructive)] text-xs"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {nodes.length === 0 && (
              <tr>
                <td colSpan={7} className="px-5 py-12 text-center text-[var(--muted-foreground)]">
                  <div className="flex flex-col items-center gap-2">
                    <svg className="w-8 h-8 text-[var(--border)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2" />
                    </svg>
                    <p className="text-sm">No nodes yet</p>
                    <p className="text-xs">Click &quot;Add Node&quot; to get started</p>
                  </div>
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
