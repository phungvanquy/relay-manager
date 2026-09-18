import { describe, it, expect, vi, beforeEach } from "vitest";
import { WebSocket } from "ws";
import { registry } from "@/lib/ws/registry";
import { pushRuleChange } from "@/lib/ws/push";

function createMockWs(readyState: number = WebSocket.OPEN) {
  return {
    readyState,
    send: vi.fn(),
    on: vi.fn(),
    close: vi.fn(),
    terminate: vi.fn(),
  } as unknown as WebSocket;
}

describe("pushRuleChange", () => {
  beforeEach(() => {
    for (const conn of registry.getAllConnections()) {
      registry.unregister(conn.nodeId);
    }
  });

  it("sends message to nodes in the target group", () => {
    const ws = createMockWs();
    registry.register("node-1", "group-a", ws);

    pushRuleChange("group-a", {
      version: 1,
      action: "add",
      rule: { id: "r1", source_port: 80 },
    });

    expect(ws.send).toHaveBeenCalledTimes(1);
    const msg = JSON.parse((ws.send as ReturnType<typeof vi.fn>).mock.calls[0][0]);
    expect(msg.type).toBe("sync_event");
    expect(msg.version).toBe(1);
    expect(msg.action).toBe("add");
  });

  it("does not send to nodes in other groups", () => {
    const wsA = createMockWs();
    const wsB = createMockWs();
    registry.register("node-a", "group-a", wsA);
    registry.register("node-b", "group-b", wsB);

    pushRuleChange("group-a", {
      version: 2,
      action: "update",
      rule: { id: "r1" },
    });

    expect(wsA.send).toHaveBeenCalledTimes(1);
    expect(wsB.send).not.toHaveBeenCalled();
  });

  it("skips connections that are not OPEN", () => {
    const ws = createMockWs(WebSocket.CLOSING);
    registry.register("node-1", "group-a", ws);

    pushRuleChange("group-a", {
      version: 1,
      action: "remove",
      rule: { id: "r1" },
    });

    expect(ws.send).not.toHaveBeenCalled();
  });

  it("sends to multiple nodes in the same group", () => {
    const ws1 = createMockWs();
    const ws2 = createMockWs();
    registry.register("node-1", "group-a", ws1);
    registry.register("node-2", "group-a", ws2);

    pushRuleChange("group-a", {
      version: 3,
      action: "add",
      rule: { id: "r2" },
    });

    expect(ws1.send).toHaveBeenCalledTimes(1);
    expect(ws2.send).toHaveBeenCalledTimes(1);
  });

  it("handles empty group gracefully", () => {
    expect(() =>
      pushRuleChange("nonexistent-group", {
        version: 1,
        action: "add",
        rule: { id: "r1" },
      })
    ).not.toThrow();
  });

  it("contains a socket send failure after the database commit", () => {
    const ws = createMockWs();
    (ws.send as ReturnType<typeof vi.fn>).mockImplementation(() => {
      throw new Error("socket closed");
    });
    registry.register("node-1", "group-a", ws);

    expect(() =>
      pushRuleChange("group-a", {
        version: 1,
        action: "add",
        rule: { id: "r1" },
      })
    ).not.toThrow();
    expect(registry.getByNodeId("node-1")).toBeUndefined();
    expect(ws.terminate).toHaveBeenCalledOnce();
  });

  it("keeps the replacement connection when the old socket closes", () => {
    const oldSocket = createMockWs();
    const newSocket = createMockWs();
    registry.register("node-1", "group-a", oldSocket);
    registry.register("node-1", "group-b", newSocket);

    expect(oldSocket.close).toHaveBeenCalledWith(4002, "connection replaced");
    expect(registry.unregister("node-1", oldSocket)).toBe(false);
    expect(registry.getByNodeId("node-1")?.ws).toBe(newSocket);
    expect(registry.getByGroupId("group-a")).toHaveLength(0);
    expect(registry.getByGroupId("group-b")).toHaveLength(1);
  });
});
