import { WebSocket } from "ws";
import { registry } from "./registry";

interface RuleChangeEvent {
  version: number;
  action: "add" | "update" | "remove";
  rule: Record<string, unknown>;
}

export function pushRuleChange(groupId: string, event: RuleChangeEvent) {
  const connections = registry.getByGroupId(groupId);
  console.log(
    `[push] group=${groupId} action=${event.action} v=${event.version} connections=${connections.length} totalOnline=${registry.getOnlineCount()}`
  );

  const message = JSON.stringify({
    type: "sync_event",
    group_id: groupId,
    version: event.version,
    action: event.action,
    rule: event.rule,
  });

  let sent = 0;
  for (const conn of connections) {
    if (conn.ws.readyState === WebSocket.OPEN) {
      conn.ws.send(message);
      sent++;
    }
  }

  if (sent > 0) {
    console.log(`[push] sent sync_event to ${sent} agent(s)`);
  } else if (connections.length === 0) {
    console.log(`[push] no agents connected for group ${groupId}`);
  }
}
