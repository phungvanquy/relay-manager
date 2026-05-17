import { db } from "@/lib/db";
import { nodes, groups, rules, auditLogs } from "@/lib/db/schema";
import { count, eq } from "drizzle-orm";
import Link from "next/link";

export default async function OverviewPage() {
  const [nodeCount] = await db.select({ count: count() }).from(nodes);
  const [onlineCount] = await db
    .select({ count: count() })
    .from(nodes)
    .where(eq(nodes.status, "online"));
  const [groupCount] = await db.select({ count: count() }).from(groups);
  const [ruleCount] = await db.select({ count: count() }).from(rules);

  const recentLogs = await db.query.auditLogs.findMany({
    orderBy: (l, { desc }) => [desc(l.createdAt)],
    limit: 10,
  });

  return (
    <div className="max-w-6xl">
      <h2 className="text-2xl font-bold mb-6">Overview</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Nodes" value={nodeCount.count} icon={
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2" />
          </svg>
        } />
        <StatCard label="Online" value={onlineCount.count} color="text-[var(--success)]" icon={
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5.636 18.364a9 9 0 010-12.728m12.728 0a9 9 0 010 12.728m-9.9-2.829a5 5 0 010-7.07m7.072 0a5 5 0 010 7.07M13 12a1 1 0 11-2 0 1 1 0 012 0z" />
          </svg>
        } />
        <StatCard label="Groups" value={groupCount.count} icon={
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        } />
        <StatCard label="Rules" value={ruleCount.count} icon={
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
        } />
      </div>

      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-[var(--shadow)]">
        <div className="px-5 py-4 border-b border-[var(--border)] flex items-center justify-between">
          <h3 className="font-semibold">Recent Activity</h3>
          <Link href="/audit" className="text-xs text-[var(--primary)] hover:underline">
            View all
          </Link>
        </div>
        <div className="divide-y divide-[var(--border)]">
          {recentLogs.length === 0 ? (
            <p className="px-5 py-8 text-sm text-[var(--muted-foreground)] text-center">No activity yet</p>
          ) : (
            recentLogs.map((log) => (
              <div key={log.id} className="px-5 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                <div className="flex items-center gap-3">
                  <ActionBadge action={log.action} />
                  <div>
                    <span className="text-sm font-medium">{formatAction(log.action)}</span>
                    <span className="text-sm text-[var(--muted-foreground)] ml-2">
                      {log.entityType}
                    </span>
                  </div>
                </div>
                <span className="text-xs text-[var(--muted-foreground)] sm:shrink-0 pl-10 sm:pl-0">
                  {new Date(log.createdAt).toLocaleString()}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, color, icon }: { label: string; value: number; color?: string; icon: React.ReactNode }) {
  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5 shadow-[var(--shadow-sm)]">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[var(--muted-foreground)]">{icon}</span>
      </div>
      <p className={`text-3xl font-bold ${color || "text-[var(--foreground)]"}`}>{value}</p>
      <p className="text-sm text-[var(--muted-foreground)] mt-1">{label}</p>
    </div>
  );
}

function ActionBadge({ action }: { action: string }) {
  const isAdd = action.includes("add");
  const isRemove = action.includes("remove");
  const color = isAdd ? "bg-[var(--success)]/10 text-[var(--success)]" : isRemove ? "bg-[var(--destructive)]/10 text-[var(--destructive)]" : "bg-[var(--primary)]/10 text-[var(--primary)]";
  return (
    <span className={`inline-flex items-center justify-center w-7 h-7 rounded-md text-xs font-medium ${color}`}>
      {isAdd ? "+" : isRemove ? "-" : "~"}
    </span>
  );
}

function formatAction(action: string): string {
  return action.replace(".", " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
