import { describe, expect, it } from "vitest";
import { assertRuntimeConfig, usesSecureCookies } from "@/lib/config";

const validEnv = {
  ADMIN_PASSWORD: "a-strong-admin-password",
  JWT_SECRET: "a-random-secret-with-at-least-32-characters",
  DASHBOARD_URL: "https://relay.example.com",
  PORT: "3000",
};

describe("assertRuntimeConfig", () => {
  it("accepts secure production configuration", () => {
    expect(() => assertRuntimeConfig(validEnv)).not.toThrow();
  });

  it("rejects missing and placeholder secrets", () => {
    expect(() =>
      assertRuntimeConfig({
        ...validEnv,
        ADMIN_PASSWORD: "admin",
        JWT_SECRET: "relay-manager-secret-change-me",
      })
    ).toThrow(/ADMIN_PASSWORD[\s\S]*JWT_SECRET/);
  });

  it("requires HTTPS unless insecure HTTP is explicitly allowed", () => {
    expect(() =>
      assertRuntimeConfig({ ...validEnv, DASHBOARD_URL: "http://relay.example.com" })
    ).toThrow("DASHBOARD_URL must use HTTPS");
    expect(() =>
      assertRuntimeConfig({
        ...validEnv,
        DASHBOARD_URL: "http://127.0.0.1:3000",
        ALLOW_INSECURE_HTTP: "true",
      })
    ).not.toThrow();
  });

  it("matches cookie security to the public dashboard URL", () => {
    expect(usesSecureCookies(validEnv)).toBe(true);
    expect(
      usesSecureCookies({
        ...validEnv,
        DASHBOARD_URL: "http://127.0.0.1:3000",
        ALLOW_INSECURE_HTTP: "true",
      })
    ).toBe(false);
  });
});
