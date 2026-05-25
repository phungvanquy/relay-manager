## 1. Refactor registry to globalThis singleton

- [x] 1.1 Add a `declare global` block in `dashboard/src/lib/ws/registry.ts` declaring `var __relayRegistry: ConnectionRegistry | undefined` on `globalThis`.
- [x] 1.2 Replace the module-level `export const registry = new ConnectionRegistry()` with a `globalThis.__relayRegistry ??= new ConnectionRegistry()` pattern, exporting the result.
- [x] 1.3 Verify TypeScript compiles without errors (`npm run build` or `npx tsc --noEmit` in dashboard).

## 2. Verify push delivery works end-to-end

- [x] 2.1 Add a temporary `console.log` in `pushRuleChange` showing the number of connections found for the group, then test by adding a rule while an agent is connected. Confirm the log shows >0 connections.
- [x] 2.2 Remove the temporary log after confirming the fix works.

## 3. Validate catch-up sync still works

- [x] 3.1 Disconnect an agent, add a rule via the dashboard, reconnect the agent, and verify it receives the catch-up event and applies the rule.
