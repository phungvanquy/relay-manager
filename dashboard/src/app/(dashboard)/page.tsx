import { db } from "@/lib/db";
import { nodes, groups, rules } from "@/lib/db/schema";
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
    limit: 8,
  });

  const offlineCount = nodeCount.count - onlineCount.count;
  const healthPct =
    nodeCount.count > 0 ? Math.round((onlineCount.count / nodeCount.count) * 100) : 0;

  return (
    <div className="max-w-6xl">
      <div className="mb-8">
        <h2 className="text-2xl font-bold">Overview</h2>
        <p className="text-sm text-[var(--muted-foreground)] mt-1">
          System health and recent activity
        </p>
      </div>

      {/* Health bar */}
      {nodeCount.count > 0 && (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 mb-6 shadow-[var(--shadow-sm)]">
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-2">
              <span
                className={`w-2 h-2 rounded-full ${onlineCount.count === nodeCount.count ? "bg-[var(--success)]" : offlineCount > 0 ? "bg-[var(--warning)]" : "bg-[var(--muted-foreground)]"}`}
              />
              <span className="text-sm font-medium">
                {onlineCount.count === nodeCount.count
                  ? "All nodes online"
                  : `${offlineCount} node${offlineCount !== 1 ? "s" : ""} offline`}
              </span>
            </div>
            <span className="text-xs text-[var(--muted-foreground)] font-mono">{healthPct}%</span>
          </div>
          <div className="h-1.5 bg-[var(--muted)] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${healthPct}%`,
                background:
                  healthPct === 100
                    ? "var(--success)"
                    : healthPct >= 50
                      ? "var(--warning)"
                      : "var(--destructive)",
              }}
            />
          </div>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Total Nodes"
          value={nodeCount.count}
          href="/nodes"
          accent="var(--primary)"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2"
              />
            </svg>
          }
        />
        <StatCard
          label="Online"
          value={onlineCount.count}
          href="/nodes"
          accent="var(--success)"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M5.636 18.364a9 9 0 010-12.728m12.728 0a9 9 0 010 12.728m-9.9-2.829a5 5 0 010-7.07m7.072 0a5 5 0 010 7.07M13 12a1 1 0 11-2 0 1 1 0 012 0z"
              />
            </svg>
          }
        />
        <StatCard
          label="Groups"
          value={groupCount.count}
          href="/groups"
          accent="var(--primary)"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
              />
            </svg>
          }
        />
        <StatCard
          label="Rules"
          value={ruleCount.count}
          href="/groups"
          accent="var(--warning)"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
              />
            </svg>
          }
        />
      </div>

      {/* Recent activity */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-[var(--shadow)] overflow-hidden">
        <div className="px-5 py-4 border-b border-[var(--border)] flex items-center justify-between">
          <h3 className="font-semibold text-sm">Recent Activity</h3>
          <Link
            href="/audit"
            className="text-xs text-[var(--muted-foreground)] hover:text-[var(--primary)] transition-colors"
          >
            View all
          </Link>
        </div>
        <div className="divide-y divide-[var(--border-subtle)]">
          {recentLogs.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <svg
                className="w-8 h-8 text-[var(--border)] mx-auto mb-3"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <p className="text-sm text-[var(--muted-foreground)]">No activity yet</p>
              <p className="text-xs text-[var(--muted-foreground)] mt-1">
                Actions will appear here as you manage rules and nodes
              </p>
            </div>
          ) : (
            recentLogs.map((log) => (
              <div
                key={log.id}
                className="px-5 py-3 flex items-center justify-between gap-4 hover:bg-[var(--muted)]/50 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <ActionBadge action={log.action} />
                  <div className="min-w-0">
                    <span className="text-sm font-medium">{formatAction(log.action)}</span>
                    <span className="text-xs text-[var(--muted-foreground)] ml-2">
                      {log.entityType}
                    </span>
                  </div>
                </div>
                <span className="text-xs text-[var(--muted-foreground)] shrink-0 tabular-nums">
                  {timeAgo(log.createdAt)}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  href,
  accent,
  icon,
}: {
  label: string;
  value: number;
  href: string;
  accent: string;
  icon: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5 shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow)] hover:border-[var(--border)]/80 transition-all group"
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-[var(--muted-foreground)] group-hover:text-[var(--foreground)] transition-colors">
          {icon}
        </span>
        <svg
          className="w-4 h-4 text-[var(--border)] group-hover:text-[var(--muted-foreground)] transition-colors"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
      <p className="text-3xl font-bold" style={{ color: accent }}>
        {value}
      </p>
      <p className="text-sm text-[var(--muted-foreground)] mt-1">{label}</p>
    </Link>
  );
}

function ActionBadge({ action }: { action: string }) {
  const isAdd = action.includes("add");
  const isRemove = action.includes("remove");
  const color = isAdd
    ? "bg-[var(--success)]/10 text-[var(--success)]"
    : isRemove
      ? "bg-[var(--destructive)]/10 text-[var(--destructive)]"
      : "bg-[var(--primary)]/10 text-[var(--primary)]";
  return (
    <span
      className={`inline-flex items-center justify-center w-7 h-7 rounded-md text-xs font-medium shrink-0 ${color}`}
    >
      {isAdd ? "+" : isRemove ? "-" : "~"}
    </span>
  );
}

function formatAction(action: string): string {
  return action.replace(".", " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60_000) return "just now";
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86400_000) return `${Math.floor(diff / 3600_000)}h ago`;
  if (diff < 604800_000) return `${Math.floor(diff / 86400_000)}d ago`;
  return new Date(ts).toLocaleDateString();
}
