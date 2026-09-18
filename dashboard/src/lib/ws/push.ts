import { WebSocket } from "ws";
import { registry } from "./registry";

interface RuleChangeEvent {
  version: number;
  action: "add" | "update" | "remove";
  rule: Record<string, unknown>;
}

export function pushRuleChange(groupId: string, event: RuleChangeEvent) {
  const connections = registry.getByGroupId(groupId);

  const message = JSON.stringify({
    type: "sync_event",
    group_id: groupId,
    version: event.version,
    action: event.action,
    rule: event.rule,
  });

  for (const conn of connections) {
    if (conn.ws.readyState === WebSocket.OPEN) {
      try {
        conn.ws.send(message, (error) => {
          if (error) {
            console.error(`Failed to push rule change to node ${conn.nodeId}:`, error);
            registry.unregister(conn.nodeId, conn.ws);
            conn.ws.terminate();
          }
        });
      } catch (error) {
        console.error(`Failed to push rule change to node ${conn.nodeId}:`, error);
        registry.unregister(conn.nodeId, conn.ws);
        conn.ws.terminate();
      }
    }
  }
}
