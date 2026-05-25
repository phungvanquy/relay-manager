import { describe, it, expect, vi } from "vitest";

vi.stubEnv("ADMIN_PASSWORD", "test-password");
vi.stubEnv("JWT_SECRET", "test-jwt-secret-key");

const { verifyPassword, createSession, hashApiKey, generateApiKey, generateToken } = await import(
  "@/lib/auth"
);

describe("auth", () => {
  describe("verifyPassword", () => {
    it("returns true for correct password", () => {
      expect(verifyPassword("test-password")).toBe(true);
    });

    it("returns false for wrong password", () => {
      expect(verifyPassword("wrong")).toBe(false);
    });

    it("returns false for empty string", () => {
      expect(verifyPassword("")).toBe(false);
    });
  });

  describe("createSession / verify", () => {
    it("creates a valid JWT token", async () => {
      const token = await createSession();
      expect(token).toBeTruthy();
      expect(typeof token).toBe("string");
      expect(token.split(".")).toHaveLength(3);
    });
  });

  describe("hashApiKey", () => {
    it("produces consistent hash for same input", () => {
      const hash1 = hashApiKey("test-key");
      const hash2 = hashApiKey("test-key");
      expect(hash1).toBe(hash2);
    });

    it("produces different hash for different input", () => {
      const hash1 = hashApiKey("key-a");
      const hash2 = hashApiKey("key-b");
      expect(hash1).not.toBe(hash2);
    });

    it("returns a 64-char hex string", () => {
      const hash = hashApiKey("test");
      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });
  });

  describe("generateApiKey", () => {
    it("returns a 64-char hex string", () => {
      const key = generateApiKey();
      expect(key).toMatch(/^[a-f0-9]{64}$/);
    });

    it("generates unique keys", () => {
      const key1 = generateApiKey();
      const key2 = generateApiKey();
      expect(key1).not.toBe(key2);
    });
  });

  describe("generateToken", () => {
    it("returns a non-empty string", () => {
      const token = generateToken();
      expect(token).toBeTruthy();
      expect(token.length).toBeGreaterThan(10);
    });
  });
});
