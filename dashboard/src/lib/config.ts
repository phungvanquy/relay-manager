const INSECURE_PASSWORDS = new Set([
  "admin",
  "changeme",
  "change-me-to-a-strong-password",
  "replace-with-a-strong-password",
]);
const INSECURE_JWT_SECRETS = new Set([
  "relay-manager-secret-change-me",
  "your-random-secret-here-at-least-32-chars",
  "change-me-to-a-random-string",
  "replace-with-at-least-32-random-characters",
]);

export function assertRuntimeConfig(
  env: Readonly<Record<string, string | undefined>> = process.env
): void {
  const errors: string[] = [];
  const password = env.ADMIN_PASSWORD ?? "";
  const jwtSecret = env.JWT_SECRET ?? "";
  const dashboardUrl = env.DASHBOARD_URL ?? "";

  if (password.length < 12 || INSECURE_PASSWORDS.has(password.toLowerCase())) {
    errors.push("ADMIN_PASSWORD must be at least 12 characters and must not use a placeholder");
  }
  if (jwtSecret.length < 32 || INSECURE_JWT_SECRETS.has(jwtSecret)) {
    errors.push("JWT_SECRET must be at least 32 characters and must not use a placeholder");
  }

  try {
    const url = new URL(dashboardUrl);
    const allowInsecure = env.ALLOW_INSECURE_HTTP === "true";
    if (url.protocol !== "https:" && !allowInsecure) {
      errors.push("DASHBOARD_URL must use HTTPS (or explicitly set ALLOW_INSECURE_HTTP=true)");
    }
  } catch {
    errors.push("DASHBOARD_URL must be an absolute URL");
  }

  const port = Number(env.PORT ?? "3000");
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    errors.push("PORT must be an integer between 1 and 65535");
  }

  if (errors.length > 0) {
    throw new Error(`Invalid runtime configuration:\n- ${errors.join("\n- ")}`);
  }
}

export function usesSecureCookies(
  env: Readonly<Record<string, string | undefined>> = process.env
): boolean {
  try {
    return new URL(env.DASHBOARD_URL ?? "").protocol === "https:";
  } catch {
    return env.NODE_ENV === "production" && env.ALLOW_INSECURE_HTTP !== "true";
  }
}
