"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

interface Rule {
  id: string;
  name: string;
  sourcePort: number;
  destinationIp: string;
  destinationPort: number;
  protocol: string;
  note: string | null;
}

interface GroupDetail {
  id: string;
  name: string;
  configVersion: number;
  rules: Rule[];
  nodes: { id: string; name: string; status: string; configVersion: number }[];
}

export default function GroupDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [group, setGroup] = useState<GroupDetail | null>(null);
  const [showAddRule, setShowAddRule] = useState(false);
  const [editingRule, setEditingRule] = useState<Rule | null>(null);
  const [error, setError] = useState("");

  const fetchGroup = useCallback(async () => {
    const res = await fetch(`/api/groups/${id}`);
    if (res.ok) setGroup(await res.json());
  }, [id]);

  useEffect(() => { fetchGroup(); }, [fetchGroup]);

  async function handleDeleteRule(ruleId: string) {
    if (!confirm("Delete this rule? It will be removed from all nodes in this group.")) return;
    await fetch(`/api/groups/${id}/rules/${ruleId}`, { method: "DELETE" });
    fetchGroup();
  }

  if (!group) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-[var(--muted-foreground)]">Loading...</div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl">
      {/* Header */}
      <div className="flex items-center gap-2 text-sm text-[var(--muted-foreground)] mb-2">
        <Link href="/groups" className="hover:text-[var(--foreground)]">Groups</Link>
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
        <span className="text-[var(--foreground)]">{group.name}</span>
      </div>
      <div className="flex items-center gap-3 mb-8">
        <h2 className="text-2xl font-bold">{group.name}</h2>
        <span className="px-2 py-0.5 bg-[var(--muted)] rounded text-xs font-mono text-[var(--muted-foreground)]">v{group.configVersion}</span>
      </div>

      {/* Nodes */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5 mb-6 shadow-[var(--shadow-sm)]">
        <h3 className="text-sm font-semibold text-[var(--muted-foreground)] uppercase tracking-wider mb-3">Connected Nodes ({group.nodes.length})</h3>
        {group.nodes.length === 0 ? (
          <p className="text-sm text-[var(--muted-foreground)]">No nodes assigned to this group</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {group.nodes.map((node) => (
              <Link
                key={node.id}
                href={`/nodes/${node.id}`}
                className="inline-flex items-center gap-2 px-3 py-1.5 bg-[var(--muted)] border border-[var(--border)] rounded-lg text-sm hover:border-[var(--primary)]/30 transition-colors"
              >
                <span className={`w-1.5 h-1.5 rounded-full ${node.status === "online" ? "bg-[var(--success)]" : "bg-zinc-500"}`} />
                <span>{node.name}</span>
                {node.configVersion < group.configVersion && (
                  <span className="px-1.5 py-0.5 bg-[var(--warning)]/10 text-[var(--warning)] rounded text-[10px] font-medium">SYNC</span>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Rules */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">Forwarding Rules ({group.rules.length})</h3>
        <button
          onClick={() => { setShowAddRule(true); setEditingRule(null); setError(""); }}
          className="px-4 py-2 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-[var(--primary-foreground)] rounded-lg text-sm font-medium"
        >
          + Add Rule
        </button>
      </div>

      {(showAddRule || editingRule) && (
        <RuleForm
          groupId={id}
          rule={editingRule}
          onDone={() => { setShowAddRule(false); setEditingRule(null); setError(""); fetchGroup(); }}
          onCancel={() => { setShowAddRule(false); setEditingRule(null); setError(""); }}
          onError={setError}
        />
      )}
      {error && (
        <div className="mb-4 px-4 py-3 bg-[var(--destructive)]/10 border border-[var(--destructive)]/20 rounded-lg">
          <p className="text-sm text-[var(--destructive)]">{error}</p>
        </div>
      )}

      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-[var(--shadow)] overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] bg-[var(--muted)]">
              <th className="text-left px-5 py-3.5 font-medium text-[var(--muted-foreground)] text-xs uppercase tracking-wider">Name</th>
              <th className="text-left px-5 py-3.5 font-medium text-[var(--muted-foreground)] text-xs uppercase tracking-wider">Source</th>
              <th className="text-left px-5 py-3.5 font-medium text-[var(--muted-foreground)] text-xs uppercase tracking-wider">Destination</th>
              <th className="text-left px-5 py-3.5 font-medium text-[var(--muted-foreground)] text-xs uppercase tracking-wider">Protocol</th>
              <th className="text-left px-5 py-3.5 font-medium text-[var(--muted-foreground)] text-xs uppercase tracking-wider">Note</th>
              <th className="text-right px-5 py-3.5 font-medium text-[var(--muted-foreground)] text-xs uppercase tracking-wider"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {group.rules.map((rule) => (
              <tr key={rule.id}>
                <td className="px-5 py-4 font-medium">{rule.name}</td>
                <td className="px-5 py-4 font-mono text-xs">:{rule.sourcePort}</td>
                <td className="px-5 py-4 font-mono text-xs">{rule.destinationIp}:{rule.destinationPort}</td>
                <td className="px-5 py-4"><ProtocolBadge protocol={rule.protocol} /></td>
                <td className="px-5 py-4 text-[var(--muted-foreground)] text-xs max-w-[200px] truncate">{rule.note || "—"}</td>
                <td className="px-5 py-4 text-right">
                  <div className="flex items-center justify-end gap-3">
                    <button onClick={() => { setEditingRule(rule); setShowAddRule(false); setError(""); }} className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] text-xs">
                      Edit
                    </button>
                    <button onClick={() => handleDeleteRule(rule.id)} className="text-[var(--muted-foreground)] hover:text-[var(--destructive)] text-xs">
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {group.rules.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-12 text-center text-[var(--muted-foreground)]">
                  <p className="text-sm">No rules yet</p>
                  <p className="text-xs mt-1">Add a forwarding rule to get started</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ProtocolBadge({ protocol }: { protocol: string }) {
  const styles: Record<string, string> = {
    both: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    tcp: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    udp: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  };
  return (
    <span className={`inline-flex px-2 py-0.5 rounded border text-[10px] font-semibold uppercase tracking-wider ${styles[protocol] || ""}`}>
      {protocol}
    </span>
  );
}

function RuleForm({ groupId, rule, onDone, onCancel, onError }: {
  groupId: string; rule: Rule | null; onDone: () => void; onCancel: () => void; onError: (msg: string) => void;
}) {
  const [name, setName] = useState(rule?.name || "");
  const [sourcePort, setSourcePort] = useState(rule?.sourcePort?.toString() || "");
  const [destIp, setDestIp] = useState(rule?.destinationIp || "");
  const [destPort, setDestPort] = useState(rule?.destinationPort?.toString() || "");
  const [protocol, setProtocol] = useState(rule?.protocol || "both");
  const [note, setNote] = useState(rule?.note || "");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onError("");
    const body = { name, sourcePort: parseInt(sourcePort), destinationIp: destIp, destinationPort: parseInt(destPort), protocol, note: note || null };
    const url = rule ? `/api/groups/${groupId}/rules/${rule.id}` : `/api/groups/${groupId}/rules`;
    const res = await fetch(url, { method: rule ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (res.ok) { onDone(); } else { const data = await res.json(); onError(data.error || "Failed to save"); }
  }

  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5 mb-4 shadow-[var(--shadow)]">
      <h4 className="font-semibold mb-4">{rule ? "Edit Rule" : "Add Rule"}</h4>
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1.5">Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className="w-full px-3 py-2.5 bg-[var(--muted)] border border-[var(--border)] rounded-lg text-sm" placeholder="wg-tunnel-01" required />
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1.5">Source Port</label>
            <input type="number" value={sourcePort} onChange={(e) => setSourcePort(e.target.value)} className="w-full px-3 py-2.5 bg-[var(--muted)] border border-[var(--border)] rounded-lg text-sm" min="1" max="65535" required />
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1.5">Protocol</label>
            <select value={protocol} onChange={(e) => setProtocol(e.target.value)} className="w-full px-3 py-2.5 bg-[var(--muted)] border border-[var(--border)] rounded-lg text-sm">
              <option value="both">TCP + UDP</option>
              <option value="tcp">TCP only</option>
              <option value="udp">UDP only</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1.5">Destination IP</label>
            <input value={destIp} onChange={(e) => setDestIp(e.target.value)} className="w-full px-3 py-2.5 bg-[var(--muted)] border border-[var(--border)] rounded-lg text-sm" placeholder="1.2.3.4" required />
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1.5">Destination Port</label>
            <input type="number" value={destPort} onChange={(e) => setDestPort(e.target.value)} className="w-full px-3 py-2.5 bg-[var(--muted)] border border-[var(--border)] rounded-lg text-sm" min="1" max="65535" required />
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1.5">Note (optional)</label>
            <input value={note} onChange={(e) => setNote(e.target.value)} className="w-full px-3 py-2.5 bg-[var(--muted)] border border-[var(--border)] rounded-lg text-sm" placeholder="Description" />
          </div>
        </div>
        <div className="flex gap-3">
          <button type="submit" className="px-5 py-2.5 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-[var(--primary-foreground)] rounded-lg text-sm font-medium">
            {rule ? "Update Rule" : "Create Rule"}
          </button>
          <button type="button" onClick={onCancel} className="px-4 py-2.5 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
