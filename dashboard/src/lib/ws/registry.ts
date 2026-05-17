import { WebSocket } from "ws";

interface NodeConnection {
  ws: WebSocket;
  nodeId: string;
  groupId: string | null;
}

declare global {
  var __relayRegistry: ConnectionRegistry | undefined;
}

class ConnectionRegistry {
  private byNodeId = new Map<string, NodeConnection>();
  private byGroupId = new Map<string, Set<string>>();

  register(nodeId: string, groupId: string | null, ws: WebSocket) {
    this.unregister(nodeId);

    this.byNodeId.set(nodeId, { ws, nodeId, groupId });

    if (groupId) {
      if (!this.byGroupId.has(groupId)) {
        this.byGroupId.set(groupId, new Set());
      }
      this.byGroupId.get(groupId)!.add(nodeId);
    }
  }

  unregister(nodeId: string) {
    const conn = this.byNodeId.get(nodeId);
    if (!conn) return;

    if (conn.groupId) {
      const group = this.byGroupId.get(conn.groupId);
      if (group) {
        group.delete(nodeId);
        if (group.size === 0) this.byGroupId.delete(conn.groupId);
      }
    }

    this.byNodeId.delete(nodeId);
  }

  getByNodeId(nodeId: string): NodeConnection | undefined {
    return this.byNodeId.get(nodeId);
  }

  getByGroupId(groupId: string): NodeConnection[] {
    const nodeIds = this.byGroupId.get(groupId);
    if (!nodeIds) return [];
    return Array.from(nodeIds)
      .map((id) => this.byNodeId.get(id))
      .filter((c): c is NodeConnection => c !== undefined);
  }

  getOnlineCount(): number {
    return this.byNodeId.size;
  }

  getAllConnections(): NodeConnection[] {
    return Array.from(this.byNodeId.values());
  }
}

export const registry = (globalThis.__relayRegistry ??= new ConnectionRegistry());
