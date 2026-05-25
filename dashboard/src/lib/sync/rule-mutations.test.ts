import { describe, it, expect, vi, beforeEach } from "vitest";
import { createTestDb } from "@/test/db-helper";
import { groups } from "@/lib/db/schema";

vi.mock("@/lib/ws/push", () => ({
  pushRuleChange: vi.fn(),
}));

let testDb: ReturnType<typeof createTestDb>;

vi.mock("@/lib/db", () => ({
  get db() {
    return testDb;
  },
}));

const { addRule, updateRule, removeRule } = await import("@/lib/sync/rule-mutations");
const { pushRuleChange } = await import("@/lib/ws/push");

describe("rule-mutations", () => {
  const groupId = "test-group-1";

  beforeEach(() => {
    testDb = createTestDb();
    testDb
      .insert(groups)
      .values({
        id: groupId,
        name: "Test Group",
        configVersion: 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      })
      .run();
    vi.clearAllMocks();
  });

  const validInput = {
    name: "SSH Forward",
    sourcePort: 2222,
    destinationIp: "10.0.0.1",
    destinationPort: 22,
    protocol: "tcp" as const,
  };

  describe("addRule", () => {
    it("inserts a rule and creates a config event", async () => {
      const rule = await addRule(groupId, validInput);

      expect(rule.name).toBe("SSH Forward");
      expect(rule.sourcePort).toBe(2222);
      expect(rule.groupId).toBe(groupId);

      const group = await testDb.query.groups.findFirst();
      expect(group!.configVersion).toBe(1);
    });

    it("calls pushRuleChange with correct args", async () => {
      await addRule(groupId, validInput);

      expect(pushRuleChange).toHaveBeenCalledWith(
        groupId,
        expect.objectContaining({ version: 1, action: "add" })
      );
    });

    it("throws on port conflict", async () => {
      await addRule(groupId, validInput);

      await expect(addRule(groupId, validInput)).rejects.toThrow(
        "Port 2222 is already in use"
      );
    });

    it("throws for invalid port", async () => {
      await expect(
        addRule(groupId, { ...validInput, sourcePort: 0 })
      ).rejects.toThrow("Source port must be between 1 and 65535");
    });

    it("throws for invalid IP", async () => {
      await expect(
        addRule(groupId, { ...validInput, destinationIp: "not-an-ip" })
      ).rejects.toThrow("Invalid destination IP format");
    });

    it("throws for non-existent group", async () => {
      await expect(addRule("no-such-group", validInput)).rejects.toThrow(
        "Group not found"
      );
    });
  });

  describe("updateRule", () => {
    it("updates rule fields", async () => {
      const rule = await addRule(groupId, validInput);
      const updated = await updateRule(rule.id, { destinationPort: 8080 });

      expect(updated.destinationPort).toBe(8080);
      expect(updated.sourcePort).toBe(2222);
    });

    it("validates updated input", async () => {
      const rule = await addRule(groupId, validInput);

      await expect(
        updateRule(rule.id, { sourcePort: 99999 })
      ).rejects.toThrow("Source port must be between 1 and 65535");
    });

    it("throws for non-existent rule", async () => {
      await expect(updateRule("no-such-rule", { name: "x" })).rejects.toThrow(
        "Rule not found"
      );
    });

    it("increments config version", async () => {
      const rule = await addRule(groupId, validInput);
      await updateRule(rule.id, { name: "Updated" });

      const group = await testDb.query.groups.findFirst();
      expect(group!.configVersion).toBe(2);
    });
  });

  describe("removeRule", () => {
    it("deletes the rule", async () => {
      const rule = await addRule(groupId, validInput);
      await removeRule(rule.id);

      const remaining = await testDb.query.rules.findMany();
      expect(remaining).toHaveLength(0);
    });

    it("creates a remove config event", async () => {
      const rule = await addRule(groupId, validInput);
      await removeRule(rule.id);

      expect(pushRuleChange).toHaveBeenLastCalledWith(
        groupId,
        expect.objectContaining({ action: "remove" })
      );
    });

    it("throws for non-existent rule", async () => {
      await expect(removeRule("no-such-rule")).rejects.toThrow("Rule not found");
    });

    it("increments config version", async () => {
      const rule = await addRule(groupId, validInput);
      await removeRule(rule.id);

      const group = await testDb.query.groups.findFirst();
      expect(group!.configVersion).toBe(2);
    });
  });
});
