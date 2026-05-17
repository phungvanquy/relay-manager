"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface Group {
  id: string;
  name: string;
  configVersion: number;
  ruleCount: number;
  nodeCount: number;
}

export default function GroupsPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");

  useEffect(() => {
    fetchGroups();
  }, []);

  async function fetchGroups() {
    setLoading(true);
    setFetchError("");
    try {
      const res = await fetch("/api/groups");
      if (res.ok) setGroups(await res.json());
      else setFetchError("Failed to load groups");
    } catch {
      setFetchError("Failed to load groups");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/groups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName }),
    });
    if (res.ok) {
      setNewName("");
      setShowCreate(false);
      fetchGroups();
    } else {
      const data = await res.json();
      setError(data.error);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this group? All rules will be removed.")) return;
    await fetch(`/api/groups/${id}`, { method: "DELETE" });
    fetchGroups();
  }

  return (
    <div className="max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Groups</h2>
        <button
          onClick={() => setShowCreate(true)}
          className="px-4 py-2.5 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-[var(--primary-foreground)] rounded-lg text-sm font-medium"
        >
          + Add Group
        </button>
      </div>

      {showCreate && (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5 mb-6 shadow-[var(--shadow)]">
          <h3 className="font-semibold mb-4">Create New Group</h3>
          <form onSubmit={handleCreate} className="flex flex-col sm:flex-row gap-4 sm:items-end">
            <div className="flex-1 max-w-sm">
              <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1.5">Group Name</label>
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[var(--muted)] border border-[var(--border)] rounded-lg text-sm"
                placeholder="production-sg"
                required
              />
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
          {error && <p className="text-sm text-[var(--destructive)] mt-3">{error}</p>}
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center h-64 text-[var(--muted-foreground)]">Loading...</div>
      )}
      {fetchError && (
        <div className="flex flex-col items-center justify-center h-64 gap-3">
          <p className="text-sm text-[var(--destructive)]">{fetchError}</p>
          <button onClick={fetchGroups} className="px-4 py-2 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white rounded-lg text-sm">Retry</button>
        </div>
      )}

      {!loading && !fetchError && groups.length === 0 ? (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-12 text-center shadow-[var(--shadow)]">
          <svg className="w-10 h-10 text-[var(--border)] mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          <p className="text-sm text-[var(--muted-foreground)]">No groups yet</p>
          <p className="text-xs text-[var(--muted-foreground)] mt-1">Create a group to organize your relay rules</p>
        </div>
      ) : !loading && !fetchError ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {groups.map((group) => (
            <Link
              key={group.id}
              href={`/groups/${group.id}`}
              className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5 shadow-[var(--shadow-sm)] hover:border-[var(--primary)]/30 hover:shadow-[var(--shadow)] transition-all group"
            >
              <div className="flex items-start justify-between">
                <h3 className="font-semibold group-hover:text-[var(--primary)] transition-colors">{group.name}</h3>
                <button
                  onClick={(e) => { e.preventDefault(); handleDelete(group.id); }}
                  aria-label="Delete group"
                  className="text-[var(--muted-foreground)] hover:text-[var(--destructive)] opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
              <div className="flex items-center gap-4 mt-4 text-xs text-[var(--muted-foreground)]">
                <span className="flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                  </svg>
                  {group.ruleCount} rules
                </span>
                <span className="flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2" />
                  </svg>
                  {group.nodeCount} nodes
                </span>
                <span className="font-mono">v{group.configVersion}</span>
              </div>
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}
